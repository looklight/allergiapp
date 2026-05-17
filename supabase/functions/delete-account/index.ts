import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  // Preflight CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // 1. Verifica che il chiamante sia autenticato
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Client con anon key per verificare l'identita del chiamante
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user: caller }, error: userError } = await userClient.auth.getUser();
    if (userError || !caller) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3. Client con service_role per eliminare l'utente
    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // 3b. Se target_user_id presente, verifica che il chiamante sia admin
    let body: { target_user_id?: string } = {};
    try { body = await req.json(); } catch { /* no body = self-delete */ }

    let targetUserId = caller.id;
    if (body.target_user_id && body.target_user_id !== caller.id) {
      const { data: callerProfile } = await adminClient
        .from("profiles")
        .select("role")
        .eq("id", caller.id)
        .single();
      if (callerProfile?.role !== "admin") {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      targetUserId = body.target_user_id;
    }

    const user = { id: targetUserId };

    // NOTA: i file dello Storage (reviews/menus) NON vengono eliminati.
    // Restano accessibili tramite gli URL persistiti su `reviews.photos` e
    // `menu_photos.image_url`, che sopravvivono alla cancellazione dell'account
    // (FK `ON DELETE SET NULL`). L'UI mostra questi contenuti come
    // "Utente inattivo". I T&C dichiarano esplicitamente questo comportamento
    // (legalContent.ts → sezione "Conservazione").

    // Elimina il profilo (cascade elimina favorites; SET NULL su reviews, reports)
    const { error: profileError } = await adminClient
      .from("profiles")
      .delete()
      .eq("id", user.id);
    if (profileError) {
      return new Response(JSON.stringify({ error: "Failed to delete profile" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 6. Elimina l'utente da auth.users
    const { error: authError } = await adminClient.auth.admin.deleteUser(user.id);
    if (authError) {
      return new Response(JSON.stringify({ error: "Failed to delete auth user" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
