import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

// Purge ricorsivo di un prefix dello storage, con paginazione.
// Supabase storage mostra "cartelle" come entry con id=null; i file hanno id.
async function purgePrefix(bucket: ReturnType<SupabaseClient["storage"]["from"]>, prefix: string) {
  const pageSize = 100;
  while (true) {
    const { data, error } = await bucket.list(prefix, { limit: pageSize });
    if (error) {
      console.warn(`[delete-account] list error on ${prefix}:`, error.message);
      return;
    }
    if (!data || data.length === 0) return;

    const files: string[] = [];
    const folders: string[] = [];
    for (const entry of data) {
      if (entry.id) files.push(`${prefix}/${entry.name}`);
      else folders.push(`${prefix}/${entry.name}`);
    }

    for (const sub of folders) await purgePrefix(bucket, sub);

    if (files.length > 0) {
      const { error: rmErr } = await bucket.remove(files);
      if (rmErr) console.warn(`[delete-account] remove error on ${prefix}:`, rmErr.message);
    }

    // Se la pagina non è piena e non abbiamo cancellato nulla in questo giro,
    // non c'è più altro da fare.
    if (data.length < pageSize && files.length === 0) return;
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

    // 1. Storage cleanup (best-effort, paginato). Struttura: {userId}/{type}/{restaurantId}/{file}.webp
    const bucket = adminClient.storage.from("images");
    const topFolders = ["reviews", "menus"];
    for (const folder of topFolders) {
      await purgePrefix(bucket, `${targetUserId}/${folder}`);
    }

    // 2. Delete auth user → cascades: profiles → favorites, review_likes, cuisine_votes;
    //    SET NULL su reviews.user_id e reports.user_id.
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
