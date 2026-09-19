// L'AZIENDA SCRITTA A MANO DAL PORTALE, quando associando un locale non ce
// n'è già una: abbonamento offerto da noi (niente Stripe dietro), o Stripe
// che la P.IVA non l'ha chiesta. Di solito invece arriva da sola al pagamento
// (stripe-webhook), e il portale la propone già compilata.
//
// E la MODIFICA dall'Account (19/09): con `company_id` nel corpo si corregge
// un'azienda che c'è già, invece di crearne una.
//
// Il controllo e il salvataggio stanno in _shared/company.ts, gli stessi del
// webhook. Qui c'è solo chi chiama: un partner connesso, per la sua azienda.
//
// Risponde { company_id, vat_status } oppure { error } con una chiave che il
// portale traduce (v. _shared/company.ts, più not_partner).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { aggiornaAzienda, salvaAzienda } from "../_shared/company.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json(401, { error: "Missing authorization" });

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller }, error: userError } = await userClient.auth.getUser();
    if (userError || !caller) return json(401, { error: "Invalid token" });

    // Il service role serve a scrivere l'azienda, che il ristoratore non può.
    const admin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: account } = await admin
      .from("partner_accounts")
      .select("user_id")
      .eq("user_id", caller.id)
      .maybeSingle();
    if (!account) return json(403, { error: "not_partner" });

    const body = await req.json().catch(() => ({})) as {
      company_id?: string;
      country_code?: string;
      legal_name?: string;
      vat_number?: string;
    };

    const esito = body.company_id
      ? await aggiornaAzienda(
        admin,
        caller.id,
        body.company_id,
        body.country_code ?? "",
        body.legal_name ?? "",
        body.vat_number ?? "",
      )
      : await salvaAzienda(
        admin,
        caller.id,
        body.country_code ?? "",
        body.legal_name ?? "",
        body.vat_number ?? "",
      );
    if ("error" in esito) {
      return json(esito.error === "save_failed" ? 500 : 400, esito);
    }
    return json(200, esito);
  } catch (e) {
    console.error("[partner-company] errore:", e);
    return json(500, { error: e instanceof Error ? e.message : "Unknown error" });
  }
});
