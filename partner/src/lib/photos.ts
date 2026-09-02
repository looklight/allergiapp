'use client';

// Le foto dei piatti: ridimensionamento nel browser e caricamento su
// Supabase Storage (bucket 'partner', v. migration 702).
//
// Fino al 30/08 la foto finiva come data-URL dentro la colonna photo_url,
// cioè l'immagine intera in testo dentro la riga: riletta per intero a ogni
// apertura del catalogo, insieme ai nomi e agli allergeni.
//
// DUE MISURE, generate qui e non altrove: sul piano gratuito Supabase non
// esiste la trasformazione immagini lato server, quindi quello che non si
// genera adesso non si può più ottenere se non facendo ricaricare la foto al
// ristoratore. La miniatura è quella che conta: è l'unica che si moltiplica
// per quaranta in una lista.
import { supabase } from './supabase';
import { currentUserId, reportError } from './storage';

const BUCKET = 'partner';

// Il lato del quadrato, non il lato lungo: le foto si ritagliano quadrate
// (v. renderToBlob). La grande si vede una alla volta — la scheda, e
// l'ingrandimento al tocco; la miniatura sta in un cerchio da 64px al
// massimo, quindi 240 la copre anche sugli schermi a tripla densità.
const GRANDE = { lato: 900, qualita: 0.78 };
const MINIATURA = { lato: 240, qualita: 0.7 };

// IL LOGO DEL LOCALE. Lato massimo e non lato del quadrato: un logo non si
// ritaglia, si rimpicciolisce — tagliarne un pezzo vuol dire tagliare il nome
// del ristorante. 240 basta: nell'anteprima sta in un cerchio da 56px, e in
// cima al menù pubblico non è più grande.
const LOGO = { lato: 240, qualita: 0.85 };

export interface DishPhoto {
  url: string;
  thumbUrl: string;
}

// Perché fallisce, in termini che la maschera possa dire al ristoratore.
// 'read' = il file non è un'immagine che il browser sappia aprire: cambiare
// file è l'unica cosa che serve. 'upload' = l'immagine era buona ma non è
// arrivata: riprovare ha senso. Sono due messaggi diversi perché portano a
// due gesti diversi. Il dettaglio tecnico va in console, non a schermo.
export type PhotoFailure = 'read' | 'upload';

export class PhotoError extends Error {
  constructor(readonly kind: PhotoFailure) {
    super(kind);
    this.name = 'PhotoError';
  }
}

// Il file scelto dal ristoratore, prima di toccarlo. Il tetto vero è sul
// bucket (5 MB, applicato dal server): questo è solo il messaggio gentile
// che arriva prima di aver caricato qualcosa.
export const MAX_FILE_BYTES = 10 * 1024 * 1024;

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('immagine non leggibile'));
      img.src = reader.result as string;
    };
    reader.onerror = () => reject(new Error('file non leggibile'));
    reader.readAsDataURL(file);
  });
}

// RITAGLIO QUADRATO, come le foto delle recensioni nell'app — ma il punto da
// cui prenderlo lo sceglie il ristoratore (v. PhotoCropDialog), perché qui è
// definitivo: l'originale non lo teniamo. `posizione` è dove cade il quadrato
// lungo il lato lungo, da 0 a 1; 0.5 è il centro, che è anche il ripiego.
//
// Il quadrato è la forma CONSERVATA, non quella mostrata: nelle liste il
// cerchio lo fa il CSS, e sotto al cerchio il quadrato resta intero, pronto
// per chi lo vorrà ingrandire premendo.
//
// WebP a parità di occhio pesa circa un terzo meno del JPEG. Non è ovunque:
// se il browser non sa scriverlo, toBlob NON fallisce — restituisce un PNG,
// che su una fotografia pesa diverse volte tanto. Quindi il tipo di quello
// che torna si controlla, e in quel caso si riprova in JPEG.
function renderToBlob(
  img: HTMLImageElement,
  lato: number,
  qualita: number,
  posizione: number
): Promise<Blob> {
  // Il lato del quadrato più grande che ci sta dentro
  const sorgente = Math.min(img.width, img.height);
  // Una foto già piccola non si ingrandisce: si tiene com'è
  const destinazione = Math.min(lato, sorgente);
  // Sul lato corto non c'è niente da scegliere, ed è per questo che il
  // ritaglio ha un asse solo
  const scorrimento = (misura: number) => Math.round((misura - sorgente) * posizione);

  const canvas = document.createElement('canvas');
  canvas.width = destinazione;
  canvas.height = destinazione;
  const ctx = canvas.getContext('2d');
  if (!ctx) return Promise.reject(new Error('canvas non disponibile'));
  ctx.drawImage(
    img,
    scorrimento(img.width),
    scorrimento(img.height),
    sorgente,
    sorgente,
    0,
    0,
    destinazione,
    destinazione
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob && blob.type === 'image/webp') {
          resolve(blob);
          return;
        }
        canvas.toBlob(
          (jpeg) => (jpeg ? resolve(jpeg) : reject(new Error('immagine non convertibile'))),
          'image/jpeg',
          qualita
        );
      },
      'image/webp',
      qualita
    );
  });
}

