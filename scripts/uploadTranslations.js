/**
 * Script per caricare le traduzioni pre-generate su Firestore.
 *
 * Uso:
 *   node scripts/uploadTranslations.js                     # carica tutte le lingue
 *   node scripts/uploadTranslations.js el tr cs             # carica solo le lingue specificate
 *
 * Requisiti:
 *   - admin/service-account-key.json deve esistere
 *   - Le traduzioni devono essere in scripts/translations/{langCode}.json
 */

const path = require('path');
const fs = require('fs');

// Usa firebase-admin da admin/node_modules
const admin = require(path.join(__dirname, '..', 'admin', 'node_modules', 'firebase-admin'));

const SERVICE_ACCOUNT_PATH = path.join(__dirname, '..', 'admin', 'service-account-key.json');
const TRANSLATIONS_DIR = path.join(__dirname, 'translations');

// Inizializza Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(require(SERVICE_ACCOUNT_PATH)),
  });
}

const db = admin.firestore();

async function uploadTranslation(langCode) {
  const filePath = path.join(TRANSLATIONS_DIR, `${langCode}.json`);

  if (!fs.existsSync(filePath)) {
    console.log(`  ⏭  ${langCode} — file non trovato, skip`);
    return false;
  }

  const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

  await db.collection('translations').doc(langCode).set({
    ...data,
    updatedAt: new Date().toISOString(), // Timestamp server: usato da checkTranslationUpdate()
  });

  console.log(`  ✅ ${langCode} — caricato`);
  return true;
}

async function main() {
  const args = process.argv.slice(2);

  // Se specificati codici lingua come argomenti, carica solo quelli
  let langCodes = args;

  if (langCodes.length === 0) {
    // Carica tutte le lingue trovate nella cartella translations/
    if (!fs.existsSync(TRANSLATIONS_DIR)) {
      console.error(`❌ Cartella ${TRANSLATIONS_DIR} non trovata.`);
      console.error('   Crea i file JSON delle traduzioni in scripts/translations/');
      process.exit(1);
    }

    langCodes = fs.readdirSync(TRANSLATIONS_DIR)
      .filter(f => f.endsWith('.json'))
      .map(f => f.replace('.json', ''))
      .sort();
  }

  if (langCodes.length === 0) {
    console.log('Nessuna traduzione da caricare.');
    return;
  }

  console.log(`\nCaricamento ${langCodes.length} lingue su Firestore...\n`);

  let uploaded = 0;
  for (const langCode of langCodes) {
    const ok = await uploadTranslation(langCode);
    if (ok) uploaded++;
  }

  console.log(`\n✅ Fatto: ${uploaded}/${langCodes.length} lingue caricate.\n`);
}

main().catch(err => {
  console.error('❌ Errore:', err.message);
  process.exit(1);
});
