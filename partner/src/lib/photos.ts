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

// COS'È UN RITAGLIO. Il quadrato che si tiene, detto in frazioni e non in
// pixel: così lo stesso ritaglio vale per la miniatura e per la grande, e non
// c'è nessuna misura da riscalare fra le due.
//
// `zoom` 1 = il quadrato più grande che ci sta dentro (fino al 2026-09-02 era
// l'unica cosa possibile). Da lì in su il quadrato si stringe: zoom 2 vuol
// dire prenderne metà lato, cioè avvicinarsi al doppio.
//
// `x` e `y` sono DOVE cade quel quadrato lungo i due assi, da 0 a 1, e 0.5 è
// il centro. Sono frazioni della corsa disponibile, non della foto: se su un
// asse non c'è margine — il lato corto quando lo zoom è 1 — quel valore non
// sposta niente, e non serve trattarlo a parte.
export interface Crop {
  x: number;
  y: number;
  zoom: number;
}

// Il ritaglio da cui si parte, e quello di chi non ne sceglie nessuno: al
// centro, senza ingrandimento.
export const CROP_CENTRO: Crop = { x: 0.5, y: 0.5, zoom: 1 };

// Quanto ci si può avvicinare. Oltre il quadruplo si comincia a ingrandire dei
// pixel che non ci sono: il ritaglio diventa più piccolo della misura che
// vogliamo salvare, e il risultato è una foto sfocata scelta a occhi aperti.
export const ZOOM_MAX = 4;

// Il lato del quadrato, non il lato lungo: le foto si ritagliano quadrate
// (v. renderToBlob). La grande si vede una alla volta — la scheda, e
// l'ingrandimento al tocco; la miniatura sta in un cerchio da 64px al
// massimo, quindi 240 la copre anche sugli schermi a tripla densità.
const GRANDE = { lato: 900, qualita: 0.78 };
const MINIATURA = { lato: 240, qualita: 0.7 };

// LA COPERTINA DEL MENÙ: l'immagine dietro l'intestazione, al posto del
// colore pieno. Larga e bassa (3:1) perché è una fascia in cima a una
// pagina di telefono, non una fotografia da guardare: più alta mangerebbe
// il menù, che è la ragione per cui il cliente ha inquadrato il QR.
//
// 1000px di larghezza e qualità bassa (0.7): è l'immagine più grande della
// pagina ed è la PRIMA a caricarsi, cioè la voce che il Tema 11 indica come
// il costo dell'intera fase gratuita. Sotto ci va comunque una velatura
// scura, che perdona parecchio sulla compressione.
const COPERTINA = { lato: 1000, qualita: 0.7, ratio: 3 };

