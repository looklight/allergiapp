/**
 * Script per impostare il ruolo admin su un profilo Supabase.
 *
 * Prerequisiti:
 * - .env.local con NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY
 * - L'utente deve essere gia registrato nell'app
 *
 * Uso:
 *   cd admin
 *   npm run set-admin -- <user-id>
 *
 * Per trovare lo user ID: vai su Supabase Dashboard > Authentication > Users
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Mancano le variabili ambiente. Verifica .env.local:');
  console.error('  NEXT_PUBLIC_SUPABASE_URL');
  console.error('  SUPABASE_SERVICE_ROLE_KEY');
  console.error('');
  console.error('La service role key si trova in: Supabase Dashboard > Settings > API');
  process.exit(1);
}

// Service role bypassa le RLS policies — necessario per operazioni admin
const supabase = createClient(supabaseUrl, serviceRoleKey);

async function setAdmin(userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .update({ role: 'admin' })
    .eq('id', userId)
    .select('id, display_name, role')
    .single();

  if (error) {
    console.error(`Errore: ${error.message}`);
    process.exit(1);
  }

  console.log(`Ruolo "admin" assegnato a "${data.display_name ?? 'Anonimo'}" (id: ${data.id})`);
}

const userId = process.argv[2];
if (!userId) {
  console.error('Uso: npx tsx scripts/set-admin.ts <user-id>');
  process.exit(1);
}

setAdmin(userId).then(() => process.exit(0));
