import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import RestaurantMap from '../../../components/map/RestaurantMap';
import { useTheme } from '../../../contexts/ThemeContext';
import type { AppTheme } from '../../../constants/theme';
import type { Restaurant } from '../../../services/restaurant.types';

/** Forma minima che serve alla mappa (compatibile con MyRestaurantItem e con le review mappate). */
export type MapPinItem = {
  id: string;
  name: string;
  location: { latitude: number; longitude: number } | null;
  is_favorite?: boolean;
  /** Simbolo del badge per le liste custom: emoji (string) | bookmark (null).
   *  `undefined` = nessun badge lista (es. Preferiti usa is_favorite, le
   *  recensioni nessun badge). Allinea la mini-mappa profilo alla mappa home. */
  symbol?: string | null;
  /** Faccetta lodging: decide l'icona del pin (letto vs forchetta). */
  offers_lodging?: boolean;
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
  selectedId,
  onDeselect,
}: {
  items: MapPinItem[];
  onSelect: (id: string) => void;
  height?: number;
  /** Pin da evidenziare (es. ristorante della riga aperta dalla lista). */
  selectedId?: string | null;
  /** Chiamato al tap sulla mappa: deseleziona il pin evidenziato. */
  onDeselect?: () => void;
}) {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const insets = useSafeAreaInsets();

  const restaurants = useMemo<Restaurant[]>(
    () =>
      items
        .filter(item => item.location != null)
        .map(item => item as unknown as Restaurant),
    [items],
  );

  const favoriteIds = useMemo(
    () => new Set(items.filter(r => r.is_favorite).map(r => r.id)),
    [items],
  );

  // Simboli lista custom (emoji | null=bookmark) → badge sul pin, come la mappa
  // home. Solo gli item con `symbol` definito entrano: Preferiti/recensioni no.
  const customSymbols = useMemo(() => {
    const m = new Map<string, string | null>();
    for (const item of items) if (item.symbol !== undefined) m.set(item.id, item.symbol);
    return m;
  }, [items]);

  const containerStyle = height != null
    ? [styles.base, { height }]
    : [styles.base, styles.fill, { marginBottom: insets.bottom + 12 }];

  return (
    <View style={containerStyle}>
      <RestaurantMap
        restaurants={restaurants}
        favoriteIds={favoriteIds}
        customSymbols={customSymbols}
        onRestaurantPress={onSelect}
        selectedId={selectedId}
        onDeselect={onDeselect}
      />
    </View>
  );
}

const makeStyles = (theme: AppTheme) => StyleSheet.create({
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