// IL LOGO DEL LOCALE. 240 basta: nell'anteprima sta in un cerchio da 56px, e
// in cima al menù pubblico non è più grande.
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
  crop: Crop,
  // larghezza / altezza. 1 = quadrato (piatti, logo); la copertina del menù è
  // larga e bassa.
  ratio: number,
  // Il colore sotto l'immagine, per chi arriva con la trasparenza: serve ai
  // LOGHI, che sono quasi sempre PNG trasparenti e su un formato senza
  // trasparenza diventerebbero neri. Le foto dei piatti non ne hanno bisogno,
  // e senza questo parametro il comportamento è quello di prima.
  fondo?: string
): Promise<Blob> {
  // Il lato del quadrato che si tiene: il più grande che ci sta dentro,
  // stretto dallo zoom
  const pienaW = img.width / img.height > ratio ? img.height * ratio : img.width;
  const sorgenteW = pienaW / Math.max(1, crop.zoom);
  const sorgenteH = sorgenteW / ratio;
  // Una foto già piccola non si ingrandisce: si tiene com'è. Vale anche per
  // il ritaglio stretto dallo zoom — avvicinandosi molto si salva un quadrato
  // più piccolo, che è la verità di quanti pixel sono rimasti.
  const destinazioneW = Math.round(Math.min(lato, sorgenteW));
  const destinazioneH = Math.round(destinazioneW / ratio);
  // Quanto margine c'è su ciascun asse, e dove ci si mette dentro. Su un asse
  // senza margine il conto fa zero da sé.
  const scorrimento = (misura: number, presa: number, dove: number) =>
    Math.round((misura - presa) * dove);

  const canvas = document.createElement('canvas');
  canvas.width = destinazioneW;
  canvas.height = destinazioneH;
  const ctx = canvas.getContext('2d');
  if (!ctx) return Promise.reject(new Error('canvas non disponibile'));
  if (fondo !== undefined) {
    ctx.fillStyle = fondo;
    ctx.fillRect(0, 0, destinazioneW, destinazioneH);
  }
  ctx.drawImage(
    img,
    scorrimento(img.width, sorgenteW, crop.x),
    scorrimento(img.height, sorgenteH, crop.y),
    sorgenteW,
    sorgenteH,
    0,
    0,
    destinazioneW,
    destinazioneH
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
export async function uploadDishPhoto(file: File, crop: Crop = CROP_CENTRO): Promise<DishPhoto> {
  let grande: Blob;
  let mini: Blob;
  try {
    const img = await loadImage(file);
    [grande, mini] = await Promise.all([
      renderToBlob(img, GRANDE.lato, GRANDE.qualita, crop, 1),
      renderToBlob(img, MINIATURA.lato, MINIATURA.qualita, crop, 1),
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
export async function uploadLogo(file: File, crop: Crop = CROP_CENTRO): Promise<string> {
  const ownerId = await currentUserId();
  if (!ownerId) {
    reportError('caricamento logo', new Error('sessione assente'));
    throw new PhotoError('upload');
  }
  let blob: Blob;
  try {
    // Quadrato come le foto dei piatti, e ritagliato dalla stessa finestra:
    // il logo si vede SEMPRE dentro un cerchio — nell'editor e in cima al
    // menù — quindi un rettangolo verrebbe tagliato comunque, ma dal browser
    // e dal centro. Meglio che a scegliere il pezzo sia il ristoratore.
    //
    // Il fondo bianco si disegna sotto: quasi tutti i loghi arrivano in PNG
    // trasparente, e su un formato che la trasparenza non ce l'ha
    // diventerebbe nero. Bianco è anche il cerchio su cui il logo sta
    // nell'anteprima, quindi non si vede la giunta.
    blob = await renderToBlob(await loadImage(file), LOGO.lato, LOGO.qualita, crop, 1, '#ffffff');
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

// La copertina su Storage. Un file solo, come il logo: non serve una
// miniatura, perché non compare mai in una lista.
export async function uploadCover(file: File, crop: Crop = CROP_CENTRO): Promise<string> {
  const ownerId = await currentUserId();
  if (!ownerId) {
    reportError('caricamento copertina', new Error('sessione assente'));
    throw new PhotoError('upload');
  }
  let blob: Blob;
  try {
    blob = await renderToBlob(
      await loadImage(file),
      COPERTINA.lato,
      COPERTINA.qualita,
      crop,
      COPERTINA.ratio
    );
  } catch (errore) {
    reportError('lettura copertina', errore);
    throw new PhotoError('read');
  }
  const path = `${ownerId}/covers/${crypto.randomUUID()}.${estensione(blob)}`;
  try {
    return await upload(path, blob);
  } catch (errore) {
    reportError('caricamento copertina', errore);
    throw new PhotoError('upload');
  }
}

export const COPERTINA_RATIO = COPERTINA.ratio;

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
//
// ⚠️ TRANNE SE QUELLA FOTO È IN UN MENÙ GIÀ PUBBLICATO. Da quando esiste la
// pubblicazione (Tema 24), il menù che il cliente legge al tavolo è uno
// SCATTO: se il ristoratore sostituisce la foto di un piatto, lo scatto punta
// ancora al file vecchio, e cancellarlo vuol dire un'immagine rotta in sala —
// invisibile dal portale, dove si vede la foto nuova. Il file resta lì finché
// quel locale non pubblica di nuovo; da quel momento è un orfano di qualche
// decina di KB, che costa incomparabilmente meno.
export async function deleteDishPhoto(url: string, thumbUrl: string): Promise<void> {
  const { data: inSala, error: erroreControllo } = await supabase.rpc('photo_in_published_menu', {
    p_url: url,
  });
  // Se il controllo non riesce NON si cancella: nel dubbio si tiene un file
  // di troppo, che è il lato dell'errore che non si vede al tavolo.
  if (erroreControllo || inSala === true) {
    reportError('controllo foto pubblicata', erroreControllo);
    return;
  }
  const paths = [url, thumbUrl].map(bucketPath).filter((p): p is string => p !== null);
  if (paths.length === 0) return;
  const { error } = await supabase.storage.from(BUCKET).remove(paths);
  reportError('cancellazione foto piatto', error);
}

// Porta via il logo che non è più di nessuno. Come per i piatti non blocca
// chi la chiama: un file rimasto sono byte, e i loghi vecchi delle righe
// scritte prima del 02/09 sono data-URL, su cui non c'è niente da cancellare
// (bucketPath restituisce null e qui non si fa nulla).
export async function deleteCover(url: string): Promise<void> {
  return deleteLogo(url);
}

// Porta via un file che non è più di nessuno. Vale per il logo e per la
// copertina: sono tutti e due un file solo nello stesso bucket.
//
// ⚠️ TRANNE SE È NELLO SCATTO PUBBLICATO, esattamente come per le foto dei
// piatti qui sopra. Il commento in setIdentity diceva che questo controllo
// c'era già: non c'era, e per un giorno sostituire il logo o la copertina ha
// voluto dire portarsi via il file che il menù in sala stava ancora
// mostrando — un'immagine rotta al tavolo, invisibile dal portale dove si
// vede quella nuova. Il file resta finché quel locale non pubblica di nuovo,
// e da lì è un orfano di qualche decina di KB.
//
// Serve anche a un'altra cosa, da qui in avanti: l'annullamento delle
// modifiche all'aspetto rimette il logo dello scatto, e senza questo
// controllo lo rimetterebbe puntando a un file che avevamo già distrutto.
export async function deleteLogo(url: string): Promise<void> {
  const path = bucketPath(url);
  if (path === null) return;
  const { data: inSala, error: erroreControllo } = await supabase.rpc('photo_in_published_menu', {
    p_url: url,
  });
  // Come per i piatti: se il controllo non riesce NON si cancella. Nel dubbio
  // si tiene un file di troppo, che è il lato dell'errore che non si vede al
  // tavolo.
  if (erroreControllo || inSala === true) {
    reportError('controllo logo pubblicato', erroreControllo);
    return;
  }
  const { error } = await supabase.storage.from(BUCKET).remove([path]);
  reportError('cancellazione logo', error);
}
