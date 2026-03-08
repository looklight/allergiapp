/**
 * Script per assegnare il custom claim admin a un utente Firebase.
 *
 * Prerequisiti:
 * 1. Scarica la service account key da Firebase Console:
 *    Project Settings > Service Accounts > Generate New Private Key
 * 2. Salva il file come admin/service-account-key.json (gia in .gitignore)
 *
 * Uso:
 *   cd admin
 *   npm run set-admin -- martadmuro@gmail.com
 */

import * as admin from 'firebase-admin';
import * as path from 'path';

const serviceAccountPath = path.join(__dirname, '..', 'service-account-key.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccountPath),
});

async function setAdminClaim(email: string) {
  try {
    const user = await admin.auth().getUserByEmail(email);
    await admin.auth().setCustomUserClaims(user.uid, { admin: true });
    console.log(`Custom claim "admin: true" assegnato a ${email} (uid: ${user.uid})`);
    console.log('NOTA: l\'utente deve fare logout e login per ricevere il nuovo token.');
  } catch (error: any) {
    console.error(`Errore: ${error.message}`);
    process.exit(1);
  }
}

const email = process.argv[2];
if (!email) {
  console.error('Uso: npm run set-admin -- <email>');
  process.exit(1);
}

setAdminClaim(email).then(() => process.exit(0));
