/**
 * Casi limite della griglia di diradamento pallini (components/map/mapGrid.ts).
 *
 * Il progetto non ha un test runner: e' uno script node autonomo, da lanciare
 * a mano quando si tocca mapGrid.ts.
 *
 *   node --experimental-strip-types scripts/test-map-grid.mjs
 *
 * Quello che si prova qui e' UNA cosa sola, ma e' la cosa che affossa la
 * mappa se sbagliata: che a parita' di dati il risultato non cambi. Un
 * rappresentante che si scambia tra due render = un marker che sparisce e uno
 * che compare = il churn che aveva affossato supercluster.
 */
import {
  selectDots,
  quantizedZoom,
  gridCellDeg,
  nextDotView,
  thinPins,
  nearestToCenter,
  withinViewport,
  DOTS_PER_SCREEN_HEIGHT,
} from '../components/map/mapGrid.ts';

let failed = 0;

function check(label, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) {
    failed++;
    console.error(`FAIL  ${label}\n      atteso ${JSON.stringify(expected)}, ottenuto ${JSON.stringify(actual)}`);
  } else {
    console.log(`ok    ${label}`);
  }
}

// --- zoom quantizzato: la banda morta e' l'anti-churn ---
check('zoom mondo intero', quantizedZoom(360, null), 0);
check('zoom vista Europa (delta 22)', quantizedZoom(22, null), 4);
check('zoom citta (delta 0.15)', quantizedZoom(0.15, null), 11);
check('dentro la banda resta fermo', quantizedZoom(20, 4), 4);
check('pinch lento non fa oscillare', quantizedZoom(26, 4), 4);
check('oltre la banda scatta', quantizedZoom(11, 4), 5);
check('salto di due livelli', quantizedZoom(2.7, 4), 7);
check('delta zero non esplode', Number.isFinite(quantizedZoom(0, null)), true);

// --- cella: dipende SOLO dal livello, mai dal delta corrente ---
check('cella al livello 4', gridCellDeg(4) === 360 / 16 / DOTS_PER_SCREEN_HEIGHT, true);
check('un livello in piu = cella meta', gridCellDeg(5) * 2 === gridCellDeg(4), true);

// --- nextDotView: sotto soglia siamo nel regime pin ---
const R = (lat, lng, d) => ({ latitude: lat, longitude: lng, latitudeDelta: d, longitudeDelta: d });
// Un solo percorso a ogni zoom: sotto la soglia dei pin non si spegne piu'
// niente, la cella diventa cosi' piccola che il diradamento non toglie nulla
// da se'. Un ramo in meno, e con lui la giuntura che ospitava un difetto.
const seme = { region: R(42, 12.5, 22), zoom: quantizedZoom(22, null) };
check('lo zoom del seme', seme.zoom, 4);
const v0 = nextDotView(seme, R(45, 9, 22));
check('stessa scala: la vista non cambia livello', v0.zoom, 4);
check('in citta la vista resta valida', nextDotView(seme, R(45, 9, 0.1)).zoom, 12);
check('pan piccolo NON cambia la vista', nextDotView(v0, R(45.5, 9.5, 22)) === v0, true);
check('zoom dentro la banda NON cambia la vista', nextDotView(v0, R(45, 9, 20)) === v0, true);
check('pan grande cambia la vista', nextDotView(v0, R(52, 9, 22)) !== v0, true);
check('pan grande NON cambia il livello', nextDotView(v0, R(52, 9, 22)).zoom, 4);

// --- thinPins: un rappresentante per cella, deterministico ---
const pins = [
  { id: 'c', latitude: 45.01, longitude: 9.01 },
  { id: 'a', latitude: 45.02, longitude: 9.02 },
  { id: 'b', latitude: 45.03, longitude: 9.03 },
  { id: 'z', latitude: 48.00, longitude: 9.00 },
];
const ids = ps => ps.map(p => p.id).sort();
const pari = () => false;
check('celle diverse sopravvivono entrambe', ids(thinPins(pins, 1, pari)), ['a', 'z']);
check('a parita vince l id piu piccolo', ids(thinPins(pins, 1, pari)), ['a', 'z']);
check('il criterio batte l id', ids(thinPins(pins, 1, a => a.id === 'c')), ['c', 'z']);
// L'ordine di iterazione della pinCache cambia a ogni merge di fetch: il
// risultato non deve dipenderne, o i marker si scambiano di posto tra render.
check('ordine di ingresso irrilevante',
  ids(thinPins([...pins].reverse(), 1, pari)), ids(thinPins(pins, 1, pari)));
check('cella piccola non dirada nulla', thinPins(pins, 0.001, pari).length, 4);
check('cellDeg non valido = nessun diradamento', thinPins(pins, 0, pari).length, 4);
check('coordinate non valide scartate',
  thinPins([{ id: 'x', latitude: NaN, longitude: 9 }], 1, pari).length, 0);
// La griglia e' agganciata al mondo: due punti a cavallo del confine di cella
// restano separati comunque li si guardi.
check('griglia ancorata al mondo, non allo schermo',
  ids(thinPins([
    { id: 'p', latitude: 0.9, longitude: 0.5 },
    { id: 'q', latitude: 1.1, longitude: 0.5 },
  ], 1, pari)), ['p', 'q']);

