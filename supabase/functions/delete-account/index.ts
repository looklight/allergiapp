import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
// ⚠️ `npm:` e non esm.sh (v. stripe-webhook): la build di esm.sh muore a
// runtime sui polyfill Node.
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

// ------------------------------------------------------------------
// IL RISTORATORE (migration 727, 19/09)
//
// La credenziale è una sola per app e portale partner (MONETIZATION.md,
// «Utenti e partner»). Eliminarla porta via anche il mondo partner: locali,
// menù al tavolo, associazioni, azienda, abbonamenti, registro — a catena,
// dal database. Qui si fanno le due cose che il database non vede:
//   1. Stripe: si elimina il cliente, che chiude subito ogni abbonamento
//      (senza rimborso) e toglie le carte. Fatture e pagamenti restano a
//      Stripe per gli obblighi fiscali.
//   2. Le foto: la cartella dell'account nel bucket `partner`.
// Poi l'account, e il database fa il resto.
//
// Chi ha un profilo partner NON si elimina dall'app: chi toglie le sue
// recensioni non deve perdere senza saperlo i menù dei suoi locali. Lo fa
// l'admin, su richiesta a info@allergiapp.com.
//
// Se un passo fallisce ci si ferma prima di eliminare l'account, e si può
// rilanciare da capo: ogni passo regge la seconda volta (un cliente Stripe
// già eliminato si salta, una cartella vuota non ha niente da togliere).
// ------------------------------------------------------------------

const PARTNER_BUCKET = "partner";

async function deleteStripeCustomers(admin: SupabaseClient, userId: string): Promise<number> {
  const { data, error } = await admin
    .from("partner_subscriptions")
    .select("stripe_customer_id")
    .eq("owner_user_id", userId)
    .not("stripe_customer_id", "is", null);
  if (error) throw new Error(`Lettura abbonamenti fallita: ${error.message}`);

  const customers = [...new Set((data ?? []).map((r) => r.stripe_customer_id as string))];
  if (customers.length === 0) return 0;

  // Creato solo qui: gli utenti dell'app non dipendono dalla chiave di Stripe
  const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
    httpClient: Stripe.createFetchHttpClient(),
  });

  let deleted = 0;
  for (const id of customers) {
    try {
      await stripe.customers.del(id);
      deleted++;
    } catch (e) {
      // Già eliminato (un secondo tentativo, o a mano dalla dashboard)
      if ((e as { code?: string }).code === "resource_missing") continue;
      throw new Error(`Stripe, cliente ${id}: ${(e as Error).message}`);
    }
  }
  return deleted;
}

// Tutti i file sotto `<userId>/` (logos/, covers/, dishes/). Lo Storage
// elenca una cartella alla volta: le voci senza id sono sottocartelle.
async function listFiles(admin: SupabaseClient, prefix: string, depth = 0): Promise<string[]> {
  const paths: string[] = [];
  const PAGE = 1000;
  for (let offset = 0; ; offset += PAGE) {
    const { data, error } = await admin.storage
      .from(PARTNER_BUCKET)
      .list(prefix, { limit: PAGE, offset });
    if (error) throw new Error(`Elenco foto fallito (${prefix}): ${error.message}`);
    for (const item of data ?? []) {
      const path = `${prefix}/${item.name}`;
      if (item.id) paths.push(path);
      else if (depth < 3) paths.push(...(await listFiles(admin, path, depth + 1)));
    }
    if (!data || data.length < PAGE) break;
  }
  return paths;
}

async function deletePartnerPhotos(admin: SupabaseClient, userId: string): Promise<void> {
  const paths = await listFiles(admin, userId);
  for (let i = 0; i < paths.length; i += 1000) {
    const { error } = await admin.storage.from(PARTNER_BUCKET).remove(paths.slice(i, i + 1000));
    if (error) throw new Error(`Eliminazione foto fallita: ${error.message}`);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json(401, { error: "Missing authorization" });

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user: caller }, error: userError } = await userClient.auth.getUser();
    if (userError || !caller) return json(401, { error: "Invalid token" });

    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    let body: { target_user_id?: string } = {};
    try { body = await req.json(); } catch { /* no body = self-delete */ }

    let targetUserId = caller.id;
    let byAdmin = false;
    if (body.target_user_id && body.target_user_id !== caller.id) {
      const { data: callerProfile, error: profErr } = await adminClient
        .from("profiles")
        .select("role")
        .eq("id", caller.id)
        .maybeSingle();
      if (profErr) {
        console.error("[delete-account] caller profile lookup failed:", profErr);
        return json(500, { error: `Profile lookup failed: ${profErr.message}` });
      }
      if (callerProfile?.role !== "admin") return json(403, { error: "Forbidden" });
      targetUserId = body.target_user_id;
      byAdmin = true;
    }

    const { data: partner, error: partnerErr } = await adminClient
      .from("partner_accounts")
      .select("user_id")
      .eq("user_id", targetUserId)
      .maybeSingle();
    if (partnerErr) {
      console.error("[delete-account] partner lookup failed:", partnerErr);
      return json(500, { error: `Partner lookup failed: ${partnerErr.message}` });
    }

    // Dall'app (o chiunque elimini sé stesso) un ristoratore non si elimina
    if (partner && !byAdmin) return json(409, { error: "partner_account" });

    let stripeCustomersDeleted = 0;
    if (partner) {
      stripeCustomersDeleted = await deleteStripeCustomers(adminClient, targetUserId);
      await deletePartnerPhotos(adminClient, targetUserId);
    }

    // NOTA: i file dello Storage (reviews/menus) NON vengono eliminati.
    // Restano accessibili tramite gli URL persistiti su `reviews.photos` e
    // `menu_photos.image_url`, che sopravvivono alla cancellazione dell'account
    // (FK `ON DELETE SET NULL`). L'UI mostra questi contenuti come
    // "Utente inattivo". I T&C dichiarano esplicitamente questo comportamento
    // (legalContent.ts → sezione "Conservazione").

    // Delete auth user → cascade su profiles (FK ON DELETE CASCADE) →
    // cascade su favorites, review_likes, cuisine_votes; SET NULL su
    // reviews.user_id, menu_photos.user_id, reports.user_id, restaurants.added_by/owner_id.
    // E su partner_accounts → tutto il mondo partner (727).
    const { error: authError } = await adminClient.auth.admin.deleteUser(targetUserId);
    if (authError) {
      console.error("[delete-account] auth delete failed:", authError);
      return json(500, { error: `Failed to delete auth user: ${authError.message}` });
    }

    // La prova dell'eliminazione, senza dati della persona. Se non si scrive
    // l'account è comunque eliminato: si segnala e basta.
    const { error: logError } = await adminClient.from("account_deletions").insert({
      requested_via: byAdmin ? "admin" : "app",
      deleted_by: byAdmin ? caller.id : null,
      had_partner_profile: !!partner,
      stripe_customers_deleted: stripeCustomersDeleted,
    });
    if (logError) console.error("[delete-account] account_deletions insert failed:", logError);

    return json(200, { success: true });
  } catch (err) {
    console.error("[delete-account] unhandled error:", err);
    const message = err instanceof Error ? err.message : String(err);
    return json(500, { error: `Internal error: ${message}` });
  }
});
