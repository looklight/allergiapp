/**
 * mapGrid — geometria pura del diradamento pallini (MAP_SCALING.md §0-ter).
 *
 * Nessun import da react-native: questo modulo si carica da uno script node
 * (`scripts/test-map-grid.mjs`), che è il motivo per cui vive separato da
 * `mapConstants.ts`. Tutto qui dentro è puro — stesse entrate, stesse uscite,
 * nessuno stato — perché è la parte in cui un errore si vede come marker che
 * ballano, ed è l'unica difesa che abbiamo prima della dev build.
 *
 * `mapConstants.ts` ri-esporta tutto: il resto della mappa continua a importare
 * da lì.
 */

export type Region = {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
};

/** latitudeDelta above which markers render as dots instead of pins */
export const ZOOM_PIN_THRESHOLD = 0.2;

export function isValidCoord(lat: number, lng: number): boolean {
  return Number.isFinite(lat) && Number.isFinite(lng);
}

// ---------------------------------------------------------------------------
// Diradamento a zoom largo (MAP_SCALING.md §0-ter, passo A)
// ---------------------------------------------------------------------------

/** Interruttore del diradamento. Spegnendolo si torna esattamente al
 *  comportamento precedente (ogni pin della cache = un marker montato): serve
 *  come uscita di sicurezza se in mano il churn si rivelasse peggio del lag,
 *  senza dover rifare la build. Stesso ruolo di CLUSTERING_ENABLED. */
export const THINNING_ENABLED = true;

/** Quanti pallini stanno in larghezza di schermata a regime diradato: da qui
 *  esce il passo della griglia. A 22 il passo vale ~18pt su un telefono da
 *  390pt, contro i 10-14pt del PNG del pallino → i pallini si sfiorano senza
 *  impastarsi, e la mappa non si svuota. */
export const DOTS_ACROSS_SCREEN = 22;

/** Tetto di marker montati nel regime pallini, dopo il diradamento. La griglia
 *  da sola già limita (~DOTS_ACROSS_SCREEN², cioè ~480 celle a schermo), questo
 *  è la cintura per le forme di viewport anomale (schermi molto allungati,
 *  mini-mappe). Oltre il tetto sopravvivono i più vicini al centro. */
export const MAX_DOTS = 500;

/** Mezzo-span del viewport di RENDER nel regime pallini, in multipli del delta
 *  regione: mezzo schermo visibile più uno intero di margine per lato, così i
 *  marker entrano ed escono fuori campo durante il pan.
 *
 *  Tarato sui dati veri (set di prova: la cache dopo un giro Milano→Europa,
 *  1680 pin). A 2.5 si montano marker su un'area 25 volte lo schermo e a zoom
 *  regionale si sbatte contro MAX_DOTS: a decidere chi resta diventa la
 *  distanza dal centro invece della griglia, e si perde l'equità geografica.
 *  A 1.5 la griglia è sempre lei a decidere (max 479 marker su tutte le viste
 *  provate) e il tetto torna a essere la sola assicurazione che deve essere.
 *  Coincide col margine dei pin, ma resta una manopola separata: i due regimi
 *  hanno costi per-marker diversi e possono divergere. */
export const DOT_VIEWPORT_MARGIN = 1.5;

/** Stato del regime pallini: la regione che delimita cosa si renderizza, più
 *  il livello di zoom QUANTIZZATO che decide il passo della griglia. I due
 *  viaggiano insieme perché cambiano insieme. */
export type DotView = { region: Region; zoom: number };

/** Livello di zoom intero (scala slippy-map: 0 = mondo intero) con banda morta.
 *  La quantizzazione è il cuore dell'anti-churn: il passo della griglia — e
 *  quindi CHI rappresenta la sua cella — dipende solo da questo intero, non
 *  dal delta continuo. Finché il livello non cambia, zoomare di poco o pannare
 *  non sposta un solo marker.
 *
 *  La banda di 0.7 attorno al livello corrente vuol dire che serve un cambio
 *  di scala di ~1.6× per far scattare il gradino: durante un pinch lento non
 *  si oscilla avanti e indietro (era il difetto di supercluster, che
 *  ricalcolava su ogni evento di regione). */
