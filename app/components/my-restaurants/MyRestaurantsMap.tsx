import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import RestaurantMap from '../../../components/map/RestaurantMap';
import { theme } from '../../../constants/theme';
import type { Restaurant } from '../../../services/restaurant.types';

// ─── ⚠️ TEMPORANEO: coordinate di test ───────────────────────────────────────
// Solo per valutare la UI della mappa finché non abbiamo lat/lng reali per tutti
// gli elementi (i recensiti non hanno location; alcuni preferiti nemmeno).
// Genera pin sparsi attorno a un punto base con una spirale fillotattica
// deterministica (stessi pin a ogni render). RIMUOVERE quando arrivano le
// coordinate vere: basta cancellare TEST_COORDS + testCoord e passare item.location.
const TEST_COORDS = true;
const TEST_BASE = { latitude: 41.9028, longitude: 12.4964 }; // Roma
const GOLDEN_ANGLE = 2.399963; // rad

function testCoord(index: number) {
  const radius = 0.03 * Math.sqrt(index + 1);
  const angle = index * GOLDEN_ANGLE;
  return {
    latitude: TEST_BASE.latitude + radius * Math.cos(angle),
    longitude: TEST_BASE.longitude + radius * Math.sin(angle),
  };
}
// ─────────────────────────────────────────────────────────────────────────────

/** Forma minima che serve alla mappa (compatibile con MyRestaurantItem e con le review mappate). */
export type MapPinItem = {
  id: string;
  name: string;
  location: { latitude: number; longitude: number } | null;
  is_favorite?: boolean;
};

/**
 * Wrapper sottile su RestaurantMap per i ristoranti di un utente.
 * Set statico di pin: la mappa li auto-inquadra (fitToMarkers). I preferiti
 * sono evidenziati via favoriteIds.
 *
 * - default (diario): riquadro flex con margini, allineato alle card.
 * - `height` (profilo pubblico): mini-mappa ad altezza fissa dentro lo scroll;
 *   in questo caso i margini li gestisce il contenitore chiamante.
 */
export default function MyRestaurantsMap({
  items,
  onSelect,
  height,
}: {
  items: MapPinItem[];
  onSelect: (id: string) => void;
  height?: number;
}) {
  const insets = useSafeAreaInsets();

  const restaurants = useMemo<Restaurant[]>(
    () =>
      items.map((item, i) => {
        const location = item.location ?? (TEST_COORDS ? testCoord(i) : null);
        return { ...item, location } as unknown as Restaurant;
      }),
    [items],
  );

  const favoriteIds = useMemo(
    () => new Set(items.filter(r => r.is_favorite).map(r => r.id)),
    [items],
  );

  const containerStyle = height != null
    ? [styles.base, { height }]
    : [styles.base, styles.fill, { marginBottom: insets.bottom + 12 }];

  return (
    <View style={containerStyle}>
      <RestaurantMap
        restaurants={restaurants}
        favoriteIds={favoriteIds}
        onRestaurantPress={onSelect}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: theme.colors.surface,
  },
  fill: {
    flex: 1,
    marginHorizontal: 12,
    marginTop: 4,
  },
});