// Il logo ridotto, con le PROPORZIONI INTATTE e il fondo bianco sotto.
// Quasi tutti i loghi arrivano in PNG con lo sfondo trasparente, e su un
// formato che la trasparenza non ce l'ha diventerebbe nero: bianco è anche il
// cerchio su cui il logo sta nell'anteprima, quindi non si vede la giunta.
//
// Stessa cautela di renderToBlob sul WebP: se il browser non lo sa scrivere,
// toBlob NON fallisce — restituisce un PNG, che su un'immagine vera pesa
// molte volte tanto. Quindi si guarda cosa è tornato davvero.
function renderLogoBlob(img: HTMLImageElement): Promise<Blob> {
  return new Promise((risolvi, rifiuta) => {
    const scala = Math.min(1, LOGO.lato / Math.max(img.width, img.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(img.width * scala));
    canvas.height = Math.max(1, Math.round(img.height * scala));
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      rifiuta(new Error('logo: canvas non disponibile'));
      return;
    }
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(
      (webp) => {
        if (webp && webp.type === 'image/webp') {
          risolvi(webp);
          return;
        }
        canvas.toBlob(
          (jpeg) => (jpeg ? risolvi(jpeg) : rifiuta(new Error('logo: conversione fallita'))),
          'image/jpeg',
          LOGO.qualita
        );
      },
      'image/webp',
      LOGO.qualita
    );
  });
}

function estensione(blob: Blob) {
  return blob.type === 'image/webp' ? 'webp' : 'jpg';
}

// Un anno, in secondi. È il bigliettino che parte insieme al file e dice a
// chi lo riceve — il browser del cliente, e soprattutto la rete di
// distribuzione in mezzo — per quanto può tenersi la copia senza richiederla.
//
// Il valore predefinito di Supabase è un'ora, e sarebbe un'ora sprecata: qui
// il file a quell'indirizzo NON PUÒ cambiare. Il nome è casuale, non si
// sovrascrive mai (upsert: false qui sotto), e una foto nuova prende un nome
// nuovo — quindi non esiste il rischio classico della cache lunga, vedere una
// versione vecchia. Un'ora vorrebbe solo dire rispedire la stessa immagine
// trecentosessantacinque volte l'anno a ogni nodo della rete, che è il costo
// dei menù pubblici quando saranno mille (DIGITAL_MENU.md, Tema 11: sul
// gratuito il costo è quasi tutto foto).
//
// ⚠️ Non si copia questo valore sulle foto delle RECENSIONI nell'app: là il
// percorso è fisso (`<reviewId>_<indice>.webp`) e la sostituzione riscrive lo
// stesso file, quindi una cache lunga mostrerebbe la foto vecchia. Se un
// giorno si volesse allungare anche là, si cambia il NOME, non la durata.
const UN_ANNO = 60 * 60 * 24 * 365;

