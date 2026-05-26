// Tiny Supabase REST client - no npm dependencies.
// Calls the SECURITY DEFINER RPC functions exposed to anon role.
// Env vars required (set in Vercel project): SUPABASE_URL, SUPABASE_ANON_KEY.

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

async function callRpc(name, params) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_ANON_KEY env vars');
  }

  const url = `${SUPABASE_URL}/rest/v1/rpc/${name}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Supabase RPC ${name} failed: ${response.status} ${text}`);
  }

  return response.json();
}

async function fetchPublicRestaurant(slug) {
  return callRpc('get_restaurant_public_by_slug', { p_slug: slug });
}

module.exports = { fetchPublicRestaurant };
