// L'unico che scrive gli abbonamenti pagati.
//
// Stripe chiama qui a ogni nascita, rinnovo, disdetta o pagamento fallito.
// Il portale non scrive mai `partner_subscriptions` con provenienza 'stripe':
// se potesse, un ristoratore si regalerebbe l'abbonamento da PostgREST col
// proprio token.
//
// ⚠️ VA PUBBLICATA SENZA CONTROLLO DEL TOKEN (`--no-verify-jwt`): chi chiama è
// Stripe, non un utente connesso. Al posto del token c'è la FIRMA di Stripe,
// verificata qui sotto: senza quella non si scrive niente.
//
// Variabili d'ambiente: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
// ⚠️ `npm:` e non esm.sh: la build di esm.sh tira dentro i polyfill Node di
// deno.land/std, che qui esplodono a runtime («Deno.core.runMicrotasks() is
// not supported»). La funzione rispondeva, ma ogni consegna di Stripe
// falliva — e falliva in silenzio, perché Stripe si limita a ritentare.
import Stripe from "npm:stripe@17.7.0";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  httpClient: Stripe.createFetchHttpClient(),
});
// In Deno la firma si verifica con la variante asincrona: quella sincrona
// usa crypto di Node e qui non esiste.
const cryptoProvider = Stripe.createSubtleCryptoProvider();

const admin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

// Il vocabolario di Stripe è più fine del nostro: qui si traduce una volta
// sola. 'trialing' vale come attivo (non lo usiamo oggi, ma un giorno sì);
// 'past_due' e 'unpaid' restano validi finché Stripe ritenta, perché
// spegnere l'aspetto del menù davanti ai clienti per una carta scaduta è un
// danno peggiore di qualche giorno non incassato (MONETIZATION.md).
function mapStatus(stripeStatus: string): "active" | "past_due" | "canceled" | null {
  switch (stripeStatus) {
    case "active":
    case "trialing":
      return "active";
    case "past_due":
    case "unpaid":
      return "past_due";
    case "canceled":
    case "incomplete_expired":
      return "canceled";
    // 'incomplete': pagamento mai andato a buon fine, non è mai esistito
    // un abbonamento. Nessuna riga.
    default:
      return null;
  }
}

function planFromInterval(interval?: string): "monthly" | "yearly" | null {
  if (interval === "month") return "monthly";
  if (interval === "year") return "yearly";
  return null;
}

async function upsertSubscription(eventSub: Stripe.Subscription) {
  // ⚠️ NON si scrive quello che l'evento contiene: Stripe non garantisce
  // l'ordine di consegna, e un evento vecchio arrivato tardi riscriverebbe
  // uno stato più recente ("attivo" dopo una disdetta). Si richiede a Stripe
  // com'è ADESSO quell'abbonamento, e si scrive quello. Se la chiamata non
  // riesce si usa l'evento, che è comunque meglio di niente.
  let sub = eventSub;
  try {
    sub = await stripe.subscriptions.retrieve(eventSub.id);
  } catch (e) {
    console.error("[stripe-webhook] rilettura fallita, uso l'evento:", eventSub.id, e);
  }

  const venueId = sub.metadata?.venue_id;
  if (!venueId) {
    // Senza il locale non si sa cosa accendere: meglio fermarsi e lasciarne
    // traccia che scrivere una riga orfana.
    console.error("[stripe-webhook] abbonamento senza venue_id nei metadata:", sub.id);
    return;
  }

  // Il proprietario NON si prende dai metadata ma dal locale: è lì che vive,
  // e la coppia (locale, proprietario) è una chiave del database. Un dato
  // copiato in due posti prima o poi diverge.
  const { data: venue, error: venueError } = await admin
    .from("partner_venues")
    .select("owner_user_id")
    .eq("id", venueId)
    .maybeSingle();
  if (venueError) {
    console.error("[stripe-webhook] lettura del locale fallita:", venueError);
    throw venueError;
  }
  if (!venue) {
    console.error("[stripe-webhook] locale inesistente:", venueId, sub.id);
    return;
  }
  const ownerUserId = venue.owner_user_id;

  const status = mapStatus(sub.status);
  if (!status) return;

  const item = sub.items.data[0];
  // La fine del periodo pagato ha cambiato posto: dalle versioni recenti
  // dell'API sta sulla RIGA dell'abbonamento, prima stava sull'abbonamento.
  // Si guardano tutt'e due, o la scadenza resta vuota a seconda della
  // versione con cui Stripe manda l'evento.
  const periodEnd = item?.current_period_end ??
    (sub as unknown as { current_period_end?: number }).current_period_end ?? null;

  const row = {
    venue_id: venueId,
    owner_user_id: ownerUserId,
    source: "stripe",
    plan: planFromInterval(item?.price?.recurring?.interval),
    status,
    ends_at: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
    cancel_at_period_end: sub.cancel_at_period_end ?? false,
    canceled_at: sub.canceled_at ? new Date(sub.canceled_at * 1000).toISOString() : null,
    stripe_customer_id: typeof sub.customer === "string" ? sub.customer : sub.customer?.id,
    stripe_subscription_id: sub.id,
  };

  // Su stripe_subscription_id (UNIQUE): Stripe ripete gli eventi, e un
  // rinnovo è lo stesso abbonamento con una data nuova.
  const { error } = await admin
    .from("partner_subscriptions")
    .upsert(row, { onConflict: "stripe_subscription_id" });
  if (error) {
    console.error("[stripe-webhook] scrittura fallita:", error, sub.id);
    // 500: Stripe riprova da solo nelle ore successive.
    throw error;
  }

  // ⚠️ IL REGALO SI CHIUDE DOPO, NON PRIMA (migration 720). Chiudendolo
  // prima, fra le due scritture il locale risultava scoperto per un istante,
  // e il trigger della 718 toglieva l'aspetto dalla sala: il menù diventava
  // sobrio proprio nel momento in cui il ristoratore cominciava a pagare.
  // In quest'ordine non c'è mai un istante senza copertura.
  if (status !== "canceled") {
    const { error: closeError } = await admin
      .from("partner_subscriptions")
      .update({ status: "canceled", canceled_at: new Date().toISOString() })
      .eq("venue_id", venueId)
      .eq("source", "manual")
      .in("status", ["active", "past_due"]);
    if (closeError) {
      console.error("[stripe-webhook] chiusura del regalo fallita:", closeError);
    }
  }
}

Deno.serve(async (req) => {
  const signature = req.headers.get("Stripe-Signature");
  if (!signature) return new Response("Missing signature", { status: 400 });

  // Il corpo va letto GREZZO: la firma copre i byte esatti, e un JSON
  // rigenerato non corrisponde più.
  const payload = await req.text();

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      payload,
      signature,
      Deno.env.get("STRIPE_WEBHOOK_SECRET")!,
      undefined,
      cryptoProvider,
    );
  } catch (e) {
    console.error("[stripe-webhook] firma non valida:", e);
    return new Response("Invalid signature", { status: 400 });
  }

  try {
    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
        await upsertSubscription(event.data.object as Stripe.Subscription);
        break;
      default:
        // Gli altri eventi non ci riguardano: si risponde 200 o Stripe
        // continuerebbe a ritentare per giorni.
        break;
    }
    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[stripe-webhook] errore:", e);
    return new Response("Error", { status: 500 });
  }
});
