// Il pannello del cliente di Stripe: carta, disdetta, fatture.
//
// Lo apre Stripe, non noi: rifare quelle schermate vorrebbe dire rifare anche
// la gestione delle carte, ed è esattamente il lavoro che non vogliamo.
//
// Chi sia il cliente non lo dice il portale ma il database: si prende dal suo
// abbonamento più recente. Se il portale potesse passare un cliente a piacere,
// chiunque aprirebbe le fatture di chiunque.
//
// ⚠️ Il pannello va configurato una volta nelle impostazioni di Stripe
// (Billing → Customer portal), o questa chiamata risponde che manca.
//
// Variabili d'ambiente: STRIPE_SECRET_KEY, PARTNER_PORTAL_URL.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
// `npm:` e non esm.sh, v. la nota in stripe-webhook.
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

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  httpClient: Stripe.createFetchHttpClient(),
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json(401, { error: "Missing authorization" });

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: { user: caller }, error: userError } = await userClient.auth.getUser();
    if (userError || !caller) return json(401, { error: "Invalid token" });

    // Le RLS limitano già alle proprie righe: il cliente esce dai suoi
    // abbonamenti, non da quello che chiede il browser.
    const { data: sub } = await userClient
      .from("partner_subscriptions")
      .select("stripe_customer_id")
      .eq("source", "stripe")
      .not("stripe_customer_id", "is", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!sub?.stripe_customer_id) return json(404, { error: "No customer" });

    const portalUrl = Deno.env.get("PARTNER_PORTAL_URL") ?? "https://partner.allergiapp.com";
    const session = await stripe.billingPortal.sessions.create({
      customer: sub.stripe_customer_id,
      return_url: `${portalUrl}/abbonamenti`,
    });

    return json(200, { url: session.url });
  } catch (e) {
    console.error("[stripe-portal] errore:", e);
    return json(500, { error: e instanceof Error ? e.message : "Unknown error" });
  }
});