// --- le due chiavi: copertura, POI premium (vincolo di prodotto) ---
// Il premium compra visibilita', mai colore: non deve MAI poter nascondere un
// locale piu' compatibile di lui, o l'areola diventerebbe grigia coprendo un
// verde. Se questo caso si rompe, si e' rotto il vincolo, non un dettaglio.
const cell = [
  { id: 'verde',   latitude: 45.0, longitude: 9.0, cov: 1.0, premium: false },
  { id: 'premium', latitude: 45.1, longitude: 9.1, cov: 0.5, premium: true },
  { id: 'grigio',  latitude: 45.2, longitude: 9.2, cov: 0.5, premium: false },
];
const better = (a, b) => (a.cov !== b.cov ? a.cov > b.cov : !!a.premium && !b.premium);
check('il premium NON batte una copertura migliore',
  ids(thinPins(cell, 1, better)), ['verde']);
check('a parita di copertura vince il premium',
  ids(thinPins(cell.filter(p => p.cov === 0.5), 1, better)), ['premium']);
check('senza filtri (coperture pari) vince il premium',
  ids(thinPins(cell.map(p => ({ ...p, cov: 0 })), 1, better)), ['premium']);

// --- tetto: i piu vicini al centro, con pareggio deterministico ---
const many = Array.from({ length: 10 }, (_, i) => ({ id: `p${i}`, latitude: 45 + i, longitude: 9 }));
check('sotto il tetto non tocca nulla', nearestToCenter(many, R(45, 9, 10), 20).length, 10);
check('taglia al tetto', nearestToCenter(many, R(45, 9, 10), 3).length, 3);
check('tiene i piu vicini al centro', ids(nearestToCenter(many, R(45, 9, 10), 3)), ['p0', 'p1', 'p2']);

// --- viewport ---
check('dentro il margine', withinViewport(R(45, 9, 2), 45.5, 9.5, 1), true);
check('fuori dal margine', withinViewport(R(45, 9, 2), 55, 9, 1), false);
check('margine piu largo include di piu', withinViewport(R(45, 9, 2), 48, 9, 2.5), true);

// --- gli invarianti detti a parole dall'utente, fissati qui ---
// Questi tre sono la ragione per cui la selezione e' stata portata dentro una
// funzione pura il 2026-09-05: prima viveva nel componente, dove nessun test la
// raggiungeva, ed e' esattamente li che si erano infilati tre difetti di fila.

// Un pugno di locali sparsi, con un "migliore" deterministico.
const mondo = [];
for (let i = 0; i < 400; i++) {
  mondo.push({
    id: `r${String(i).padStart(3, '0')}`,
    // distribuzione volutamente disomogenea: grappoli, come le citta' vere
    latitude: 45 + (i % 20) * 0.11 + (i % 3) * 0.01,
    longitude: 9 + Math.floor(i / 20) * 0.13 + (i % 5) * 0.01,
  });
}
const sel = (lat, lng, dLat, zoom, max = 1000) => selectDots({
  pins: mondo,
  view: { region: R(lat, lng, dLat), zoom },
  margin: 1.5,
  maxDots: max,
  better: () => false,
});
const inVista = (id, lat, lng, dLat) => {
  const p = mondo.find(x => x.id === id);
  return withinViewport(R(lat, lng, dLat), p.latitude, p.longitude, 1.5);
};

// 1. INGRANDENDO SI AGGIUNGE, MAI SI TOGLIE.
let persi = [];
for (let z = 4; z < 12; z++) {
  const largo = sel(45.9, 10, 3, z);
  const stretto = sel(45.9, 10, 3, z + 1);
  for (const id of largo) if (!stretto.has(id) && inVista(id, 45.9, 10, 3)) persi.push(`z${z}:${id}`);
}
check('ingrandendo nessun pallino sparisce', persi, []);

// 2. ALLARGANDO RESTANO I RAPPRESENTANTI (l'insieme si restringe, non cambia natura).
// z=3 ha celle da 0.375 gradi, piu' larghe della spaziatura dei locali finti
// (0.11): li' la fusione avviene davvero. A z=9 ognuno sta nella sua cella.
const dentro = sel(45.9, 10, 3, 9);
const fuori = sel(45.9, 10, 3, 3);
check('allargando l insieme e un sottoinsieme', [...fuori].every(id => dentro.has(id)), true);
check('allargando ce ne sono meno', fuori.size < dentro.size, true);

// 3. STABILITA': la stessa vista da sempre lo stesso risultato.
check('due letture identiche coincidono',
  [...sel(45.9, 10, 3, 8)].sort(), [...sel(45.9, 10, 3, 8)].sort());

// Il tetto non deve poter rompere l'invariante 1 nel campo visibile.
check('sotto il tetto si taglia solo lontano dal centro',
  sel(45.9, 10, 3, 10, 50).size, 50);

console.log(failed === 0 ? '\nTutti i casi passano.' : `\n${failed} casi FALLITI.`);
process.exit(failed === 0 ? 0 : 1);
