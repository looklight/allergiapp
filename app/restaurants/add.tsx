import { useState, useCallback, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { Text, TextInput, Button, Surface } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../../constants/theme';
import { RESTAURANT_CATEGORIES, CUISINE_CATEGORIES } from '../../constants/restaurantCategories';
import { RestaurantService } from '../../services/restaurantService';
import { PlacesService, PlaceAutocompleteResult } from '../../services/placesService';
import { useAuth } from '../../contexts/AuthContext';
import type { PlaceSuggestion, CreateRestaurantInput } from '../../types/restaurants';
import type { RestaurantCategoryId, AppLanguage } from '../../types';
import i18n from '../../utils/i18n';

// ---------------------------------------------------------------------------
// Step 1: Ricerca ristorante tramite Google Places
// ---------------------------------------------------------------------------
function PlaceSearchStep({ onSelect }: { onSelect: (place: PlaceSuggestion) => void }) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PlaceAutocompleteResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [existingRestaurant, setExistingRestaurant] = useState<{ placeId: string; name: string } | null>(null);
  const [searchTimeout, setSearchTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);

  // Pulizia timeout se il componente viene smontato durante una ricerca
  useEffect(() => {
    return () => {
      if (searchTimeout) clearTimeout(searchTimeout);
    };
  }, [searchTimeout]);

  const handleQueryChange = useCallback((text: string) => {
    setQuery(text);
    setExistingRestaurant(null);
    if (searchTimeout) clearTimeout(searchTimeout);
    if (text.trim().length < 2) {
      setResults([]);
      return;
    }
    const t = setTimeout(async () => {
      setIsSearching(true);
      const found = await PlacesService.searchPlaces(text);
      setResults(found);
      setIsSearching(false);
    }, 400);
    setSearchTimeout(t);
  }, [searchTimeout]);

  const handleSelect = async (result: PlaceAutocompleteResult) => {
    setExistingRestaurant(null);
    setIsLoadingDetails(true);

    // Check rapido su Firestore prima di chiamare Google Place Details
    const existing = await RestaurantService.getRestaurant(result.placeId);
    if (existing) {
      setIsLoadingDetails(false);
      setExistingRestaurant({ placeId: existing.googlePlaceId, name: existing.name });
      return;
    }

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
          const isExisting = existingRestaurant?.placeId === result.placeId;
          return (
            <TouchableOpacity
              key={result.placeId}
              style={[styles.resultRow, isExisting && styles.resultRowExisting]}
              onPress={() => isExisting
                ? router.push(`/restaurants/${result.placeId}`)
                : handleSelect(result)
              }
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons
                name={isExisting ? 'check-circle' : 'map-marker-outline'}
                size={20}
                color={theme.colors.primary}
              />
              <View style={styles.resultText}>
                <Text style={styles.resultMain}>{result.mainText}</Text>
                {isExisting ? (
                  <Text style={styles.resultExistingHint}>Già nella community — tocca per vedere</Text>
                ) : (
                  <Text style={styles.resultSecondary} numberOfLines={1}>{result.secondaryText}</Text>
                )}
              </View>
              <MaterialCommunityIcons
                name={isExisting ? 'arrow-right' : 'chevron-right'}
                size={20}
                color={theme.colors.textSecondary}
              />
            </TouchableOpacity>
          );
        })}
      </Surface>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Step 2: Categorie e conferma
// ---------------------------------------------------------------------------
function CategoryStep({
  place,
  onSubmit,
  onBack,
  isLoading,
}: {
  place: PlaceSuggestion;
  onSubmit: (categories: RestaurantCategoryId[]) => void;
  onBack: () => void;
  isLoading: boolean;
}) {
  const [selected, setSelected] = useState<RestaurantCategoryId[]>([]);
  const lang = i18n.locale as AppLanguage;

  const toggle = (id: RestaurantCategoryId) => {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

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
        <Text style={styles.sectionTitle}>Categorie</Text>
        <Text style={styles.stepHint}>
          Seleziona le categorie che descrivono questo ristorante.
        </Text>

        <View style={styles.allergenGrid}>
          {RESTAURANT_CATEGORIES.map(cat => {
            const isActive = selected.includes(cat.id);
            return (
              <TouchableOpacity
                key={cat.id}
                onPress={() => toggle(cat.id)}
                style={[styles.allergenChip, isActive && styles.allergenChipActive]}
                activeOpacity={0.7}
              >
                <Text style={[styles.allergenChipText, isActive && styles.allergenChipTextActive]}>
                  {cat.icon} {cat.translations[lang] ?? cat.translations.en}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={[styles.sectionTitle, { marginTop: 16 }]}>Tipo di cucina</Text>

        <View style={styles.allergenGrid}>
          {CUISINE_CATEGORIES.map(cat => {
            const isActive = selected.includes(cat.id);
            return (
              <TouchableOpacity
                key={cat.id}
                onPress={() => toggle(cat.id)}
                style={[styles.allergenChip, isActive && styles.allergenChipActive]}
                activeOpacity={0.7}
              >
                <Text style={[styles.allergenChipText, isActive && styles.allergenChipTextActive]}>
                  {cat.icon} {cat.translations[lang] ?? cat.translations.en}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </Surface>

      <Button
        mode="contained"
        onPress={() => onSubmit(selected)}
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
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (categories: RestaurantCategoryId[]) => {
    if (!selectedPlace || !user) return;

    // Validazione dati Google Places — alcuni campi possono essere vuoti
    // se l'API non restituisce address_components completi
    if (!selectedPlace.city || !selectedPlace.countryCode) {
      Alert.alert(
        'Dati incompleti',
        'Non è stato possibile determinare la città o il paese di questo locale. Prova a cercarlo con un indirizzo più preciso.'
      );
      return;
    }

    setIsSubmitting(true);

    const input: CreateRestaurantInput = {
      googlePlaceId: selectedPlace.googlePlaceId,
      name: selectedPlace.name,
      address: selectedPlace.address,
      city: selectedPlace.city,
      cityNormalized: selectedPlace.city.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''),
      country: selectedPlace.country,
      countryCode: selectedPlace.countryCode,
      location: selectedPlace.location,
      categories,
    };

    const result = await RestaurantService.addRestaurant(input, user.uid, userProfile?.displayName ?? user?.displayName ?? 'Utente');

    setIsSubmitting(false);

    if (result) {
      Alert.alert(
        'Ristorante aggiunto!',
        `${result.name} è stato aggiunto alla community.`,
        [{ text: 'OK', onPress: () => router.replace(`/restaurants/${result.googlePlaceId}`) }]
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
          <MaterialCommunityIcons name="arrow-left" size={24} color="#FFFFFF" />
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
          <CategoryStep
            place={selectedPlace}
            onSubmit={handleSubmit}
            onBack={() => setSelectedPlace(null)}
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
    color: '#FFFFFF',
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
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 10,
    gap: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
  },
  resultRowExisting: {
    backgroundColor: theme.colors.primaryLight,
    borderWidth: 1,
    borderColor: theme.colors.primary,
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
  resultExistingHint: {
    fontSize: 13,
    color: theme.colors.primary,
    fontWeight: '500',
    marginTop: 2,
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
  allergenGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  allergenChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  allergenChipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  allergenChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: theme.colors.textPrimary,
  },
  allergenChipTextActive: {
    color: '#FFFFFF',
  },
  submitButton: {
    borderRadius: 10,
    marginTop: 8,
  },
  submitButtonContent: {
    paddingVertical: 6,
  },
});
