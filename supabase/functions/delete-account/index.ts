import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    const { error: authError } = await adminClient.auth.admin.deleteUser(targetUserId);
    if (authError) {
      console.error("[delete-account] auth delete failed:", authError);
      return json(500, { error: `Failed to delete auth user: ${authError.message}` });
    }

    return json(200, { success: true });
  } catch (err) {
    console.error("[delete-account] unhandled error:", err);
    const message = err instanceof Error ? err.message : String(err);
    return json(500, { error: `Internal error: ${message}` });
  }
});
