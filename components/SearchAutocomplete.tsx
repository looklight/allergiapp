import { memo, useCallback } from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../constants/theme';
import type { SearchResult } from '../hooks/useMapSearch';

type Props = {
  results: SearchResult[];
  isSearching: boolean;
  onSelectRestaurant: (id: string, lat: number, lng: number) => void;
  onSelectPlace: (lat: number, lng: number, placeType?: string) => void;
  onDismiss: () => void;
};

function SearchAutocomplete({ results, isSearching, onSelectRestaurant, onSelectPlace, onDismiss }: Props) {
  if (results.length === 0 && !isSearching) return null;

  const restaurants = results.filter(r => r.type === 'restaurant');
  const places = results.filter(r => r.type === 'place');

  return (
    <View style={styles.container}>
      <ScrollView keyboardShouldPersistTaps="handled" bounces={false}>
      {places.length > 0 && (
        <>
          <Text style={styles.sectionHeader}>Luoghi</Text>
          {places.map((r, i) => (
            r.type === 'place' && (
              <TouchableOpacity
                key={`p-${i}-${r.name}`}
                style={styles.row}
                onPress={() => onSelectPlace(r.latitude, r.longitude, r.placeType)}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons name="map-marker-outline" size={18} color={theme.colors.textSecondary} style={styles.icon} />
                <View style={styles.textContainer}>
                  <Text style={styles.name} numberOfLines={1}>{r.name}</Text>
                  {r.subtitle && (
                    <Text style={styles.subtitle} numberOfLines={1}>
                      {r.subtitle}
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
            )
          ))}
        </>
      )}

      {restaurants.length > 0 && (
        <>
          <Text style={styles.sectionHeader}>Ristoranti</Text>
          {restaurants.map((r, i) => (
            r.type === 'restaurant' && (
              <TouchableOpacity
                key={`r-${r.id}`}
                style={styles.row}
                onPress={() => onSelectRestaurant(r.id, r.latitude, r.longitude)}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons name="silverware-fork-knife" size={18} color={theme.colors.primary} style={styles.icon} />
                <View style={styles.textContainer}>
                  <Text style={styles.name} numberOfLines={1}>{r.name}</Text>
                  {r.city && <Text style={styles.subtitle} numberOfLines={1}>{r.city}</Text>}
                </View>
                {r.rating > 0 && (
                  <View style={styles.ratingBadge}>
                    <Text style={styles.ratingText}>{r.rating.toFixed(1)}</Text>
                  </View>
                )}
              </TouchableOpacity>
            )
          ))}
        </>
      )}

      {isSearching && results.length === 0 && (
        <View style={styles.loadingRow}>
          <ActivityIndicator size="small" color={theme.colors.primary} />
        </View>
      )}
      </ScrollView>
    </View>
  );
}

export default memo(SearchAutocomplete);

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    maxHeight: 300,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  icon: {
    marginRight: 10,
  },
  textContainer: {
    flex: 1,
  },
  name: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.textPrimary,
  },
  subtitle: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 1,
  },
  ratingBadge: {
    backgroundColor: theme.colors.primary,
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 8,
  },
  ratingText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.onPrimary,
  },
  loadingRow: {
    paddingVertical: 16,
    alignItems: 'center',
  },
});
