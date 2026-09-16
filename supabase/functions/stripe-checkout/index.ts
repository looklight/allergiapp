// Apre il pagamento dell'abbonamento per UN locale del richiedente.
//
// Sta qui e non nel portale per un motivo solo: la chiave segreta di Stripe
// vive in un posto solo, accanto al database, e non nelle variabili di
// Vercel. Il portale chiama questa funzione e riceve un indirizzo a cui
// mandare il ristoratore.
//
// Cosa NON fa: non scrive `partner_subscriptions`. Quella riga la scrive solo
// il webhook, quando Stripe conferma. Se la scrivesse anche questa, un
// pagamento abbandonato lascerebbe un abbonamento attivo mai pagato.
//
// Variabili d'ambiente: STRIPE_SECRET_KEY, PARTNER_PORTAL_URL.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
// ⚠️ `npm:` e non esm.sh, v. la nota in stripe-webhook: la build di esm.sh
// muore a runtime sui polyfill Node.
import Stripe from "npm:stripe@17.7.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

// I prezzi si cercano per ETICHETTA, mai per id: in Stripe un prezzo non si
// modifica, si sostituisce, e in modalità reale gli id saranno altri. Cambiare
// listino = creare il prezzo nuovo e spostargli l'etichetta, senza toccare il
// codice.
const LOOKUP_KEYS: Record<string, string> = {
  monthly: "allergiapp_monthly",
  yearly: "allergiapp_yearly",
};

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  httpClient: Stripe.createFetchHttpClient(),
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json(401, { error: "Missing authorization" });

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Client con il token di chi chiama: la RLS fa da guardia, quindi un
    // locale di un altro non si trova e non si paga per sbaglio.
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user: caller }, error: userError } = await userClient.auth.getUser();
    if (userError || !caller) return json(401, { error: "Invalid token" });

    const body = await req.json().catch(() => ({})) as {
      venue_id?: string;
      plan?: string;
    };
    const venueId = body.venue_id;
    const plan = body.plan ?? "monthly";
    if (!venueId) return json(400, { error: "Missing venue_id" });
    if (!LOOKUP_KEYS[plan]) return json(400, { error: "Unknown plan" });

    const { data: venue, error: venueError } = await userClient
      .from("partner_venues")
      .select("id, name, owner_user_id")
      .eq("id", venueId)
      .maybeSingle();
    if (venueError) {
      console.error("[stripe-checkout] venue lookup failed:", venueError);
      return json(500, { error: venueError.message });
    }
    if (!venue) return json(404, { error: "Venue not found" });

    // Un abbonamento aperto per locale: è anche un vincolo del database
    // (indice parziale della 716), ma qui si può dire con una frase invece
    // che con un errore di chiave duplicata dopo aver pagato.
    const { data: existing } = await userClient
      .from("partner_subscriptions")
      .select("id")
      .eq("venue_id", venueId)
      .in("status", ["active", "past_due"])
      .maybeSingle();
    if (existing) return json(409, { error: "Already subscribed" });

    const price = (await stripe.prices.list({
      lookup_keys: [LOOKUP_KEYS[plan]],
      active: true,
      limit: 1,
    })).data[0];
    if (!price) {
      console.error("[stripe-checkout] prezzo non trovato:", LOOKUP_KEYS[plan]);
      return json(500, { error: "Price not configured" });
    }

    // Il Customer si riusa se questo partner ne ha già uno: lo sa la riga di
    // un abbonamento precedente, anche chiuso. Così chi rinnova dopo una
    // disdetta non diventa un secondo cliente con la stessa email.
    const { data: previous } = await userClient
      .from("partner_subscriptions")
      .select("stripe_customer_id")
      .eq("owner_user_id", caller.id)
      .not("stripe_customer_id", "is", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const portalUrl = Deno.env.get("PARTNER_PORTAL_URL") ?? "https://partner.allergiapp.com";

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: price.id, quantity: 1 }],
      ...(previous?.stripe_customer_id
        ? {
          customer: previous.stripe_customer_id,
          customer_update: { name: "auto", address: "auto" },
        }
        : { customer_email: caller.email }),
      // L'anagrafica aziendale la raccoglie Stripe al pagamento e non un
      // nostro modulo prima: serve alla fattura, ed è l'unico punto in cui
      // il ristoratore si aspetta di doverla dare (MONETIZATION.md).
      billing_address_collection: "required",
      // ⚠️ `required` e non solo `enabled`: offerta come campo facoltativo,
      // la P.IVA si salta — ed è successo alla prima prova vera. L'abbonamento
      // è riservato alle aziende (MONETIZATION.md: niente acquisto da privati,
      // o scattano recesso di 14 giorni e IVA OSS), e quel numero serve alla
      // fattura. Dove Stripe non conosce un identificativo fiscale per il
      // paese, il campo resta saltabile: è il meglio che si può chiedere senza
      // bloccare fuori chi ha una partita IVA che noi non sappiamo validare.
      tax_id_collection: { enabled: true, required: "if_supported" },
      allow_promotion_codes: true,
      client_reference_id: venueId,
      // Il locale viaggia SULL'ABBONAMENTO e non solo sulla sessione: il
      // webhook riceve eventi di rinnovo che della sessione non sanno nulla.
      subscription_data: {
        metadata: { venue_id: venueId, owner_user_id: caller.id },
      },
      metadata: { venue_id: venueId, owner_user_id: caller.id },
      success_url: `${portalUrl}/abbonamenti?pagamento=fatto`,
      cancel_url: `${portalUrl}/abbonamenti?pagamento=annullato`,
    });

    return json(200, { url: session.url });
  } catch (e) {
    console.error("[stripe-checkout] errore:", e);
    return json(500, { error: e instanceof Error ? e.message : "Unknown error" });
  }
});
