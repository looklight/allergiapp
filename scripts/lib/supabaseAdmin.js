/**
 * Client Supabase con service_role_key per script CLI.
 * Legge le credenziali da admin/.env.local e da .env alla radice del progetto:
 * admin/.env.local è rigenerato da `vercel env pull` e contiene solo le chiavi
 * pubbliche, la service_role_key sta nel .env locale.
 */
const path = require('path');
const fs = require('fs');
const { createClient } = require(path.join(__dirname, '..', '..', 'admin', 'node_modules', '@supabase', 'supabase-js'));

const ENV_FILES = [
  path.join(__dirname, '..', '..', 'admin', '.env.local'),
  path.join(__dirname, '..', '..', '.env'),
];

const env = {};
for (const envPath of ENV_FILES) {
  if (!fs.existsSync(envPath)) continue;
  for (const line of fs.readFileSync(envPath, 'utf-8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx > 0 && !env[trimmed.slice(0, eqIdx)]) {
      // `vercel env pull` scrive i valori tra virgolette
      env[trimmed.slice(0, eqIdx)] = trimmed.slice(eqIdx + 1).replace(/^["']|["']$/g, '');
    }
  }
}

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Mancano NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY in admin/.env.local o .env');
  process.exit(1);
}

module.exports = createClient(supabaseUrl, serviceRoleKey);
