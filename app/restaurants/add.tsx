import { useState, useCallback, useEffect, useRef } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, Linking, Image } from 'react-native';
import { Text, TextInput, Surface } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../../constants/theme';
import { RestaurantService, CreateRestaurantInput } from '../../services/restaurantService';
import { PlacesService, PlaceAutocompleteResult } from '../../services/placesService';
import { pendingRestaurantFocus } from '../../utils/pendingRestaurantFocus';
import { AuthService } from '../../services/auth';
import { CUISINE_CATEGORIES, getLodgingLabel } from '../../constants/restaurantCategories';
import { useAuth } from '../../contexts/AuthContext';
import { useUnlockedAvatars } from '../../contexts/UnlockedAvatarsContext';
import StarRating from '../../components/StarRating';
import DietaryNeedsPicker from '../../components/DietaryNeedsPicker';
import AppHeader from '../components/AppHeader';
import i18n from '../../utils/i18n';
import { useImagePicker } from '../../hooks/useImagePicker';
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
      Alert.alert(i18n.t('common.error'), i18n.t('restaurants.add.placeDetailsError'));
    }
  };

  return (
    <View style={styles.stepContainer}>
      <Surface style={styles.introBanner} elevation={0}>
        <Image
          source={require('../../assets/happy_plate_forks.png')}
          style={styles.introImage}
          resizeMode="contain"
        />
        <View style={styles.introTitleRow}>
          <MaterialCommunityIcons name="map-marker-plus-outline" size={20} color={theme.colors.primary} />
          <Text style={styles.introTitle}>{i18n.t('restaurants.add.intro')}</Text>
        </View>
        <Text style={styles.introHint}>
          {i18n.t('restaurants.add.introHint')}
        </Text>
      </Surface>

      <Surface style={styles.section} elevation={0}>
        <Text style={styles.sectionTitle}>{i18n.t('restaurants.add.searchTitle')}</Text>
        <Text style={styles.stepHint}>
          {PlacesService.isConfigured()
            ? i18n.t('restaurants.add.searchHint')
            : i18n.t('restaurants.add.searchNotConfigured')}
        </Text>

        <TextInput
          value={query}
          onChangeText={handleQueryChange}
          placeholder={i18n.t('restaurants.add.searchPlaceholder')}
          placeholderTextColor={theme.colors.textDisabled}
          mode="outlined"
          style={styles.searchInput}
          outlineStyle={styles.searchInputOutline}
          left={<TextInput.Icon icon="magnify" />}
          right={isSearching ? <TextInput.Icon icon={() => <ActivityIndicator size={16} color={theme.colors.primary} />} /> : undefined}
        />

        {isLoadingDetails && (
          <View style={styles.loadingRow}>
            <ActivityIndicator color={theme.colors.primary} size="small" />
            <Text style={styles.loadingText}>{i18n.t('restaurants.add.loadingDetails')}</Text>
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
                <Text style={styles.resultExistingBtnText}>{i18n.t('restaurants.add.alreadyExists')}</Text>
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
                <Text style={styles.mapsBtnText}>{i18n.t('restaurants.add.viewOnMaps')}</Text>
              </TouchableOpacity>
            </View>
          );
        })}
      </Surface>

    </View>
  );
}