export function quantizedZoom(latitudeDelta: number, prev: number | null): number {
  const raw = Math.log2(360 / Math.max(latitudeDelta, 1e-9));
  if (prev !== null && Math.abs(raw - prev) < 0.7) return prev;
  return Math.round(raw);
}

/** Lato della cella in gradi per un livello di zoom quantizzato. Dipende SOLO
 *  dal livello, mai dal delta corrente: è ciò che rende la griglia ancorata al
 *  mondo e non allo schermo. */
export function gridCellDeg(zoom: number): number {
  return 360 / Math.pow(2, zoom) / DOTS_ACROSS_SCREEN;
}

/** True se la coordinata cade nel viewport allargato di `margin` mezzi-delta. */
export function withinViewport(vp: Region, lat: number, lng: number, margin: number): boolean {
  return (
    Math.abs(lat - vp.latitude) <= vp.latitudeDelta * margin &&
    Math.abs(lng - vp.longitude) <= vp.longitudeDelta * margin
  );
}

/** Prossimo valore di DotView. null nel regime pin (lì comanda pinViewport).
 *  Ritorna `prev` INVARIATO quando il livello di zoom non è cambiato e lo
 *  spostamento è sotto 1/4 del delta: nessun re-render, nessun marker che si
 *  muove. Con la griglia ancorata al mondo, anche un pan grande non cambia i
 *  rappresentanti — cambia solo quali celle sono a schermo. */
export function nextDotView(prev: DotView | null, region: Region): DotView | null {
  // Stessa banda d'isteresi di isDotZoom: sotto la soglia siamo nel regime pin.
  if (region.latitudeDelta < ZOOM_PIN_THRESHOLD - 0.05) return null;
  const zoom = quantizedZoom(region.latitudeDelta, prev?.zoom ?? null);
  if (prev && prev.zoom === zoom) {
    const grid = prev.region.latitudeDelta / 4;
    if (
      Math.abs(region.latitude - prev.region.latitude) < grid &&
      Math.abs(region.longitude - prev.region.longitude) < grid
    ) return prev;
  }
  return { region, zoom };
}

/** Il minimo che serve al diradamento per lavorare su un pin. */
export type ThinnablePin = { id: string; latitude: number; longitude: number };

/** Un rappresentante per cella di griglia.
 *
 *  `rank` più alto vince; a parità decide l'id (confronto stabile) — così il
 *  risultato NON dipende dall'ordine di iterazione della pinCache, che cambia
 *  a ogni merge di fetch. Determinismo = nessun marker che si scambia di posto
 *  tra due render con gli stessi dati.
 *
 *  La cella si ricava dividendo le coordinate assolute per `cellDeg`: la
 *  griglia è agganciata al meridiano/parallelo zero, non allo schermo, quindi
 *  pannare non la fa scorrere sotto i pin. */
export function thinPins<T extends ThinnablePin>(
  pins: readonly T[],
  cellDeg: number,
  rank: (pin: T) => number,
): T[] {
  if (!(cellDeg > 0)) return pins.slice();
  const best = new Map<string, { pin: T; r: number }>();
  for (const p of pins) {
    if (!isValidCoord(p.latitude, p.longitude)) continue;
    const key = `${Math.floor(p.latitude / cellDeg)}:${Math.floor(p.longitude / cellDeg)}`;
    const r = rank(p);
    const cur = best.get(key);
    if (!cur || r > cur.r || (r === cur.r && p.id < cur.pin.id)) best.set(key, { pin: p, r });
  }
  const out: T[] = [];
  for (const { pin } of best.values()) out.push(pin);
  return out;
}

/** Taglia a `max` tenendo i più vicini al centro del viewport. Stessa metrica
 *  normalizzata del gate dei pin (asse peggiore): ordina "verso il centro"
 *  senza trigonometria. */
export function nearestToCenter<T extends ThinnablePin>(pins: T[], vp: Region, max: number): T[] {
  if (pins.length <= max) return pins;
  const scored = pins.map(p => ({
    p,
    d: Math.max(
      Math.abs(p.latitude - vp.latitude) / Math.max(vp.latitudeDelta, 1e-9),
      Math.abs(p.longitude - vp.longitude) / Math.max(vp.longitudeDelta, 1e-9),
    ),
  }));
  scored.sort((a, b) => (a.d - b.d) || (a.p.id < b.p.id ? -1 : 1));
  scored.length = max;
  return scored.map(s => s.p);
}
