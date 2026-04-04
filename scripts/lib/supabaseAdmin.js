/**
 * Client Supabase con service_role_key per script CLI.
 * Legge le credenziali da admin/.env.local.
 */
const path = require('path');
const fs = require('fs');
const { createClient } = require(path.join(__dirname, '..', '..', 'admin', 'node_modules', '@supabase', 'supabase-js'));

const envPath = path.join(__dirname, '..', '..', 'admin', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
const env = {};
for (const line of envContent.split('\n')) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const eqIdx = trimmed.indexOf('=');
  if (eqIdx > 0) env[trimmed.slice(0, eqIdx)] = trimmed.slice(eqIdx + 1);
}

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Mancano NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY in admin/.env.local');
  process.exit(1);
}

module.exports = createClient(supabaseUrl, serviceRoleKey);
