/**
 * Gate versione app (tabella `app_config`, mig 083): legge e imposta le soglie
 * senza digitare numeri a mano.
 *
 * Uso:
 *   node scripts/release-gate.js status
 *   node scripts/release-gate.js recommend --live     # avviso morbido -> versione di app.config.ts
 *   node scripts/release-gate.js block <versione>     # MURO (raro: sicurezza, dati a rischio, API spenta)
 *   node scripts/release-gate.js reset                # rimette tutto a riposo (0.0.0)
 *
 * `recommend` prende la versione da app.config.ts: non si sbaglia il numero e
 * non serve ricordarselo. Richiede `--live` come conferma esplicita che la
 * release e' GIA' SCARICABILE dallo store: tra build e disponibilita' passa la
 * review, e suggerire un aggiornamento che non esiste ancora manda l'utente su
 * una pagina store dove non trova nulla.
 *
 * `block` NON e' automatizzato di proposito: il muro non deve mai seguire le
 * release ordinarie, o ogni aggiornamento normale murerebbe fuori chi non
 * aggiorna subito. La versione va scritta a mano, una volta per emergenza.
 *
 * Requisiti: .env con SUPABASE_SERVICE_ROLE_KEY, .env.local con
 * EXPO_PUBLIC_SUPABASE_URL (via `npm run env:sync`).
 */

const path = require('path');
const fs = require('fs');

const ROOT = path.join(__dirname, '..');

// Env dal root: .env (service key) + .env.local (URL pubblico). Stesso
// caricamento di scripts/uploadToSupabase.js.
const env = {};
for (const fileName of ['.env', '.env.local']) {
  const envPath = path.join(ROOT, fileName);
  if (!fs.existsSync(envPath)) continue;
  for (const line of fs.readFileSync(envPath, 'utf-8').split('\n')) {
    const match = line.match(/^([A-Z_]+)=(.+)$/);
    if (match && !env[match[1]]) env[match[1]] = match[2].trim();
  }
}

const SUPABASE_URL = env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Manca EXPO_PUBLIC_SUPABASE_URL (.env.local) o SUPABASE_SERVICE_ROLE_KEY (.env)');
  process.exit(1);
}

const REST = `${SUPABASE_URL}/rest/v1/app_config`;
const HEADERS = {
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
};

const VERSION_RE = /^\d+(\.\d+){0,2}$/;

/** Versione dichiarata in app.config.ts: unica fonte, cosi' il numero non si
 *  digita mai due volte. */
function appVersion() {
  const source = fs.readFileSync(path.join(ROOT, 'app.config.ts'), 'utf-8');
  const match = source.match(/^\s*version:\s*["']([^"']+)["']/m);
  if (!match) {
    console.error('Versione non trovata in app.config.ts');
    process.exit(1);
  }
  return match[1];
}

async function readConfig() {
  const res = await fetch(`${REST}?select=*`, { headers: HEADERS });
  if (!res.ok) {
    console.error(`Lettura fallita: HTTP ${res.status} ${await res.text()}`);
    process.exit(1);
  }
  const rows = await res.json();
  if (!rows.length) {
    console.error('Tabella app_config vuota: la migration 083 inserisce la riga, verificare.');
    process.exit(1);
  }
  return rows[0];
}

async function writeConfig(patch) {
  const res = await fetch(`${REST}?id=eq.true`, {
    method: 'PATCH',
    headers: { ...HEADERS, Prefer: 'return=representation' },
    body: JSON.stringify({ ...patch, updated_at: new Date().toISOString() }),
  });
  if (!res.ok) {
    console.error(`Scrittura fallita: HTTP ${res.status} ${await res.text()}`);
    process.exit(1);
  }
  const rows = await res.json();
  if (!rows.length) {
    console.error('Nessuna riga aggiornata: controllare la riga id=true in app_config.');
    process.exit(1);
  }
  return rows[0];
}

function print(row) {
  const wall = row.min_supported_version;
  const soft = row.recommended_version;
  console.log('');
  console.log(`  versione in app.config.ts : ${appVersion()}`);
  console.log(`  muro (min_supported)      : ${wall}${wall === '0.0.0' ? '   [spento]' : '   [ATTIVO]'}`);
  console.log(`  avviso (recommended)      : ${soft}${soft === '0.0.0' ? '   [spento]' : '   [ATTIVO]'}`);
  console.log(`  esenzione OS              : iOS ${row.min_os_ios ?? '-'} / Android API ${row.min_os_android ?? '-'}`);
  console.log(`  ultimo aggiornamento      : ${row.updated_at}`);
  console.log('');
}

async function main() {
  const [command, arg] = process.argv.slice(2);

  if (command === 'status') {
    print(await readConfig());
    return;
  }

  if (command === 'recommend') {
    // `--test <versione>`: solo per le prove su dev build, dove serve una soglia
    // piu' alta della versione in sviluppo per far comparire l'avviso. Il
    // percorso normale resta senza argomenti, con il numero preso da
    // app.config.ts e nessuna cifra digitata a mano.
    const testIndex = process.argv.indexOf('--test');
    if (testIndex !== -1) {
      const testVersion = process.argv[testIndex + 1];
      if (!testVersion || !VERSION_RE.test(testVersion)) {
        console.error('Uso: node scripts/release-gate.js recommend --test <versione>');
        process.exit(1);
      }
      console.log(`PROVA — avviso morbido -> ${testVersion} (ricordarsi il reset)`);
      print(await writeConfig({ recommended_version: testVersion }));
      return;
    }

    const version = appVersion();
    if (!process.argv.includes('--live')) {
      console.error('');
      console.error(`  Sto per suggerire l'aggiornamento alla ${version}.`);
      console.error('  Confermare che la release e\' GIA\' SCARICABILE su App Store e Play Store:');
      console.error(`  node scripts/release-gate.js recommend --live`);
      console.error('');
      process.exit(1);
    }
    console.log(`Avviso morbido -> ${version}`);
    print(await writeConfig({ recommended_version: version }));
    return;
  }

  if (command === 'block') {
    if (!arg || !VERSION_RE.test(arg)) {
      console.error('Uso: node scripts/release-gate.js block <versione>   (es. 1.4.0)');
      process.exit(1);
    }
    console.log(`MURO -> ${arg}  (sotto questa versione l'app non si apre)`);
    print(await writeConfig({ min_supported_version: arg }));
    return;
  }

  if (command === 'reset') {
    console.log('Gate a riposo: muro e avviso spenti.');
    print(await writeConfig({ min_supported_version: '0.0.0', recommended_version: '0.0.0' }));
    return;
  }

  console.error('Comandi: status | recommend --live | block <versione> | reset');
  process.exit(1);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
