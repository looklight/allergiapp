import { Platform } from 'react-native';
import type { AppTheme } from '../../constants/theme';
import type { Restaurant, RestaurantPin } from '../../services/restaurantService';
import { getExpandedCoverage } from '../../constants/restrictionImplications';

// ---------------------------------------------------------------------------
// Region type
// ---------------------------------------------------------------------------

export type Region = {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
};

// ---------------------------------------------------------------------------
// Props shared across the map sub-tree
// ---------------------------------------------------------------------------

export type RestaurantMapProps = {
  restaurants: Restaurant[];
  allPins?: RestaurantPin[];
  centerOn?: { latitude: number; longitude: number; sheetFraction: number; latDelta?: number } | null;
  hasUserLocation?: boolean;
  onRegionChangeComplete?: (region: Region) => void;
  /** Scatta UNA volta quando la mappa è viva (onMapReady + primo layout):
   *  momento in cui è sicuro applicare un centraggio programmatico e aspettarsi
   *  che il caricamento pin/regione si comporti come sulla mappa idle. */
  onReady?: () => void;
  selectedId?: string | null;
  /** Full Restaurant object for the selected pin — ensures the overlay can
   *  render even if the restaurant is outside the current viewport/filter. */
  selectedRestaurant?: Restaurant | null;
  onDeselect?: () => void;
  showMatchInfo?: boolean;
  onRestaurantPress?: (id: string) => void;
  favoriteIds?: Set<string>;
  favoriteRestaurants?: Map<string, Restaurant>;
  /** Badge per le liste custom: restaurantId → emoji (string) | null (bookmark).
   *  Assenza dalla mappa = non salvato in nessuna lista custom. La precedenza
   *  emoji > cuore > bookmark è applicata dal pin. */
  customSymbols?: Map<string, string | null>;
  /** Ristoranti salvati nelle liste custom, sempre visibili sulla mappa (come i
   *  preferiti) anche fuori dal viewport corrente. */
  savedRestaurants?: Map<string, Restaurant>;
  compassOffset?: { x: number; y: number };
  /** Mappa a tutto schermo della home: abilita su Android il mapPadding che
   *  tiene conto della search bar (top) e del detail sheet (~55% bottom).
   *  NON va usato per mappe embedded ad altezza fissa (es. mini-mappa profilo):
   *  lì quel padding supererebbe l'altezza della mappa e scentrerebbe i pin. */
  fullScreenChrome?: boolean;
  /** Filtri allergenici attivi dell'utente — per calcolo coverage lato client sui pin */
  userAllergens?: string[];
  /** Filtri dietetici attivi dell'utente — per calcolo coverage lato client sui pin */
  userDiets?: string[];
};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** latitudeDelta above which markers render as dots instead of pins */
export const ZOOM_PIN_THRESHOLD = 0.2;

/** Rampa di taglia dei pallini: sotto questo latitudeDelta (ma sopra
 *  ZOOM_PIN_THRESHOLD) i pallini usano il PNG grande (14pt vs 10pt), così il
 *  salto visivo pallino→pin alla soglia è più morbido. Solo swap di icona
 *  statica: nessuna cattura bitmap coinvolta. */
export const DOT_LARGE_THRESHOLD = 0.7;

/** Mezzo-span del viewport allargato in multipli del delta regione: i pin
 *  entro centro ± delta×1.5 contano come "in viewport" (mezzo schermo visibile
 *  + uno schermo intero di margine per lato). Il margine fa sì che il flip
 *  pallino→pin avvenga fuori schermo durante il pan, non sotto gli occhi. */
export const PIN_VIEWPORT_MARGIN = 1.5;

/** Tetto di pin completi renderizzabili insieme (regime pin). I pin completi
 *  sono view-marker con cattura bitmap: il costo dev'essere proporzionale allo
 *  schermo, mai al dataset. In aree oltre il tetto diventano pin i più vicini
 *  al centro; gli altri restano pallini finché non si zooma ancora. */
export const MAX_FULL_PINS = 300;

/** Vista di default (nessuna posizione condivisa): Italia al centro, ma scala
 *  europea per mostrare la copertura internazionale dei locali (~62% dei dati è
 *  in Europa, distribuiti su più città → cluster multipli "vivi"). Il
 *  `latitudeDelta` è da calibrare a runtime (react-native-maps riadatta la
 *  region all'aspect ratio dello schermo). */
export const DEFAULT_REGION: Region = {
  latitude: 42.0,
  longitude: 12.5,
  latitudeDelta: 22,
  longitudeDelta: 22,
};

export const FIT_EDGE_PADDING = { top: 80, right: 50, bottom: 50, left: 50 };

/** Delta minimo (gradi, ~5.5 km) usato quando i punti da inquadrare coincidono
 *  o sono molto vicini: fitToCoordinates zoomerebbe al massimo e si perderebbe
 *  il contesto geografico (non si capisce dove si trova). Sotto questo span
 *  inquadriamo una regione con questo delta centrata sui punti. */
export const MIN_FIT_DELTA = 0.05;

// ---------------------------------------------------------------------------
// Z-order marker vs pallino di posizione (iOS)
// ---------------------------------------------------------------------------

