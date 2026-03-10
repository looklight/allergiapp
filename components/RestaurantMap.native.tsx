import { useEffect, useRef, useState } from 'react';
import { StyleSheet } from 'react-native';
import { Text, Surface } from 'react-native-paper';
import { useRouter } from 'expo-router';
import MapView, { Marker, Callout } from 'react-native-maps';
import { theme } from '../constants/theme';
import { getCuisineLabel } from '../constants/restaurantCategories';
import type { Restaurant } from '../services/restaurantService';

type Region = {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
};

const DEFAULT_REGION: Region = {
  latitude: 41.9,
  longitude: 12.5,
  latitudeDelta: 8,
  longitudeDelta: 8,
};

type Props = {
  restaurants: Restaurant[];
  /** When set, the map animates to this location. sheetFraction = copertura sheet al momento del centering */
  centerOn?: { latitude: number; longitude: number; sheetFraction: number } | null;
  /** Fired when the user stops panning/zooming the map */
  onRegionChangeComplete?: (region: Region) => void;
};

export default function RestaurantMap({ restaurants, centerOn, onRegionChangeComplete }: Props) {
  const router = useRouter();
  const mapRef = useRef<MapView>(null);
  const [mapHeight, setMapHeight] = useState(0);

  // Fit to all markers only when there's no user position to center on
  useEffect(() => {
    if (restaurants.length === 0 || centerOn) return;
    setTimeout(() => {
      mapRef.current?.fitToCoordinates(
        restaurants.filter(r => r.location).map(r => ({
          latitude: r.location!.latitude,
          longitude: r.location!.longitude,
        })),
        {
          edgePadding: { top: 80, right: 50, bottom: 50, left: 50 },
          animated: true,
        },
      );
    }, 100);
  }, [restaurants, centerOn]);

  useEffect(() => {
    if (!centerOn || mapHeight === 0) return;
    // Calcola l'offset in base alla copertura reale dello sheet.
    // Lo sheet copre `sheetFraction` della mappa dal basso.
    // Il centro visibile è a metà della parte scoperta.
    // Offset = spostamento dal centro geometrico al centro visibile, in gradi lat.
    const latDelta = 0.15;
    const sheetCoverage = centerOn.sheetFraction;
    // Centro visibile: a metà della parte scoperta = (1 - sheetCoverage) / 2 dall'alto
    // Centro geometrico: 0.5
    // Offset in frazione della mappa: 0.5 - (1 - sheetCoverage) / 2 = sheetCoverage / 2
    const offset = latDelta * (sheetCoverage / 2);
    mapRef.current?.animateToRegion({
      latitude: centerOn.latitude - offset,
      longitude: centerOn.longitude,
      latitudeDelta: latDelta,
      longitudeDelta: 0.15,
    }, 600);
  }, [centerOn, mapHeight]);

  return (
    <MapView
      ref={mapRef}
      style={styles.map}
      initialRegion={DEFAULT_REGION}
      showsUserLocation={!!centerOn}
      showsMyLocationButton={false}
      onRegionChangeComplete={onRegionChangeComplete}
      onLayout={e => setMapHeight(e.nativeEvent.layout.height)}
    >
      {restaurants.filter(r => r.location).map(restaurant => (
        <Marker
          key={restaurant.id}
          coordinate={{
            latitude: restaurant.location!.latitude,
            longitude: restaurant.location!.longitude,
          }}
          pinColor={theme.colors.primary}
        >
          <Callout
            tooltip
            onPress={() => router.push(`/restaurants/${restaurant.id}`)}
          >
            <Surface style={styles.callout} elevation={3}>
              <Text style={styles.calloutName} numberOfLines={2}>{restaurant.name}</Text>
              <Text style={styles.calloutCity} numberOfLines={1}>{restaurant.city}</Text>
              {restaurant.cuisine_type && (
                <Text style={styles.calloutTags} numberOfLines={1}>
                  {getCuisineLabel(restaurant.cuisine_type)}
                </Text>
              )}
              <Text style={styles.calloutCta}>Tocca per aprire →</Text>
            </Surface>
          </Callout>
        </Marker>
      ))}
    </MapView>
  );
}

const styles = StyleSheet.create({
  map: { ...StyleSheet.absoluteFillObject },
  callout: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 12,
    minWidth: 160,
    maxWidth: 220,
  },
  calloutName: { fontSize: 14, fontWeight: '600', color: theme.colors.textPrimary, marginBottom: 2 },
  calloutCity: { fontSize: 12, color: theme.colors.textSecondary, marginBottom: 4 },
  calloutTags: { fontSize: 11, color: theme.colors.primary, marginBottom: 6 },
  calloutCta: { fontSize: 11, color: theme.colors.primary, fontWeight: '600' },
});
