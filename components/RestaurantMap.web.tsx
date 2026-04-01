import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../constants/theme';
import type { Restaurant, RestaurantPin } from '../services/restaurantService';

type Props = {
  restaurants: Restaurant[];
  allPins?: RestaurantPin[];
  centerOn?: { latitude: number; longitude: number; sheetFraction: number; latDelta?: number } | null;
  hasUserLocation?: boolean;
  onRegionChangeComplete?: (region: { latitude: number; longitude: number; latitudeDelta: number; longitudeDelta: number }) => void;
  selectedId?: string | null;
  onDeselect?: () => void;
  showMatchInfo?: boolean;
  onRestaurantPress?: (id: string) => void;
  favoriteIds?: Set<string>;
  favoriteRestaurants?: Map<string, Restaurant>;
};

export default function RestaurantMap(_props: Props) {
  return (
    <View style={styles.container}>
      <MaterialCommunityIcons name="map-outline" size={52} color={theme.colors.textSecondary} />
      <Text style={styles.title}>Mappa non disponibile</Text>
      <Text style={styles.subtitle}>La mappa non è supportata su web.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    backgroundColor: theme.colors.background,
    gap: 12,
  },
  title: { fontSize: 18, fontWeight: '600', color: theme.colors.textPrimary },
  subtitle: { fontSize: 14, color: theme.colors.textSecondary, textAlign: 'center' },
});
