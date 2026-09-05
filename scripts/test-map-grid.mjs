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
  quantizedZoom,
  gridCellDeg,
  nextDotView,
  thinPins,
  nearestToCenter,
  withinViewport,
  DOTS_ACROSS_SCREEN,
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
check('cella al livello 4', gridCellDeg(4) === 360 / 16 / DOTS_ACROSS_SCREEN, true);
check('un livello in piu = cella meta', gridCellDeg(5) * 2 === gridCellDeg(4), true);

// --- nextDotView: sotto soglia siamo nel regime pin ---
const R = (lat, lng, d) => ({ latitude: lat, longitude: lng, latitudeDelta: d, longitudeDelta: d });
check('regime pin -> null', nextDotView(null, R(45, 9, 0.1)), null);
const v0 = nextDotView(null, R(45, 9, 22));
check('primo ingresso costruisce la vista', v0.zoom, 4);
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

console.log(failed === 0 ? '\nTutti i casi passano.' : `\n${failed} casi FALLITI.`);
process.exit(failed === 0 ? 0 : 1);
