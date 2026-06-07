import type { AppTheme } from '../../constants/theme';
import type { Restaurant, RestaurantPin } from '../../services/restaurantService';

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
// Helpers
// ---------------------------------------------------------------------------

export function isValidCoord(lat: number, lng: number): boolean {
  return Number.isFinite(lat) && Number.isFinite(lng);
}

/** Coverage color for the match badge on pins/dots. Pure: il tema viene passato
 *  dal componente chiamante (mapConstants non può usare hook). */
export function coverageColor(covered: number, total: number, theme: AppTheme): string {
  if (total === 0 || covered === 0) return theme.colors.textDisabled;
  if (covered >= total) return theme.colors.success;
  return theme.colors.coverageMedium;
}
