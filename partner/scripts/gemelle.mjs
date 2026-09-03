// LE COPIE GEMELLE: questo script le mette una accanto all'altra.
//
// Il menù al tavolo esiste due volte — l'anteprima qui nel portale e la
// pagina vera sul sito (branch `landing`) — perché sono due progetti che si
// rilasciano separatamente. Non è un errore da correggere centralizzando: un
// pacchetto condiviso vorrebbe dire un passo di build in mezzo e due treni di
// rilascio legati, per tenere allineati una manciata di numeri.
//
// Il rischio però è reale, e si è visto: il 2026-09-03 le misure di base
// erano divergenti da mesi senza che nessuno se ne accorgesse — nel portale
// il nome del piatto stava a un punto dal titolo di sezione, al tavolo a due,
// cioè il ristoratore giudicava proporzioni che il suo cliente non avrebbe
// visto. Nessuno se n'era accorto perché le due copie non si potevano
// confrontare se non a mano.
//
// Quindi: niente infrastruttura, uno script che si lancia quando si tocca il
// menù. `npm run gemelle`.
//
// ⚠️ VUOLE I DUE CHECKOUT AFFIANCATI (allergiapp/ e landing/). Se `landing`
// non c'è — su Vercel, o su una macchina che ha solo questo repo — esce senza
// fallire: è uno strumento per chi sviluppa, non un cancello.
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const qui = dirname(fileURLToPath(import.meta.url));
const portale = join(qui, '..');
const sito = join(portale, '..', '..', 'landing');

if (!existsSync(join(sito, 'menu-page.css'))) {
  console.log('landing/ non è qui accanto: niente da confrontare.');
  process.exit(0);
}

const leggi = (base, f) => readFileSync(join(base, f), 'utf8');
const cssSito = leggi(sito, 'menu-page.css');
const renderSito = leggi(sito, 'lib/render-menu.js');
const cssPortale = leggi(portale, 'src/app/globals.css');
const venues = leggi(portale, 'src/lib/venues.ts');
const brand = leggi(portale, 'src/lib/menuBrand.ts');
const anteprima =
  leggi(portale, 'src/components/menus/MenuPreview.tsx') +
  leggi(portale, 'src/components/menus/DishDetailSheet.tsx');

const problemi = [];
const nota = (titolo, dettaglio) => problemi.push({ titolo, dettaglio });

// ── 1. I fattori della grandezza e dell'interlinea ────────────────
// Di qua stanno in un Record, di là in un oggetto letterale dentro il
// renderer. Si confrontano i numeri, non la forma.
function numeriDa(testo, regex) {
  const m = {};
  for (const [, chiave, valore] of testo.matchAll(regex)) m[chiave] = Number(valore);
  return m;
}
const scalaPortale = numeriDa(venues, /(compact|normal|roomy):\s*([\d.]+),/g);
const scalaSito = { normal: 1, ...numeriDa(renderSito, /(compact|roomy):\s*([\d.]+)/g) };
const ariaPortale = numeriDa(venues, /(tight|normal|airy):\s*([\d.]+),/g);
const ariaSito = { normal: 1, ...numeriDa(renderSito, /(tight|airy):\s*([\d.]+)/g) };

function confrontaNumeri(nome, a, b) {
  for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
    if (a[k] !== b[k]) nota(nome, `${k}: portale ${a[k]} · sito ${b[k]}`);
  }
}
confrontaNumeri('Fattori della grandezza dei testi', scalaPortale, scalaSito);
confrontaNumeri('Fattori dell’interlinea', ariaPortale, ariaSito);

// ── 2. La tavolozza ───────────────────────────────────────────────
// Il database tiene il CODICE del colore; la tinta la scrivono tutt'e due.
// Un colore aggiunto solo di qua manda quel locale sul colore di ripiego,
// senza nessun errore da nessuna parte.
function tinteDa(testo, regex) {
  const m = {};
  for (const [, chiave, valore] of testo.matchAll(regex)) m[chiave] = valore.toUpperCase();
  return m;
}
// Di qua è una fila di oggetti ({ code, hex, … }), di là una mappa codice→tinta.
const tintePortale = tinteDa(brand, /code:\s*'(\w+)',\s*hex:\s*'(#[0-9A-Fa-f]{6})'/g);
const tinteSito = tinteDa(renderSito, /^\s+(\w+):\s*'(#[0-9A-Fa-f]{6})'/gm);
for (const k of new Set([...Object.keys(tintePortale), ...Object.keys(tinteSito)])) {
  if (tintePortale[k] !== tinteSito[k]) {
    nota('Tavolozza dei colori', `${k}: portale ${tintePortale[k]} · sito ${tinteSito[k]}`);
  }
}

