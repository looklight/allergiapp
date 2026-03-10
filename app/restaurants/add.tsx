import { useState, useCallback, useEffect, useRef } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, Linking } from 'react-native';
import { Text, TextInput, Button, Surface } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../../constants/theme';
import { RestaurantService, CreateRestaurantInput } from '../../services/restaurantService';
import { PlacesService, PlaceAutocompleteResult } from '../../services/placesService';
import { CUISINE_CATEGORIES } from '../../constants/restaurantCategories';
import { useAuth } from '../../contexts/AuthContext';
import type { PlaceSuggestion } from '../../types/restaurants';
import type { AppLanguage } from '../../types';

// ---------------------------------------------------------------------------
// Step 1: Ricerca ristorante tramite Google Places
// ---------------------------------------------------------------------------
function PlaceSearchStep({ onSelect }: { onSelect: (place: PlaceSuggestion) => void }) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PlaceAutocompleteResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [existingMap, setExistingMap] = useState<Map<string, { id: string; name: string }>>(new Map());
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, []);

  const handleQueryChange = useCallback((text: string) => {
    setQuery(text);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    if (text.trim().length < 2) {
      setResults([]);
      setExistingMap(new Map());
      return;
    }
    searchTimeoutRef.current = setTimeout(async () => {
      setIsSearching(true);
      const found = await PlacesService.searchPlaces(text);
      setResults(found);

      // Batch check: una sola query per tutti i placeId
      const placeIds = found.map(r => r.placeId).filter(Boolean);
      const existing = await RestaurantService.checkExistingByPlaceIds(placeIds);
      setExistingMap(existing);

      setIsSearching(false);
    }, 400);
  }, []);

  const handleSelect = async (result: PlaceAutocompleteResult) => {
    setIsLoadingDetails(true);
    const details = await PlacesService.getPlaceDetails(result.placeId);
    setIsLoadingDetails(false);
    if (details) {
      onSelect(details);
    } else {
      Alert.alert('Errore', 'Impossibile recuperare i dettagli del luogo. Riprova.');
    }
  };

  return (
    <View style={styles.stepContainer}>
      <Surface style={styles.section} elevation={0}>
        <Text style={styles.sectionTitle}>Cerca il ristorante</Text>
        <Text style={styles.stepHint}>
          {PlacesService.isConfigured()
            ? 'Digita il nome o l\'indirizzo per trovarlo su Google Maps.'
            : '⚠️ Google Places API non configurata. Inserisci i dati manualmente qui sotto.'}
        </Text>

        <TextInput
          value={query}
          onChangeText={handleQueryChange}
          placeholder="Es. Trattoria da Mario, Roma"
          mode="outlined"
          style={styles.searchInput}
          outlineStyle={styles.searchInputOutline}
          left={<TextInput.Icon icon="magnify" />}
          right={isSearching ? <TextInput.Icon icon={() => <ActivityIndicator size={16} color={theme.colors.primary} />} /> : undefined}
        />

        {isLoadingDetails && (
          <View style={styles.loadingRow}>
            <ActivityIndicator color={theme.colors.primary} size="small" />
            <Text style={styles.loadingText}>Caricamento dettagli...</Text>
          </View>
        )}

        {results.map(result => {
          const existing = existingMap.get(result.placeId);
          return existing ? (
            // Ristorante già presente nella community
            <View key={result.placeId} style={styles.resultRowExisting}>
              <View style={styles.resultExistingTop}>
                <MaterialCommunityIcons name="check-circle" size={18} color={theme.colors.primary} />
                <View style={styles.resultText}>
                  <Text style={styles.resultMain}>{result.mainText}</Text>
                  <Text style={styles.resultSecondary} numberOfLines={1}>{result.secondaryText}</Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.resultExistingBtn}
                onPress={() => router.push(`/restaurants/${existing.id}`)}
                activeOpacity={0.7}
              >
                <Text style={styles.resultExistingBtnText}>Già nella community — vedi scheda</Text>
                <MaterialCommunityIcons name="arrow-right" size={16} color={theme.colors.primary} />
              </TouchableOpacity>
            </View>
          ) : (
            // Nuovo ristorante
            <View key={result.placeId} style={styles.resultRow}>
              <TouchableOpacity
                style={styles.resultSelectArea}
                onPress={() => handleSelect(result)}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons name="map-marker-outline" size={20} color={theme.colors.primary} />
                <View style={styles.resultText}>
                  <Text style={styles.resultMain}>{result.mainText}</Text>
                  <Text style={styles.resultSecondary} numberOfLines={1}>{result.secondaryText}</Text>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={20} color={theme.colors.textSecondary} />
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.6}
                onPress={() => Linking.openURL(
                  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(result.mainText + ' ' + result.secondaryText)}&query_place_id=${result.placeId}`
                )}
                style={styles.mapsBtn}
              >
                <MaterialCommunityIcons name="google-maps" size={12} color={theme.colors.textSecondary} />
                <Text style={styles.mapsBtnText}>Verifica su Maps</Text>
              </TouchableOpacity>
            </View>
          );
        })}
      </Surface>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Step 2: Conferma dettagli
// ---------------------------------------------------------------------------
function ConfirmStep({
  place,
  cuisineTypes,
  onToggleCuisine,
  onSubmit,
  onBack,
  isLoading,
}: {
  place: PlaceSuggestion;
  cuisineTypes: string[];
  onToggleCuisine: (id: string) => void;
  onSubmit: () => void;
  onBack: () => void;
  isLoading: boolean;
}) {
  return (
    <View style={styles.stepContainer}>
      {/* Riepilogo posto selezionato */}
      <Surface style={styles.placeSummary} elevation={0}>
        <View style={styles.placeSummaryRow}>
          <MaterialCommunityIcons name="map-marker" size={18} color={theme.colors.primary} />
          <View style={styles.placeSummaryText}>
            <Text style={styles.placeName}>{place.name}</Text>
            <Text style={styles.placeAddress} numberOfLines={1}>{place.address}</Text>
          </View>
          <TouchableOpacity onPress={onBack} hitSlop={8}>
            <Text style={styles.changePlace}>Cambia</Text>
          </TouchableOpacity>
        </View>
      </Surface>

      <Surface style={styles.section} elevation={0}>
        <Text style={styles.sectionTitle}>Tipo di cucina</Text>
        <Text style={styles.stepHint}>Seleziona uno o più tipi di cucina (opzionale)</Text>
        <View style={styles.cuisineGrid}>
          {CUISINE_CATEGORIES.map(cat => {
            const label = cat.translations['it' as AppLanguage] ?? cat.id;
            const selected = cuisineTypes.includes(cat.id);
            return (
              <TouchableOpacity
                key={cat.id}
                style={[styles.cuisineChip, selected && styles.cuisineChipSelected]}
                onPress={() => onToggleCuisine(cat.id)}
                activeOpacity={0.7}
              >
                <Text style={styles.cuisineChipIcon}>{cat.icon}</Text>
                <Text style={[styles.cuisineChipText, selected && styles.cuisineChipTextSelected]}>
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </Surface>

      <Button
        mode="contained"
        onPress={onSubmit}
        loading={isLoading}
        disabled={isLoading}
        style={styles.submitButton}
        contentStyle={styles.submitButtonContent}
        icon="check"
      >
        Aggiungi ristorante
      </Button>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Screen principale
// ---------------------------------------------------------------------------
export default function AddRestaurantScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, userProfile } = useAuth();

  const [selectedPlace, setSelectedPlace] = useState<PlaceSuggestion | null>(null);
  const [cuisineTypes, setCuisineTypes] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const toggleCuisine = (id: string) => {
    setCuisineTypes(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleSubmit = async () => {
    if (!selectedPlace || !user) return;

    setIsSubmitting(true);

    const input: CreateRestaurantInput = {
      name: selectedPlace.name,
      address: selectedPlace.address,
      city: selectedPlace.city,
      country: selectedPlace.country,
      latitude: selectedPlace.location.latitude,
      longitude: selectedPlace.location.longitude,
      google_place_id: selectedPlace.googlePlaceId,
      cuisine_types: cuisineTypes.length > 0 ? cuisineTypes : undefined,
    };

    const result = await RestaurantService.addRestaurant(input, user.uid);

    setIsSubmitting(false);

    if (result) {
      Alert.alert(
        'Ristorante aggiunto!',
        `${result.name} è stato aggiunto alla community.`,
        [{ text: 'OK', onPress: () => router.replace(`/restaurants/${result.id}`) }]
      );
    } else {
      Alert.alert(
        'Errore',
        'Impossibile aggiungere il ristorante. Potrebbe già essere presente oppure si è verificato un errore di rete.'
      );
    }
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.customHeader, { paddingTop: insets.top }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8} activeOpacity={0.6}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={theme.colors.onPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Aggiungi ristorante</Text>
        <View style={{ width: 24 }} />
      </View>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
        keyboardShouldPersistTaps="handled"
      >
        {!selectedPlace ? (
          <PlaceSearchStep onSelect={setSelectedPlace} />
        ) : (
          <ConfirmStep
            place={selectedPlace}
            cuisineTypes={cuisineTypes}
            onToggleCuisine={toggleCuisine}
            onSubmit={handleSubmit}
            onBack={() => { setSelectedPlace(null); setCuisineTypes([]); }}
            isLoading={isSubmitting}
          />
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  customHeader: {
    backgroundColor: theme.colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  headerTitle: {
    color: theme.colors.onPrimary,
    fontSize: 22,
    fontWeight: 'bold',
  },
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    padding: 12,
    gap: 12,
  },
  stepContainer: {
    gap: 12,
  },
  section: {
    padding: 16,
    borderRadius: 14,
    backgroundColor: theme.colors.surface,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  stepHint: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    lineHeight: 19,
  },
  searchInput: {
    backgroundColor: theme.colors.surface,
  },
  searchInputOutline: {
    borderRadius: 10,
    borderColor: theme.colors.border,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  loadingText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  resultRow: {
    padding: 10,
    borderRadius: 10,
    gap: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
  },
  resultSelectArea: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  resultRowExisting: {
    backgroundColor: theme.colors.primaryLight,
    borderRadius: 10,
    padding: 10,
    gap: 8,
  },
  resultExistingTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  resultExistingBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: theme.colors.surface,
    borderRadius: 8,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  resultExistingBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  resultText: {
    flex: 1,
  },
  resultMain: {
    fontSize: 15,
    fontWeight: '500',
    color: theme.colors.textPrimary,
  },
  resultSecondary: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  mapsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginLeft: 30,
    gap: 4,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 10,
    backgroundColor: theme.colors.background,
  },
  mapsBtnText: {
    fontSize: 11,
    color: theme.colors.textSecondary,
  },
  placeSummary: {
    backgroundColor: theme.colors.primaryLight,
    borderRadius: 14,
    padding: 12,
  },
  placeSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  placeSummaryText: {
    flex: 1,
  },
  placeName: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  placeAddress: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  changePlace: {
    color: theme.colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  cuisineGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  cuisineChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  cuisineChipSelected: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  cuisineChipIcon: {
    fontSize: 14,
  },
  cuisineChipText: {
    fontSize: 13,
    color: theme.colors.textPrimary,
    fontWeight: '500',
  },
  cuisineChipTextSelected: {
    color: theme.colors.onPrimary,
  },
  submitButton: {
    borderRadius: 10,
    marginTop: 8,
  },
  submitButtonContent: {
    paddingVertical: 6,
  },
});
