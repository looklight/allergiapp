import { theme } from '../../constants/theme';
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
  compassOffset?: { x: number; y: number };
  /** Incrementare questo valore per fare fit della mappa sui ristoranti filtrati correnti. */
  fitBounds?: number;
};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** latitudeDelta above which markers render as dots instead of pins */
export const ZOOM_PIN_THRESHOLD = 0.2;

export const DEFAULT_REGION: Region = {
  latitude: 41.9,
  longitude: 12.5,
  latitudeDelta: 8,
  longitudeDelta: 8,
};

export const FIT_EDGE_PADDING = { top: 80, right: 50, bottom: 50, left: 50 };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function isValidCoord(lat: number, lng: number): boolean {
  return Number.isFinite(lat) && Number.isFinite(lng);
}

/** Coverage color for the match badge on pins/dots */
export function coverageColor(covered: number, total: number): string {
  if (total === 0 || covered === 0) return theme.colors.textDisabled;
  if (covered >= total) return theme.colors.success;
  return '#F9A825';
}