// ── 3. Le regole CSS che le due copie condividono ─────────────────
// Da quando l'impaginazione a blocco è scritta in CSS in tutt'e due (e non
// più con un ramo React di qua), queste regole si possono confrontare alla
// lettera. Si guardano SOLO i selettori presenti in tutt'e due: ogni foglio
// ha anche roba sua.
function regole(css) {
  const mappa = {};
  for (const [, sel, corpo] of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const chiave = sel.replace(/\/\*[\s\S]*?\*\//g, '').trim().replace(/\s+/g, ' ');
    // I passi di un'animazione ("from", "to", "50%") non sono selettori: due
    // fogli possono averne di omonimi dentro @keyframes diversi, e
    // confrontarli vorrebbe dire confrontare due animazioni che non
    // c'entrano niente.
    if (!chiave || chiave.startsWith('@') || /^(from|to|[\d.]+%)$/.test(chiave)) continue;
    mappa[chiave] = corpo
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .split(';')
      .map((d) => d.trim().replace(/\s+/g, ' '))
      .filter(Boolean)
      .sort()
      .join('; ');
  }
  return mappa;
}
const rSito = regole(cssSito);
const rPortale = regole(cssPortale);
const condivise = Object.keys(rPortale).filter((k) => k in rSito);
for (const sel of condivise) {
  if (rPortale[sel] !== rSito[sel]) {
    nota(`Regola «${sel}»`, `portale: ${rPortale[sel]}\n              sito:    ${rSito[sel]}`);
  }
}

// ── 4. Le misure di base, RUOLO PER RUOLO ────────────────────────
// Devono essere le stesse: la cornice del telefono è un po' più stretta di un
// telefono vero, ma uno sconto diverso per ogni ruolo faceva giudicare al
// ristoratore proporzioni che il cliente non vede (successo davvero, e per
// mesi).
//
// ⚠️ SI CONFRONTA RUOLO PER RUOLO E NON L'INSIEME DEI NUMERI. Il primo
// tentativo raccoglieva tutte le misure dei due fogli e le confrontava come
// insiemi: non vedeva niente, perché portando il nome del piatto da 16 a 15
// il 16 restava comunque (è anche il prezzo) e il 15 c'era già (è la
// descrizione del dettaglio). Un controllo che passa quando non dovrebbe è
// peggio che non averlo.
//
// I ruoli confrontabili sono quelli che portano lo stesso nome di classe in
// tutt'e due le copie — cioè la riga del piatto, che è la parte che si ripete
// per ogni voce della carta e dove una divergenza si vede di più. Le
// intestazioni e il dettaglio non hanno (ancora) nomi condivisi: chi gliene
// dà uno, li aggiunga qui sotto.
const RUOLI = ['menu-item-name', 'menu-price', 'menu-item-desc', 'menu-item-note'];

// Sul sito: la misura dentro la regola che ha quel selettore, ignorando le
// varianti (.layout-block .menu-price), che il confronto delle regole copre
// già per conto suo.
function misuraSito(classe) {
  const corpo = rSito[`.${classe}`];
  const m = corpo && corpo.match(/font-size: calc\((\d+(?:\.\d+)?)px \* var\(--ms/);
  return m ? m[1] : null;
}
// Nel portale: la misura scritta nella stessa stringa di classi che contiene
// quel nome. `class="menu-item-name min-w-0 … text-[calc(16px*var(--ms))]"`.
function misuraPortale(classe) {
  for (const [, stringa] of anteprima.matchAll(/className={?`?"?([^"`]*)/g)) {
    if (!stringa.includes(classe)) continue;
    const m = stringa.match(/\[calc\((\d+(?:\.\d+)?)px\*var\(--ms\)\)\]/);
    if (m) return m[1];
  }
  return null;
}
for (const classe of RUOLI) {
  const a = misuraPortale(classe);
  const b = misuraSito(classe);
  if (a === null || b === null) {
    nota(`Misura di «.${classe}»`, `non trovata ${a === null ? 'nel portale' : 'sul sito'}: il controllo non la sta guardando`);
  } else if (a !== b) {
    nota(`Misura di «.${classe}»`, `portale ${a}px · sito ${b}px`);
  }
}

// ── L'esito ───────────────────────────────────────────────────────
const guardato = [
  'i fattori di grandezza e interlinea',
  'la tavolozza dei colori',
  `${condivise.length} regole CSS condivise`,
  `le misure di ${RUOLI.length} ruoli della riga del piatto`,
].join(', ');

if (problemi.length === 0) {
  console.log('Le due copie del menù al tavolo dicono la stessa cosa.');
  console.log(`Confrontati: ${guardato}.`);
  console.log('Quello che NON guarda: le intestazioni, il dettaglio del piatto e ogni comportamento (il popup, le freccine, il filtro).');
  process.exit(0);
}
console.log(`Le due copie divergono in ${problemi.length} punt${problemi.length === 1 ? 'o' : 'i'}:\n`);
for (const { titolo, dettaglio } of problemi) console.log(`  ${titolo}\n    ${dettaglio}\n`);
console.log('Se una differenza è voluta, va scritta in ATTESE dentro questo script.');
process.exit(1);
