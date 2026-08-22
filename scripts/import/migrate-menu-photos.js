/**
 * =============================================================================
 * MIGRAZIONE FOTO MENU → FOTO RECENSIONE
 * =============================================================================
 *
 * La sezione "foto menu" della scheda ristorante viene ritirata (il menù
 * diventa una feature premium dal portale partner). Le foto già caricate
 * dagli utenti, dove hanno valore, vengono convertite in foto recensione
 * associandole a una recensione esistente (seed user, o l'uploader stesso
 * se ha recensito il locale).
 *
 * La conversione segue il "compromesso" concordato:
 *   - full: copiata così com'è, server-side (resta 1000px non croppata,
 *     così il menù rimane leggibile a schermo intero)
 *   - thumbnail: rigenerata a spec review (250px quadrata, webp q65) così
 *     la griglia della card recensione risulta uniforme
 *
 * USO:
 *   node scripts/import/migrate-menu-photos.js list
 *       Ricognizione: tutte le foto menu esistenti, raggruppate per
 *       ristorante, con le recensioni candidate (seed + uploader).
 *
 *   node scripts/import/migrate-menu-photos.js migrate <menuPhotoId> <reviewId>
 *       Dry-run: mostra cosa verrebbe fatto, non tocca nulla.
 *
 *   node scripts/import/migrate-menu-photos.js migrate <menuPhotoId> <reviewId> --apply
 *       Esegue: copia full, genera thumb, appende a reviews.photos,
 *       elimina riga menu_photos e file originali.
 *
 * VARIABILI D'AMBIENTE (.env / .env.local nella root di allergiapp/):
 *   EXPO_PUBLIC_SUPABASE_URL     → URL del progetto Supabase
 *   SUPABASE_SERVICE_ROLE_KEY    → chiave service role (bypassa RLS)
 *
 * DIPENDENZE: per --apply serve `sharp` (npm i -D sharp), solo per la thumb.
 * =============================================================================
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
require('dotenv').config({ path: path.join(__dirname, '../../.env.local') });
const { createClient } = require('@supabase/supabase-js');

const SEED_LOG = require('./seed-users-log.json');

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Mancano EXPO_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY (.env / .env.local)');
  process.exit(1);
}
const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
const BUCKET = 'images';
// Stesso tetto del form recensione (MAX_PHOTOS in app/restaurants/add-review.tsx):
// mai portare una recensione oltre, o esce dallo spec dell'editor.
const MAX_REVIEW_PHOTOS = 3;

// userId → username dei profili seed creati dagli import
const seedUsers = new Map(Object.values(SEED_LOG).map((u) => [u.userId, u.username]));

function storagePathFromUrl(url) {
  const marker = `/storage/v1/object/public/${BUCKET}/`;
  const i = url.indexOf(marker);
  if (i === -1) throw new Error(`URL non riconducibile al bucket ${BUCKET}: ${url}`);
  return decodeURIComponent(url.slice(i + marker.length));
}

function publicUrl(storagePath) {
  return supabase.storage.from(BUCKET).getPublicUrl(storagePath).data.publicUrl;
}

function excerpt(text, max = 70) {
  if (!text) return '(senza commento)';
  const clean = text.replace(/\s+/g, ' ').trim();
  return clean.length > max ? clean.slice(0, max) + '…' : clean;
}

// ─── list ────────────────────────────────────────────────────────────────────

async function cmdList() {
  const { data: photos, error } = await supabase
    .from('menu_photos')
    .select('id, restaurant_id, user_id, image_url, thumbnail_url, created_at, restaurants(name, city), profiles(username)')
    .order('created_at', { ascending: true });
  if (error) throw error;

  if (!photos.length) {
    console.log('Nessuna foto menu nel DB.');
    return;
  }

  const restaurantIds = [...new Set(photos.map((p) => p.restaurant_id))];
  const { data: reviews, error: revErr } = await supabase
    .from('reviews')
    .select('id, restaurant_id, user_id, rating, comment, photos, created_at, profiles!user_id(username)')
    .in('restaurant_id', restaurantIds)
    .order('created_at', { ascending: true });
  if (revErr) throw revErr;

  const byRestaurant = new Map();
  for (const p of photos) {
    if (!byRestaurant.has(p.restaurant_id)) byRestaurant.set(p.restaurant_id, []);
    byRestaurant.get(p.restaurant_id).push(p);
  }

  console.log(`${photos.length} foto menu su ${byRestaurant.size} ristoranti\n`);

  for (const [restaurantId, restPhotos] of byRestaurant) {
    const r = restPhotos[0].restaurants;
    const uploaderIds = new Set(restPhotos.map((p) => p.user_id).filter(Boolean));
    console.log('─'.repeat(78));
    console.log(`${r?.name ?? '(ristorante sconosciuto)'}${r?.city ? ` — ${r.city}` : ''}`);
    console.log(`  restaurant_id: ${restaurantId}\n`);

    console.log('  FOTO MENU:');
    for (const p of restPhotos) {
      const who = p.profiles?.username ?? '(utente eliminato)';
      console.log(`    ${p.id}`);
      console.log(`      di ${who}, ${p.created_at.slice(0, 10)}`);
      console.log(`      ${p.image_url}`);
    }

    const restReviews = reviews.filter((rv) => rv.restaurant_id === restaurantId);
    const candidates = restReviews.filter(
      (rv) => seedUsers.has(rv.user_id) || uploaderIds.has(rv.user_id)
    );
    console.log(`\n  RECENSIONI CANDIDATE (${candidates.length} su ${restReviews.length} totali):`);
    if (!candidates.length) {
      console.log('    nessuna recensione seed né dell\'uploader su questo locale');
    }
    for (const rv of candidates) {
      const tags = [
        seedUsers.has(rv.user_id) ? 'SEED' : null,
        uploaderIds.has(rv.user_id) ? 'UPLOADER' : null,
      ].filter(Boolean).join(', ');
      const nPhotos = Array.isArray(rv.photos) ? rv.photos.length : 0;
      const free = Math.max(0, MAX_REVIEW_PHOTOS - nPhotos);
      console.log(`    ${rv.id}  [${tags}]`);
      console.log(`      ${rv.profiles?.username ?? '?'} — ${rv.rating}★, ${nPhotos} foto (${free} slot liberi) — "${excerpt(rv.comment)}"`);
    }
    console.log('');
  }
}

// ─── migrate ─────────────────────────────────────────────────────────────────

async function cmdMigrate(menuPhotoId, reviewId, apply, cropTop = false, squareFull = false) {
  const { data: photo, error: phErr } = await supabase
    .from('menu_photos')
    .select('id, restaurant_id, user_id, image_url, thumbnail_url')
    .eq('id', menuPhotoId)
    .single();
  if (phErr || !photo) throw new Error(`Foto menu ${menuPhotoId} non trovata: ${phErr?.message}`);

  const { data: review, error: rvErr } = await supabase
    .from('reviews')
    .select('id, restaurant_id, user_id, photos, profiles!user_id(username)')
    .eq('id', reviewId)
    .single();
  if (rvErr || !review) throw new Error(`Recensione ${reviewId} non trovata: ${rvErr?.message}`);

  if (photo.restaurant_id !== review.restaurant_id) {
    throw new Error(
      `Ristorante diverso: foto su ${photo.restaurant_id}, recensione su ${review.restaurant_id}`
    );
  }
  if (!review.user_id) throw new Error('La recensione è anonima (user_id null): serve un owner per il path storage.');

  const origFull = storagePathFromUrl(photo.image_url);
  const origThumb = photo.thumbnail_url ? storagePathFromUrl(photo.thumbnail_url) : null;
  // suffisso _m<id foto> : univoco, mai in conflitto con gli indici _0.._n dell'app
  const destBase = `${review.user_id}/reviews/${review.restaurant_id}/${review.id}_m${photo.id.slice(0, 8)}`;
  const destFull = `${destBase}.webp`;
  const destThumb = `${destBase}_thumb.webp`;
  const existing = Array.isArray(review.photos) ? review.photos : [];

  console.log(`Foto menu:   ${photo.id}`);
  console.log(`Recensione:  ${review.id} (${review.profiles?.username ?? '?'}, ${existing.length} foto attuali)`);
  console.log(`${squareFull ? 'Full 600²:  ' : 'Copia full:  '}${origFull}`);
  console.log(`         →   ${destFull}${squareFull ? ' (rigenerata 600×600 q70)' : ''}`);
  console.log(`Thumb 250²:  ${destThumb} (rigenerata dal full)`);
  console.log(`Poi: append a reviews.photos, DELETE riga menu_photos, rimozione file originali`);

  if (existing.some((p) => p.url === publicUrl(destFull))) {
    console.log('\nGià migrata (URL presente in reviews.photos): niente da fare.');
    return;
  }
  if (existing.length >= MAX_REVIEW_PHOTOS) {
    throw new Error(
      `Recensione piena (${existing.length}/${MAX_REVIEW_PHOTOS} foto): il form dell'app non supporta di più. Scegli un'altra recensione.`
    );
  }
  if (!apply) {
    console.log('\nDRY-RUN: nessuna modifica. Aggiungi --apply per eseguire.');
    return;
  }

  let sharp;
  try {
    sharp = require('sharp');
  } catch {
    throw new Error('Serve sharp per generare la thumbnail: npm i -D sharp (nella root di allergiapp)');
  }

  const { data: blob, error: dlErr } = await supabase.storage.from(BUCKET).download(origFull);
  if (dlErr) throw new Error(`Download full fallito: ${dlErr.message}`);
  const srcBuf = Buffer.from(await blob.arrayBuffer());

  // 1. full: copia intatta (menù leggibile) oppure 600² a spec review con
  // --square-full, per uniformarsi alle altre foto recensione
  if (squareFull) {
    const fullBuf = await sharp(srcBuf)
      .resize(600, 600, { fit: 'cover', position: cropTop ? 'top' : 'centre' })
      .webp({ quality: 70 })
      .toBuffer();
    const { error: upFullErr } = await supabase.storage
      .from(BUCKET)
      .upload(destFull, fullBuf, { contentType: 'image/webp', upsert: true });
    if (upFullErr) throw new Error(`Upload full fallito: ${upFullErr.message}`);
  } else {
    // copia server-side (idempotente: se esiste già, prosegui)
    const { error: copyErr } = await supabase.storage.from(BUCKET).copy(origFull, destFull);
    if (copyErr && !/already exists|duplicate/i.test(copyErr.message)) {
      throw new Error(`Copia full fallita: ${copyErr.message}`);
    }
  }

  // 2. thumbnail 250px quadrata (crop centrale) a spec review
  // crop quadrato: centrale di default, dall'alto con --crop-top (utile per
  // menù verticali dove l'intestazione/i piatti stanno in cima)
  const thumbBuf = await sharp(srcBuf)
    .resize(250, 250, { fit: 'cover', position: cropTop ? 'top' : 'centre' })
    .webp({ quality: 65 })
    .toBuffer();
  const { error: upErr } = await supabase.storage
    .from(BUCKET)
    .upload(destThumb, thumbBuf, { contentType: 'image/webp', upsert: true });
  if (upErr) throw new Error(`Upload thumb fallito: ${upErr.message}`);

  // 3. append a reviews.photos
  const newPhotos = [...existing, { url: publicUrl(destFull), thumbnailUrl: publicUrl(destThumb) }];
  const { error: updErr } = await supabase
    .from('reviews')
    .update({ photos: newPhotos })
    .eq('id', review.id);
  if (updErr) throw new Error(`Update reviews.photos fallito: ${updErr.message}`);

  // 4. cleanup origine (riga DB + file storage)
  const { error: delErr } = await supabase.from('menu_photos').delete().eq('id', photo.id);
  if (delErr) console.warn(`ATTENZIONE: delete riga menu_photos fallita: ${delErr.message}`);
  const { error: rmErr } = await supabase.storage
    .from(BUCKET)
    .remove([origFull, origThumb].filter(Boolean));
  if (rmErr) console.warn(`ATTENZIONE: rimozione file originali fallita: ${rmErr.message}`);

  console.log('\nFATTO. La foto ora è nella recensione, origine ripulita.');
}

// ─── purge ───────────────────────────────────────────────────────────────────

// Elimina definitivamente foto menu NON migrate (riga DB + file storage).
async function cmdPurge(menuPhotoIds, apply) {
  const { data: photos, error } = await supabase
    .from('menu_photos')
    .select('id, image_url, thumbnail_url, restaurants(name)')
    .in('id', menuPhotoIds);
  if (error) throw error;

  const found = new Set(photos.map((p) => p.id));
  for (const id of menuPhotoIds) {
    if (!found.has(id)) console.warn(`ATTENZIONE: ${id} non trovata (già eliminata?)`);
  }
  for (const p of photos) {
    console.log(`${apply ? 'ELIMINO' : 'eliminerei'} ${p.id} (${p.restaurants?.name ?? '?'})`);
  }
  if (!apply) {
    console.log(`\nDRY-RUN: ${photos.length} foto. Aggiungi --apply per eseguire.`);
    return;
  }

  const paths = [];
  for (const p of photos) {
    paths.push(storagePathFromUrl(p.image_url));
    if (p.thumbnail_url) paths.push(storagePathFromUrl(p.thumbnail_url));
  }
  const { error: delErr } = await supabase
    .from('menu_photos')
    .delete()
    .in('id', photos.map((p) => p.id));
  if (delErr) throw new Error(`Delete righe fallita: ${delErr.message}`);
  if (paths.length) {
    const { error: rmErr } = await supabase.storage.from(BUCKET).remove(paths);
    if (rmErr) console.warn(`ATTENZIONE: rimozione file fallita: ${rmErr.message}`);
  }
  console.log(`\nFATTO: ${photos.length} foto eliminate (righe + file).`);
}

// ─── main ────────────────────────────────────────────────────────────────────

async function main() {
  const [cmd, ...rest] = process.argv.slice(2);
  if (cmd === 'list') {
    await cmdList();
  } else if (cmd === 'migrate') {
    const apply = rest.includes('--apply');
    const cropTop = rest.includes('--crop-top');
    const squareFull = rest.includes('--square-full');
    const [menuPhotoId, reviewId] = rest.filter((a) => !a.startsWith('--'));
    if (!menuPhotoId || !reviewId) {
      console.error('Uso: migrate <menuPhotoId> <reviewId> [--apply] [--crop-top] [--square-full]');
      process.exit(1);
    }
    await cmdMigrate(menuPhotoId, reviewId, apply, cropTop, squareFull);
  } else if (cmd === 'purge') {
    const apply = rest.includes('--apply');
    const ids = rest.filter((a) => !a.startsWith('--'));
    if (!ids.length) {
      console.error('Uso: purge <menuPhotoId> [altri id…] [--apply]');
      process.exit(1);
    }
    await cmdPurge(ids, apply);
  } else {
    console.error('Comandi: list | migrate <menuPhotoId> <reviewId> [--apply] | purge <id…> [--apply]');
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e.message ?? e);
  process.exit(1);
});