// ---------------------------------------------------------------------------
// Step 2: Conferma dettagli + valutazione iniziale
// ---------------------------------------------------------------------------
function ConfirmStep({
  place,
  cuisineTypes,
  onToggleCuisine,
  rating,
  onRatingChange,
  comment,
  onCommentChange,
  selectedAllergens,
  onAllergensChange,
  selectedDiets,
  onDietsChange,
  profileAllergens,
  profileDiets,
  onSyncProfile,
  hasNeeds,
  explicitlyNoNeeds,
  onSetNoNeeds,
  photos,
  remaining,
  onAddPhoto,
  onRemovePhoto,
  isLodging,
  lodgingType,
  hasPublicRestaurant,
  onTogglePublicRestaurant,
}: {
  place: PlaceSuggestion;
  cuisineTypes: string[];
  onToggleCuisine: (id: string) => void;
  rating: 0 | 1 | 2 | 3 | 4 | 5;
  onRatingChange: (r: 0 | 1 | 2 | 3 | 4 | 5) => void;
  comment: string;
  onCommentChange: (text: string) => void;
  selectedAllergens: string[];
  onAllergensChange: (a: string[]) => void;
  selectedDiets: string[];
  onDietsChange: (d: string[]) => void;
  profileAllergens: readonly string[];
  profileDiets: readonly string[];
  onSyncProfile: (a: string[], d: string[]) => Promise<void>;
  hasNeeds: boolean;
  explicitlyNoNeeds: boolean;
  onSetNoNeeds: (v: boolean) => void;
  photos: string[];
  remaining: number;
  onAddPhoto: () => void;
  onRemovePhoto: (index: number) => void;
  isLodging: boolean;
  lodgingType?: string;
  hasPublicRestaurant: boolean;
  onTogglePublicRestaurant: (v: boolean) => void;
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
          <TouchableOpacity
            activeOpacity={0.6}
            onPress={() => Linking.openURL(
              `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.name + ' ' + place.address)}&query_place_id=${place.googlePlaceId}`
            )}
            style={styles.placeMapsBtn}
            hitSlop={8}
          >
            <MaterialCommunityIcons name="google-maps" size={12} color={theme.colors.textSecondary} />
            <Text style={styles.placeMapsBtnText}>{i18n.t('restaurants.add.verify')}</Text>
          </TouchableOpacity>
        </View>
      </Surface>

      {/* Tipo struttura + toggle ristorante pubblico (solo lodging) */}
      {isLodging && (
        <Surface style={styles.section} elevation={0}>
          <View style={styles.lodgingTypeRow}>
            <MaterialCommunityIcons name="bed-outline" size={18} color={theme.colors.primary} />
            <Text style={styles.lodgingTypeText}>
              {lodgingType ? getLodgingLabel(lodgingType, i18n.locale) : i18n.t('restaurants.add.lodgingGeneric')}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.lodgingToggleRow}
            activeOpacity={0.7}
            onPress={() => onTogglePublicRestaurant(!hasPublicRestaurant)}
          >
            <MaterialCommunityIcons name="silverware-fork-knife" size={18} color={theme.colors.primary} />
            <Text style={styles.lodgingToggleLabel}>{i18n.t('restaurants.add.hasPublicRestaurant')}</Text>
            <View style={[styles.switchTrack, hasPublicRestaurant && styles.switchTrackActive]}>
              <View style={[styles.switchThumb, hasPublicRestaurant && styles.switchThumbActive]} />
            </View>
          </TouchableOpacity>
          <Text style={styles.stepHint}>{i18n.t('restaurants.add.hasPublicRestaurantHint')}</Text>
        </Surface>
      )}

      {/* Tipo di cucina — per gli hotel solo se hanno ristorante pubblico */}
      {(!isLodging || hasPublicRestaurant) && (
      <Surface style={styles.section} elevation={0}>
        <Text style={styles.sectionTitle}>{i18n.t('restaurants.add.cuisineTitle')}</Text>
        <Text style={styles.stepHint}>{i18n.t('restaurants.add.cuisineHint')}</Text>
        <View style={styles.cuisineGrid}>
          {CUISINE_CATEGORIES.map(cat => {
            const label = cat.translations[i18n.locale as AppLanguage] ?? cat.translations.it;
            const selected = cuisineTypes.includes(cat.id);
            return (
              <TouchableOpacity
                key={cat.id}
                style={[styles.cuisineChip, selected && styles.cuisineChipSelected]}
                onPress={() => onToggleCuisine(cat.id)}
                activeOpacity={0.7}
              >
                <Text style={[styles.cuisineChipText, selected && styles.cuisineChipTextSelected]}>
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </Surface>
      )}

      {/* Valutazione iniziale */}
      <Surface style={styles.section} elevation={0}>
        <Text style={styles.sectionTitle}>{i18n.t('restaurants.add.howRate')}</Text>
        <Text style={styles.stepHint}>
          {i18n.t('restaurants.add.ratingHelpsUsers')}
        </Text>
        <View style={styles.ratingRow}>
          <StarRating rating={rating} size={36} onRate={onRatingChange} />
          {rating > 0 && (
            <TouchableOpacity onPress={() => onRatingChange(0)} hitSlop={8}>
              <MaterialCommunityIcons name="close-circle-outline" size={20} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
        {rating > 0 && (
          <>
            <TextInput
              value={comment}
              onChangeText={onCommentChange}
              placeholder={i18n.t('restaurants.add.commentPlaceholder')}
              placeholderTextColor={theme.colors.textDisabled}
              multiline
              mode="outlined"
              style={styles.commentInput}
              outlineStyle={styles.commentInputOutline}
            />
            <View style={styles.photosRow}>
              {photos.map((uri, i) => (
                <View key={i} style={styles.photoThumb}>
                  <Image source={{ uri }} style={styles.photoThumbImg} />
                  <TouchableOpacity style={styles.photoRemove} onPress={() => onRemovePhoto(i)} hitSlop={4}>
                    <MaterialCommunityIcons name="close-circle" size={18} color={theme.colors.onPrimary} />
                  </TouchableOpacity>
                </View>
              ))}
              {remaining > 0 && (
                <TouchableOpacity style={styles.photoAdd} onPress={onAddPhoto} activeOpacity={0.7}>
                  <MaterialCommunityIcons name="camera-plus-outline" size={20} color={theme.colors.textSecondary} />
                  <Text style={styles.photoAddText}>{i18n.t('restaurants.add.photoLabel')}</Text>
                </TouchableOpacity>
              )}
            </View>
          </>
        )}
      </Surface>

      {/* Piano alimentare: mostrato solo se si sta lasciando una valutazione */}
      {rating > 0 && (
        <>
          <DietaryNeedsPicker
            allergens={selectedAllergens}
            diets={selectedDiets}
            onAllergensChange={onAllergensChange}
            onDietsChange={onDietsChange}
            profileAllergens={profileAllergens}
            profileDiets={profileDiets}
            onSyncProfile={onSyncProfile}
            lang={i18n.locale}
            initialExpanded={profileAllergens.length === 0 && profileDiets.length === 0}
            subtitle={i18n.t('restaurants.add.dietarySubtitle')}
          />
          {!hasNeeds && !explicitlyNoNeeds && (
            <TouchableOpacity
              style={styles.noNeedsBtn}
              onPress={() => onSetNoNeeds(true)}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons name="check-circle-outline" size={16} color={theme.colors.textSecondary} />
              <Text style={styles.noNeedsBtnText}>{i18n.t('restaurants.add.noNeeds')}</Text>
            </TouchableOpacity>
          )}
          {explicitlyNoNeeds && (
            <View style={styles.noNeedsConfirmed}>
              <MaterialCommunityIcons name="check-circle" size={16} color={theme.colors.primary} />
              <Text style={styles.noNeedsConfirmedText}>{i18n.t('restaurants.add.noNeedsConfirmed')}</Text>
              <TouchableOpacity onPress={() => onSetNoNeeds(false)} hitSlop={8}>
                <Text style={styles.noNeedsUndoText}>{i18n.t('common.edit')}</Text>
              </TouchableOpacity>
            </View>
          )}
        </>
      )}

    </View>
  );
}

// ---------------------------------------------------------------------------
// Screen principale
// ---------------------------------------------------------------------------
export default function AddRestaurantScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, dietaryNeeds, refreshProfile } = useAuth();
  const { refresh: refreshUnlockedAvatars } = useUnlockedAvatars();

  const [selectedPlace, setSelectedPlace] = useState<PlaceSuggestion | null>(null);
  const [cuisineTypes, setCuisineTypes] = useState<string[]>([]);

  useEffect(() => {
    if (selectedPlace?.cuisineTypes?.length) {
      setCuisineTypes(selectedPlace.cuisineTypes);
    }
  }, [selectedPlace]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Stato recensione iniziale
  const [rating, setRating] = useState<0 | 1 | 2 | 3 | 4 | 5>(0);
  const [comment, setComment] = useState('');
  const { photos, remaining, showPickerAlert, removePhoto, resetPhotos } = useImagePicker({
    maxPhotos: 3,
    allowsMultipleSelection: true,
    cameraAspect: [1, 1],
  });
  const [selectedAllergens, setSelectedAllergens] = useState<string[]>([...dietaryNeeds.allergens]);
  const [selectedDiets, setSelectedDiets] = useState<string[]>([...(dietaryNeeds.diets ?? [])]);
  const [explicitlyNoNeeds, setExplicitlyNoNeeds] = useState(false);
  // Lodging: toggle "ha un ristorante aperto al pubblico?" (solo se isLodging)
  const [hasPublicRestaurant, setHasPublicRestaurant] = useState(false);

  const toggleCuisine = (id: string) => {
    setCuisineTypes(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleBack = () => {
    setSelectedPlace(null);
    setCuisineTypes([]);
    setRating(0);
    setComment('');
    setSelectedAllergens([...dietaryNeeds.allergens]);
    setSelectedDiets([...(dietaryNeeds.diets ?? [])]);
    setExplicitlyNoNeeds(false);
    setHasPublicRestaurant(false);
    resetPhotos();
  };

  const handleAllergensChange = (a: string[]) => {
    setSelectedAllergens(a);
    setExplicitlyNoNeeds(false);
  };

  const handleDietsChange = (d: string[]) => {
    setSelectedDiets(d);
    setExplicitlyNoNeeds(false);
  };

  const hasNeeds = selectedAllergens.length > 0 || selectedDiets.length > 0;

  const handleSyncProfile = useCallback(async (a: string[], d: string[]) => {
    if (!user) return;
    await AuthService.updateDietaryNeeds(user.uid, { allergens: a, diets: d });
    await refreshProfile();
  }, [user, refreshProfile]);

  // Atterra sulla mappa con la scheda del ristorante aperta e centrata: deposita
  // il focus (id + coordinate) e torna al tab mappa con dismissAll (robusto sia
  // dal FAB mappa sia dal "+" del profilo). La mappa consuma il focus al refocus.
  // Usato dopo creazione e "vai al duplicato": selectedPlace e' qui non-null.
  const goToRestaurantOnMap = useCallback((id: string) => {
    pendingRestaurantFocus.set({
      id,
      lat: selectedPlace?.location.latitude,
      lng: selectedPlace?.location.longitude,
    });
    router.dismissAll();
  }, [router, selectedPlace]);

  const handleSubmit = async () => {
    if (!selectedPlace || !user) return;

    if (rating === 0) {
      Alert.alert(
        i18n.t('restaurants.add.ratingRequiredTitle'),
        i18n.t('restaurants.add.ratingRequiredMsg')
      );
      return;
    }

    setIsSubmitting(true);

    // Check duplicati per proximity (50m, stesso nome)
    const duplicate = await RestaurantService.checkNearbyDuplicates(
      selectedPlace.name,
      selectedPlace.location.latitude,
      selectedPlace.location.longitude,
    );
    if (duplicate) {
      setIsSubmitting(false);
      Alert.alert(
        i18n.t('restaurants.add.duplicateTitle'),
        i18n.t('restaurants.add.duplicateMsg', { name: duplicate.name }),
        [
          { text: i18n.t('restaurants.add.duplicateGoTo'), onPress: () => goToRestaurantOnMap(duplicate.id) },
          { text: i18n.t('restaurants.add.duplicateAddAnyway'), style: 'destructive', onPress: () => { doSubmit(); } },
          { text: i18n.t('common.cancel'), style: 'cancel' },
        ],
      );
      return;
    }

    await doSubmit();
  };

  const doSubmit = async () => {
    if (!selectedPlace || !user) return;
    setIsSubmitting(true);

    // Lodging: la cucina vale solo per un ristorante o un hotel con ristorante
    // pubblico; un hotel solo-colazione non porta cucina e non è "serves_food".
    const isLodging = !!selectedPlace.isLodging;
    const useCuisine = !isLodging || hasPublicRestaurant;

    const input: CreateRestaurantInput = {
      name: selectedPlace.name,
      address: selectedPlace.address,
      city: selectedPlace.city,
      country: selectedPlace.country,
      country_code: selectedPlace.countryCode,
      latitude: selectedPlace.location.latitude,
      longitude: selectedPlace.location.longitude,
      google_place_id: selectedPlace.googlePlaceId,
      cuisine_types: useCuisine && cuisineTypes.length > 0 ? cuisineTypes : undefined,
      ...(isLodging && {
        offers_lodging: true,
        serves_food: hasPublicRestaurant,
        lodging_type: selectedPlace.lodgingType,
      }),
    };

    const result = await RestaurantService.addRestaurant(input, user.uid);

    if (result && rating > 0) {
      await RestaurantService.addReview({
        restaurantId: result.id,
        input: {
          rating,
          ...(comment.trim() && { comment: comment.trim() }),
          photos,
        },
        userId: user.uid,
        userDietaryNeeds: hasNeeds ? { allergens: selectedAllergens, diets: selectedDiets } : undefined,
        language: i18n.locale,
      }).catch(() => { /* review non critica, ristorante già creato */ });
    }

    // Triggera re-check sblocchi avatar (es. raggiunta soglia ristoranti / paesi).
    if (result) refreshUnlockedAvatars();

    setIsSubmitting(false);

    if (result) {
      Alert.alert(
        i18n.t('restaurants.add.successTitle'),
        i18n.t('restaurants.add.successMsg', { name: result.name }),
        [{ text: 'OK', onPress: () => goToRestaurantOnMap(result.id) }]
      );
    } else {
      Alert.alert(
        i18n.t('common.error'),
        i18n.t('restaurants.add.submitError')
      );
    }
  };

  const canSubmit = rating > 0 && (hasNeeds || explicitlyNoNeeds);
  const scrollViewRef = useRef<ScrollView>(null);
  const prevRatingRef = useRef<number>(0);

  useEffect(() => {
    if (rating > 0 && prevRatingRef.current === 0) {
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 150);
    }
    prevRatingRef.current = rating;
  }, [rating]);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <AppHeader title={i18n.t('restaurants.add.title')} onLeadingPress={selectedPlace ? handleBack : undefined} />
      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={[styles.content, { paddingBottom: selectedPlace ? insets.bottom + 96 : insets.bottom + 24 }]}
        keyboardShouldPersistTaps="handled"
      >
        {!selectedPlace ? (
          <PlaceSearchStep onSelect={setSelectedPlace} />
        ) : (
          <ConfirmStep
            place={selectedPlace}
            cuisineTypes={cuisineTypes}
            onToggleCuisine={toggleCuisine}
            rating={rating}
            onRatingChange={setRating}
            comment={comment}
            onCommentChange={setComment}
            selectedAllergens={selectedAllergens}
            onAllergensChange={handleAllergensChange}
            selectedDiets={selectedDiets}
            onDietsChange={handleDietsChange}
            profileAllergens={dietaryNeeds.allergens}
            profileDiets={dietaryNeeds.diets ?? []}
            onSyncProfile={handleSyncProfile}
            hasNeeds={hasNeeds}
            explicitlyNoNeeds={explicitlyNoNeeds}
            onSetNoNeeds={setExplicitlyNoNeeds}
            photos={photos}
            remaining={remaining}
            onAddPhoto={showPickerAlert}
            onRemovePhoto={removePhoto}
            isLodging={!!selectedPlace.isLodging}
            lodgingType={selectedPlace.lodgingType}
            hasPublicRestaurant={hasPublicRestaurant}
            onTogglePublicRestaurant={setHasPublicRestaurant}
          />
        )}
      </ScrollView>

      {!selectedPlace && (
        <TouchableOpacity
          style={[styles.contactsLink, { paddingBottom: insets.bottom + 24 }]}
          onPress={() => Linking.openURL('https://allergiapp.com/contacts')}
          activeOpacity={0.7}
        >
          <Text style={styles.contactsLinkText}>
            {i18n.t('restaurants.add.contactPrompt')}{' '}
            <Text style={styles.contactsLinkAnchor}>{i18n.t('restaurants.add.contactLink')}</Text>
          </Text>
        </TouchableOpacity>
      )}

      {selectedPlace && (
        <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 12 }]}>
          <TouchableOpacity
            style={[styles.submitButton, !canSubmit && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={isSubmitting || !canSubmit}
            activeOpacity={0.8}
          >
            {isSubmitting
              ? <ActivityIndicator color={theme.colors.onPrimary} size="small" />
              : <Text style={styles.submitText}>{i18n.t('restaurants.add.submit')}</Text>
            }
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
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
  introBanner: {
    padding: 16,
    borderRadius: 14,
    backgroundColor: theme.colors.primaryLight,
    alignItems: 'center',
    gap: 8,
  },
  introImage: {
    width: 96,
    height: 96,
  },
  introTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  introTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  introHint: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 19,
  },
  photosRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  photoThumb: {
    width: 64,
    height: 64,
    borderRadius: 8,
    overflow: 'hidden',
  },
  photoThumbImg: {
    width: '100%',
    height: '100%',
  },
  photoRemove: {
    position: 'absolute',
    top: 2,
    right: 2,
  },
  photoAdd: {
    width: 64,
    height: 64,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 2,
  },
  photoAddText: {
    fontSize: 11,
    color: theme.colors.textSecondary,
  },
  contactsLink: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  contactsLinkText: {
    fontSize: 13,
    color: theme.colors.textDisabled,
  },
  contactsLinkAnchor: {
    color: theme.colors.primary,
    textDecorationLine: 'underline',
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
  placeMapsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: theme.colors.surface,
  },
  placeMapsBtnText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    fontWeight: '500',
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
  cuisineChipText: {
    fontSize: 13,
    color: theme.colors.textPrimary,
    fontWeight: '500',
  },
  cuisineChipTextSelected: {
    color: theme.colors.onPrimary,
  },
  // Lodging: riga tipo struttura (sola lettura) + toggle ristorante pubblico
  lodgingTypeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  lodgingTypeText: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  lodgingToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  lodgingToggleLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  switchTrack: {
    width: 40,
    height: 22,
    borderRadius: 11,
    backgroundColor: theme.colors.border,
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  switchTrackActive: {
    backgroundColor: theme.colors.primary,
  },
  switchThumb: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: theme.colors.surface,
  },
  switchThumbActive: {
    alignSelf: 'flex-end',
  },
  // Rating
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  commentInput: {
    backgroundColor: theme.colors.surface,
    fontSize: 14,
  },
  commentInputOutline: {
    borderRadius: 10,
    borderColor: theme.colors.border,
  },
  noNeedsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginTop: 4,
  },
  noNeedsBtnText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  noNeedsConfirmed: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  noNeedsConfirmedText: {
    flex: 1,
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  noNeedsUndoText: {
    fontSize: 13,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: theme.colors.background,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.border,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  submitButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
    paddingVertical: 16,
    borderRadius: 14,
  },
  submitButtonDisabled: {
    backgroundColor: theme.colors.border,
  },
  submitText: {
    color: theme.colors.onPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
});