async function upload(path: string, blob: Blob): Promise<string> {
  const { error } = await supabase.storage.from(BUCKET).upload(path, blob, {
    contentType: blob.type,
    cacheControl: String(UN_ANNO),
    // I file non si sovrascrivono mai (il nome è casuale): se il percorso
    // esiste è successo qualcosa che va visto, non nascosto.
    upsert: false,
  });
  if (error) throw error;
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

// Carica le due misure. Se una delle due non arriva, si porta via l'altra:
// mezza foto è peggio di nessuna, perché la lista mostrerebbe un buco senza
// che nessuno sappia perché.
export async function uploadDishPhoto(file: File, posizione = 0.5): Promise<DishPhoto> {
  let grande: Blob;
  let mini: Blob;
  try {
    const img = await loadImage(file);
    [grande, mini] = await Promise.all([
      renderToBlob(img, GRANDE.lato, GRANDE.qualita, posizione),
      renderToBlob(img, MINIATURA.lato, MINIATURA.qualita, posizione),
    ]);
  } catch (error) {
    reportError('lettura foto piatto', error);
    throw new PhotoError('read');
  }

  const ownerId = await currentUserId();
  if (!ownerId) {
    reportError('caricamento foto piatto', new Error('sessione assente'));
    throw new PhotoError('upload');
  }

  // Il nome del file è casuale e NON è l'id del piatto, per due motivi: la
  // foto si sceglie prima che il piatto esista, e sostituendone una il file
  // vecchio dev'essere ancora lì finché il salvataggio non è riuscito.
  const nome = crypto.randomUUID();
  const base = `${ownerId}/dishes/${nome}`;
  const pathGrande = `${base}.${estensione(grande)}`;
  const pathMini = `${base}_thumb.${estensione(mini)}`;

  // allSettled e non all: con all, il rifiuto di una delle due farebbe
  // partire la pulizia mentre l'altra è ancora per aria, e il file arrivato
  // un istante dopo resterebbe lì per sempre. Qui si aspetta che siano
  // finite entrambe, poi si porta via tutto — togliere un percorso che non
  // è mai stato scritto non fa niente. È lo stesso modo in cui l'app carica
  // le foto di una recensione.
  const esiti = await Promise.allSettled([upload(pathGrande, grande), upload(pathMini, mini)]);
  const fallito = esiti.find((e) => e.status === 'rejected');
  if (fallito) {
    await supabase.storage.from(BUCKET).remove([pathGrande, pathMini]);
    reportError('caricamento foto piatto', fallito.reason);
    throw new PhotoError('upload');
  }

  const [url, thumbUrl] = (esiti as PromiseFulfilledResult<string>[]).map((e) => e.value);
  return { url, thumbUrl };
}

// Il logo del locale su Storage. Un file solo: a differenza dei piatti non
// serve una miniatura, perché la misura piena è già quella di una miniatura.
//
// Fino al 2026-09-02 il logo restava una data-URL dentro `partner_venues.
// logo_url`, cioè l'immagine intera in testo dentro la riga: riletta a ogni
// apertura del portale insieme a nomi e link, e — cosa che conta di più —
// destinata a finire dentro OGNI pagina pubblica generata, invece di essere
// scaricata una volta e tenuta in cache come tutte le altre immagini. La
// colonna non è cambiata: prima conteneva l'immagine, adesso il suo indirizzo.
export async function uploadLogo(file: File): Promise<string> {
  const ownerId = await currentUserId();
  if (!ownerId) {
    reportError('caricamento logo', new Error('sessione assente'));
    throw new PhotoError('upload');
  }
  let blob: Blob;
  try {
    blob = await renderLogoBlob(await loadImage(file));
  } catch (errore) {
    reportError('lettura logo', errore);
    throw new PhotoError('read');
  }
  // Nome casuale come per le foto dei piatti, e per lo stesso motivo: il file
  // vecchio deve restare al suo posto finché il nuovo non è arrivato davvero.
  const path = `${ownerId}/logos/${crypto.randomUUID()}.${estensione(blob)}`;
  try {
    return await upload(path, blob);
  } catch (errore) {
    reportError('caricamento logo', errore);
    throw new PhotoError('upload');
  }
}

// Il percorso dentro il bucket a partire dall'indirizzo pubblico.
// Restituisce null per tutto ciò che non è un file del nostro bucket: le
// foto vecchie sono data-URL, e su quelle non c'è niente da cancellare.
function bucketPath(url: string): string | null {
  // L'espressione si costruisce dalla costante e non si riscrive a mano: col
  // nome del bucket copiato qui dentro, rinominarlo farebbe smettere alla
  // cancellazione di riconoscere i propri file — in silenzio.
  const match = url.match(new RegExp(`/storage/v1/object/public/${BUCKET}/(.+)$`));
  return match ? decodeURIComponent(match[1]) : null;
}

// Cancella i file di una foto. Non blocca mai chi la chiama e non ha un
// esito da guardare: un file rimasto sono byte, e far fallire per questo
// un'eliminazione riuscita sarebbe peggio del file.
export async function deleteDishPhoto(url: string, thumbUrl: string): Promise<void> {
  const paths = [url, thumbUrl].map(bucketPath).filter((p): p is string => p !== null);
  if (paths.length === 0) return;
  const { error } = await supabase.storage.from(BUCKET).remove(paths);
  reportError('cancellazione foto piatto', error);
}

// Porta via il logo che non è più di nessuno. Come per i piatti non blocca
// chi la chiama: un file rimasto sono byte, e i loghi vecchi delle righe
// scritte prima del 02/09 sono data-URL, su cui non c'è niente da cancellare
// (bucketPath restituisce null e qui non si fa nulla).
export async function deleteLogo(url: string): Promise<void> {
  const path = bucketPath(url);
  if (path === null) return;
  const { error } = await supabase.storage.from(BUCKET).remove([path]);
  reportError('cancellazione logo', error);
}
