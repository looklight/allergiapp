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

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3. Client con service_role per eliminare l'utente
    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // 4. Elimina tutti i file dell'utente dallo Storage (best-effort, prima del cascade)
    //    Struttura: {userId}/{type}/{restaurantId}/{file}.jpg — serve ricorsione a 2 livelli
    const bucket = adminClient.storage.from("images");
    const topFolders = ["reviews", "dishes", "menus"];
    for (const folder of topFolders) {
      const prefix = `${user.id}/${folder}`;
      const { data: subFolders } = await bucket.list(prefix, { limit: 500 });
      if (!subFolders) continue;
      for (const sub of subFolders) {
        if (sub.id) {
          // È un file direttamente in questa cartella
          await bucket.remove([`${prefix}/${sub.name}`]);
        } else {
          // È una sottocartella (restaurantId) — lista i file al suo interno
          const subPath = `${prefix}/${sub.name}`;
          const { data: files } = await bucket.list(subPath, { limit: 500 });
          if (files && files.length > 0) {
            const paths = files.map((f) => `${subPath}/${f.name}`);
            await bucket.remove(paths);
          }
        }
      }
    }

    // 5. Elimina il profilo (cascade elimina favorites; SET NULL su reviews, reports)
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