/** Strategia di z-order dei marker su iOS rispetto al pallino blu di posizione
 *  nativo (`showsUserLocation` → MKUserLocation).
 *
 *  Su iOS lo `zIndex` di un Marker mappa sulla `zPosition` del layer. Fino a
 *  1.2.0 i pin NON avevano zIndex su iOS → MapKit teneva il pallino blu sopra da
 *  solo (default stabile). Da 1.3.0 (commit ea8173a) i pin hanno zIndex 0..3
 *  anche su iOS per ordinare colorati sopra i grigi: effetto collaterale, i pin
 *  salgono sopra il pallino blu e lo nascondono.
 *
 *  - 'below-user' (B): zIndex NEGATIVI su iOS → i pin restano ordinati tra loro
 *    (grigi sotto, colorati sopra) ma tutti sotto il pallino blu. Recupera sia
 *    la gerarchia dei pin sia la visibilità della posizione. Si appoggia a come
 *    MapKit compone una zPosition negativa col dot nativo (non documentato) →
 *    DA VERIFICARE SU DEVICE.
 *  - 'native' (A): nessuno zIndex su iOS → torna al comportamento 1.2.0, pallino
 *    blu sopra garantito ma ordine tra pin non deterministico (i grigi restano
 *    comunque recessi via opacità, v. markerWrapMuted). Fallback sicuro.
 *
 *  In caso di problemi con B, per passare ad A cambiare SOLO questa costante. */
export const IOS_MARKER_Z_STRATEGY: 'below-user' | 'native' = 'below-user';

/** Offset che porta i valori logici di priorità (0..3) sotto lo zero su iOS in
 *  strategia 'below-user', preservandone l'ordine relativo. Ampio a sufficienza
 *  da restare negativo per ogni priorità prevista. */
const IOS_Z_BELOW_USER_OFFSET = 100;

/** Props zIndex per un marker data la sua priorità logica (0 grigi/non valutati
 *  … 2 ambra … 3 salvati/verdi). Unico punto che decide lo z-order per
 *  piattaforma:
 *  - Android: sempre il valore logico (il pallino blu è su un layer Google Maps
 *    a parte, sempre sopra → nessun conflitto con i marker).
 *  - iOS: dipende da IOS_MARKER_Z_STRATEGY (v. sopra). */
export function markerZProps(logicalZ: number): { zIndex?: number } {
  if (Platform.OS === 'android') return { zIndex: logicalZ };
  if (IOS_MARKER_Z_STRATEGY === 'native') return {};
  return { zIndex: logicalZ - IOS_Z_BELOW_USER_OFFSET };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function isValidCoord(lat: number, lng: number): boolean {
  return Number.isFinite(lat) && Number.isFinite(lng);
}

/** True se la coordinata cade nel viewport allargato (v. PIN_VIEWPORT_MARGIN). */
export function withinPinViewport(vp: Region, lat: number, lng: number): boolean {
  return (
    Math.abs(lat - vp.latitude) <= vp.latitudeDelta * PIN_VIEWPORT_MARGIN &&
    Math.abs(lng - vp.longitude) <= vp.longitudeDelta * PIN_VIEWPORT_MARGIN
  );
}

/** Prossimo valore dello stato pinViewport (la regione che delimita quali
 *  marker diventano pin completi). null nel regime pallini: lì il viewport non
 *  serve e lo stato non deve aggiornarsi a ogni pan (niente re-render inutili
 *  a zoom largo). Nel regime pin, ritorna `prev` per micro-spostamenti sotto
 *  1/8 del delta: l'insieme dei pin nel viewport allargato non cambia in modo
 *  significativo e markerElements non va ricalcolato. */
export function nextPinViewport(prev: Region | null, region: Region): Region | null {
  // +0.05 = stessa banda d'isteresi di isDotZoom: dentro la banda il regime è
  // ancora (o già) pallini, il viewport tornerà utile appena sotto.
  if (region.latitudeDelta > ZOOM_PIN_THRESHOLD + 0.05) return null;
  if (prev) {
    const grid = prev.latitudeDelta / 8;
    const zoomRatio = region.latitudeDelta / Math.max(prev.latitudeDelta, 1e-9);
    if (
      Math.abs(region.latitude - prev.latitude) < grid &&
      Math.abs(region.longitude - prev.longitude) < grid &&
      zoomRatio > 0.9 && zoomRatio < 1.1
    ) return prev;
  }
  return region;
}

/** Coverage color for the match badge on pins/dots. Pure: il tema viene passato
 *  dal componente chiamante (mapConstants non può usare hook). */
export function coverageColor(covered: number, total: number, theme: AppTheme): string {
  if (total === 0 || covered === 0) return theme.colors.textDisabled;
  if (covered >= total) return theme.colors.success;
  return theme.colors.coverageMedium;
}

/** Match client-side esigenze↔coperture del locale, implication-aware: stessa
 *  semantica della proiezione server (CTE implications). Fallback per pin e
 *  overlay selezione quando il dettaglio Restaurant non è (ancora) in cache. */
export function clientCoverage(
  supportedAllergens: string[] | undefined,
  supportedDiets: string[] | undefined,
  userAllergens: string[] | undefined,
  userDiets: string[] | undefined,
): { covered: number; total: number } {
  const total = (userAllergens?.length ?? 0) + (userDiets?.length ?? 0);
  let covered = 0;
  if (total > 0 && (supportedAllergens?.length || supportedDiets?.length)) {
    const expanded = getExpandedCoverage([
      ...(supportedAllergens ?? []),
      ...(supportedDiets ?? []),
    ]);
    for (const a of (userAllergens ?? [])) if (expanded.has(a)) covered++;
    for (const d of (userDiets ?? [])) if (expanded.has(d)) covered++;
  }
  return { covered, total };
}
