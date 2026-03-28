import { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, TouchableOpacity, Image, ActivityIndicator, KeyboardAvoidingView, Platform, useWindowDimensions } from 'react-native';
import { Text, TextInput } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../../constants/theme';
import { RestaurantService } from '../../services/restaurantService';
import { AuthService } from '../../services/auth';
import { useAuth } from '../../contexts/AuthContext';
import { CUISINE_CATEGORIES, getCuisineLabel } from '../../constants/restaurantCategories';
import ChipGrid from '../../components/ChipGrid';
import DietaryNeedsPicker from '../../components/DietaryNeedsPicker';
import StarRating from '../../components/StarRating';
import HeaderBar from '../../components/HeaderBar';
import { useImagePicker } from '../../hooks/useImagePicker';
import i18n from '../../utils/i18n';
import type { Review, CuisineVote } from '../../services/restaurantService';
import type { DietId, AppLanguage } from '../../types';

const MAX_PHOTOS = 3;
const MAX_COMMENT_LENGTH = 1500;

export default function AddReviewScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { restaurantId, restaurantName, restaurantAddress, restaurantRating, restaurantRatingCount, prefillRating, reviewId } = useLocalSearchParams<{
    restaurantId: string;
    restaurantName?: string;
    restaurantAddress?: string;
    restaurantRating?: string;
    restaurantRatingCount?: string;
    prefillRating?: string;
    reviewId?: string;
  }>();
  const ratingNum = parseFloat(restaurantRating ?? '0');
  const ratingCountNum = parseInt(restaurantRatingCount ?? '0', 10);
  const { user, dietaryNeeds, refreshProfile } = useAuth();

  const { width: screenWidth } = useWindowDimensions();
  // Foto: dimensione dinamica per stare in riga su qualsiasi schermo
  const photoGap = 12;
  const contentPadding = 20;
  const photoSize = Math.floor((screenWidth - contentPadding * 2 - photoGap * (MAX_PHOTOS - 1)) / MAX_PHOTOS);

  const initialRating = (parseInt(prefillRating ?? '0', 10) || 0) as 0 | 1 | 2 | 3 | 4 | 5;
  const [rating, setRating] = useState<0 | 1 | 2 | 3 | 4 | 5>(initialRating);
  const [comment, setComment] = useState('');
  const { photos, remaining, showPickerAlert: handleAddPhoto, removePhoto, resetPhotos } = useImagePicker({
    maxPhotos: MAX_PHOTOS,
    allowsMultipleSelection: true,
    cameraAspect: [1, 1],
  });
  const [selectedAllergens, setSelectedAllergens] = useState<string[]>([...dietaryNeeds.allergens]);
  const [selectedDiets, setSelectedDiets] = useState<string[]>([...(dietaryNeeds.diets ?? [])]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [existingReview, setExistingReview] = useState<Review | null>(null);
  const [isLoadingExisting, setIsLoadingExisting] = useState(!!reviewId);
  const [cuisineVotes, setCuisineVotes] = useState<CuisineVote[]>([]);
  const [selectedCuisines, setSelectedCuisines] = useState<string[]>([]);
  const [cuisinePickerOpen, setCuisinePickerOpen] = useState(false);
  const isEditMode = !!reviewId;
  const hasNeeds = selectedAllergens.length > 0 || selectedDiets.length > 0;

  // Carica voti cucina: pre-seleziona solo quelli dell'utente, gli altri deselezionati
  useEffect(() => {
    if (!restaurantId) return;
    let cancelled = false;
    RestaurantService.getCuisineVotes(restaurantId).then(votes => {
      if (cancelled) return;
      setCuisineVotes(votes);
      setSelectedCuisines(votes.filter(v => v.user_voted).map(v => v.cuisine_id));
    }).catch(() => { /* voti cucina non critici, si caricano vuoti */ });
    return () => { cancelled = true; };
  }, [restaurantId]);

  // Carica review esistente per la modifica
  useEffect(() => {
    if (!reviewId || !restaurantId || !user) return;
    setIsLoadingExisting(true);
    RestaurantService.getUserReview(restaurantId, user.uid).then(r => {
      if (r) {
        setExistingReview(r);
        setRating((r.rating ?? 0) as 0 | 1 | 2 | 3 | 4 | 5);
        setComment(r.comment ?? '');
        resetPhotos((r.photos ?? []).map(p => p.url));
        if (r.allergens_snapshot?.length) setSelectedAllergens([...r.allergens_snapshot]);
        if (r.dietary_snapshot?.length) setSelectedDiets(r.dietary_snapshot as DietId[]);
      } else {
        Alert.alert('Errore', 'Recensione non trovata.', [{ text: 'OK', onPress: () => router.back() }]);
      }
      setIsLoadingExisting(false);
    }).catch(() => {
      Alert.alert('Errore', 'Impossibile caricare la recensione.', [{ text: 'OK', onPress: () => router.back() }]);
      setIsLoadingExisting(false);
    });
  }, [reviewId, restaurantId, user]);

  const toggleCuisine = (id: string) => {
    setSelectedCuisines(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const hasContent = rating > 0 || comment.trim().length > 0 || photos.length > 0;

  const handleSubmit = async () => {
    if (!restaurantId || !user) return;
    if (rating === 0) {
      Alert.alert('Attenzione', 'Seleziona almeno una stella per la valutazione.');
      return;
    }

    setIsSubmitting(true);
    try {
      const inputData = {
        rating,
        ...(comment.trim() && { comment: comment.trim() }),
        photos,
      };

      const needsSnapshot = hasNeeds
        ? { allergens: selectedAllergens, diets: selectedDiets }
        : undefined;

      let review;
      if (isEditMode && reviewId && existingReview) {
        review = await RestaurantService.updateReview({
          reviewId: reviewId,
          restaurantId,
          input: inputData,
          userId: user.uid,
          oldPhotos: existingReview.photos,
          userDietaryNeeds: needsSnapshot,
        });
      } else {
        review = await RestaurantService.addReview({
          restaurantId,
          input: inputData,
          userId: user.uid,
          userDietaryNeeds: needsSnapshot,
          language: i18n.locale,
        });
      }

      // Salva voti cucina (pre-selezionati = baseline, nessun rischio di perdita)
      await RestaurantService.voteCuisines(restaurantId, user.uid, selectedCuisines);

      if (review) {
        Alert.alert(
          'Grazie!',
          isEditMode ? 'La tua recensione è stata aggiornata.' : 'La tua recensione è stata condivisa con la community.',
          [{ text: 'OK', onPress: () => router.back() }],
        );
      } else {
        Alert.alert('Errore', 'Non è stato possibile inviare. Riprova.');
      }
    } catch {
      Alert.alert('Errore', 'Non è stato possibile inviare. Riprova.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      <HeaderBar title={isEditMode ? 'Modifica recensione' : 'La tua recensione'} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 130 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >

        {isLoadingExisting && (
          <View style={{ alignItems: 'center', paddingVertical: 32 }}>
            <ActivityIndicator color={theme.colors.primary} size="large" />
          </View>
        )}

        {/* Info ristorante */}
        {!isLoadingExisting && restaurantName && (
          <View style={styles.restaurantInfo}>
            <MaterialCommunityIcons name="store" size={20} color={theme.colors.primary} />
            <View style={styles.restaurantInfoText}>
              <Text style={styles.restaurantName} numberOfLines={1}>{restaurantName}</Text>
              {restaurantAddress && (
                <Text style={styles.restaurantAddress} numberOfLines={1}>{restaurantAddress}</Text>
              )}
              {ratingCountNum > 0 && (
                <View style={styles.restaurantRatingRow}>
                  <StarRating rating={ratingNum} size={12} />
                  <Text style={styles.restaurantRatingLabel}>{ratingNum.toFixed(1)} ({ratingCountNum})</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {!isLoadingExisting && <>
        <View style={styles.separator} />

        {/* Valutazione */}
        <Text style={styles.sectionTitle}>Come ti sei trovato?</Text>
        <View style={styles.ratingRow}>
          <StarRating rating={rating} size={40} onRate={(r) => setRating(r)} />
          {rating > 0 && (
            <TouchableOpacity onPress={() => setRating(0)} hitSlop={8}>
              <MaterialCommunityIcons name="close-circle-outline" size={20} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        <TextInput
          value={comment}
          onChangeText={setComment}
          placeholder={"Racconta la tua esperienza:\nQuali piatti hai ordinato?\nIl personale è stato attento alle tue esigenze?"}
          placeholderTextColor="#BBBBBB"
          multiline
          maxLength={MAX_COMMENT_LENGTH}
          mode="outlined"
          style={styles.textInput}
          outlineStyle={styles.textInputOutline}
        />

        {/* Foto */}
        <View style={styles.photosSection}>
          <View style={styles.photosGrid}>
            {photos.map((uri, index) => (
              <View key={index} style={styles.photoThumbWrap}>
                <Image source={{ uri }} style={[styles.photoThumb, { width: photoSize, height: photoSize }]} />
                <TouchableOpacity style={styles.photoRemoveBtn} onPress={() => removePhoto(index)} hitSlop={6}>
                  <MaterialCommunityIcons name="close-circle" size={22} color="#FFF" />
                </TouchableOpacity>
              </View>
            ))}
            {remaining > 0 && (
              <TouchableOpacity style={[styles.photoAddBtn, { width: photoSize, height: photoSize }]} onPress={handleAddPhoto} activeOpacity={0.6}>
                <MaterialCommunityIcons name="camera-plus-outline" size={24} color={theme.colors.primary} />
                <Text style={styles.photoAddText}>Foto</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Tag tipo di cucina — community */}
        <Text style={styles.cuisineTitle}>Tipo di cucina</Text>
        <Text style={styles.cuisineHint}>
          {cuisineVotes.length > 0
            ? 'Fai tap sui tag che ritieni corretti per questo ristorante'
            : 'Aggiungi il tipo di cucina di questo ristorante'}
        </Text>
        {/* Tag esistenti — posizione fissa, ordinati per voti */}
        <View style={styles.cuisineGrid}>
          {cuisineVotes.map(v => {
            const selected = selectedCuisines.includes(v.cuisine_id);
            const count = selected && !v.user_voted ? v.vote_count + 1 : !selected && v.user_voted ? v.vote_count - 1 : v.vote_count;
            return (
              <TouchableOpacity
                key={v.cuisine_id}
                style={[styles.cuisineChip, selected && styles.cuisineChipSelected]}
                onPress={() => toggleCuisine(v.cuisine_id)}
                activeOpacity={0.7}
              >
                <Text style={[styles.cuisineChipText, selected && styles.cuisineChipTextSelected]}>
                  {getCuisineLabel(v.cuisine_id, i18n.locale)}
                </Text>
                <Text style={[styles.cuisineChipCountInline, selected && styles.cuisineChipCountInlineSelected]}>
                  {count}
                </Text>
              </TouchableOpacity>
            );
          })}
          {/* Tag aggiunti dall'utente che non erano nei voti community */}
          {selectedCuisines
            .filter(id => !cuisineVotes.some(v => v.cuisine_id === id))
            .map(id => (
              <TouchableOpacity
                key={id}
                style={[styles.cuisineChip, styles.cuisineChipSelected]}
                onPress={() => toggleCuisine(id)}
                activeOpacity={0.7}
              >
                <Text style={[styles.cuisineChipText, styles.cuisineChipTextSelected]}>
                  {getCuisineLabel(id, i18n.locale)}
                </Text>
                <Text style={[styles.cuisineChipCountInline, styles.cuisineChipCountInlineSelected]}>1</Text>
              </TouchableOpacity>
            ))}
          {/* Chip "+ Aggiungi" in coda alla griglia */}
          <TouchableOpacity
            style={[styles.cuisineChipAdd, cuisinePickerOpen && styles.cuisineChipAddOpen]}
            onPress={() => setCuisinePickerOpen(prev => !prev)}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons
              name={cuisinePickerOpen ? 'close' : 'plus'}
              size={14}
              color={cuisinePickerOpen ? theme.colors.primary : theme.colors.textSecondary}
            />
            <Text style={[styles.cuisineChipAddText, cuisinePickerOpen && styles.cuisineChipAddTextOpen]}>
              {cuisinePickerOpen ? 'Chiudi' : 'Aggiungi'}
            </Text>
          </TouchableOpacity>
        </View>
        {/* Picker tag aggiuntivi */}
        {cuisinePickerOpen && (
          <View style={[styles.cuisineGrid, { marginTop: 8 }]}>
            {CUISINE_CATEGORIES
              .filter(cat => !selectedCuisines.includes(cat.id) && !cuisineVotes.some(v => v.cuisine_id === cat.id))
              .map(cat => (
                <TouchableOpacity
                  key={cat.id}
                  style={styles.cuisineChipAdd}
                  onPress={() => toggleCuisine(cat.id)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.cuisineChipAddText}>
                    {cat.translations[i18n.locale as AppLanguage] ?? cat.translations.it}
                  </Text>
                </TouchableOpacity>
              ))}
          </View>
        )}

        {/* Profilo alimentare (editabile) */}
        <View style={styles.separator} />
        <DietaryNeedsPicker
          allergens={selectedAllergens}
          diets={selectedDiets}
          onAllergensChange={setSelectedAllergens}
          onDietsChange={setSelectedDiets}
          profileAllergens={dietaryNeeds.allergens}
          profileDiets={dietaryNeeds.diets}
          onSyncProfile={async (a, d) => {
            if (!user) return;
            await AuthService.updateDietaryNeeds(user.uid, { allergens: a, diets: d });
            await refreshProfile();
          }}
          lang={i18n.locale}
          initialExpanded={dietaryNeeds.allergens.length === 0 && dietaryNeeds.diets.length === 0}
        />
        </>}

        {isEditMode && existingReview && (
          <TouchableOpacity
            onPress={() => {
              Alert.alert(
                'Elimina recensione',
                'Sei sicuro di voler eliminare la tua recensione? Questa azione non può essere annullata.',
                [
                  { text: 'Annulla', style: 'cancel' },
                  {
                    text: 'Elimina',
                    style: 'destructive',
                    onPress: async () => {
                      if (!user) return;
                      const ok = await RestaurantService.deleteReview(existingReview.id, user.uid);
                      if (ok) {
                        router.back();
                      }
                    },
                  },
                ],
              );
            }}
            activeOpacity={0.7}
            style={styles.deleteRow}
          >
            <MaterialCommunityIcons name="delete-outline" size={16} color={theme.colors.error} />
            <Text style={styles.deleteRowText}>Elimina la tua recensione</Text>
          </TouchableOpacity>
        )}

      </ScrollView>

      {/* Bottone fisso in basso */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 12 }]}>
        <TouchableOpacity
          style={[styles.submitButton, (!hasContent || isSubmitting) && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={isSubmitting || !hasContent}
          activeOpacity={0.7}
        >
          <Text style={styles.submitText}>{isSubmitting ? (isEditMode ? 'Aggiornamento...' : 'Pubblicazione...') : (isEditMode ? 'Aggiorna' : 'Pubblica')}</Text>
        </TouchableOpacity>
        <Text style={styles.submitCaption}>La tua recensione aiuta la community</Text>
      </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.surface,
  },
  // Info ristorante
  restaurantInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  restaurantInfoText: {
    flex: 1,
    gap: 2,
  },
  restaurantName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  restaurantAddress: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  restaurantRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  restaurantRatingLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  // Content
  content: {
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 10,
  },
  separator: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginVertical: 24,
  },
  // Rating
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  // Testo
  textInput: {
    backgroundColor: theme.colors.surface,
    fontSize: 14,
    minHeight: 100,
    marginTop: 16,
  },
  textInputOutline: {
    borderRadius: 12,
    borderColor: theme.colors.border,
  },
  // Foto
  photosSection: {
    marginTop: 20,
    gap: 8,
  },
  photosGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  photoThumbWrap: {
    position: 'relative',
  },
  photoThumb: {
    borderRadius: 12,
  },
  photoRemoveBtn: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 11,
  },
  photoAddBtn: {
    borderRadius: 12,
    backgroundColor: theme.colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  photoAddText: {
    fontSize: 12,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  // Bottom bar
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.xl,
  },
  submitButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
    paddingVertical: 16,
    borderRadius: 14,
  },
  submitButtonDisabled: {
    opacity: 0.4,
  },
  submitText: {
    color: theme.colors.onPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  submitCaption: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
  },
  // Cuisine tags
  cuisineTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    marginTop: 20,
    marginBottom: 2,
  },
  cuisineHint: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginBottom: 8,
  },
  cuisineGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 4,
  },
  cuisineChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  cuisineChipSelected: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  cuisineChipText: {
    fontSize: 12,
    color: theme.colors.textPrimary,
  },
  cuisineChipTextSelected: {
    color: theme.colors.onPrimary,
  },
  cuisineChipCountInline: {
    fontSize: 10,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    marginLeft: 1,
  },
  cuisineChipCountInlineSelected: {
    color: 'rgba(255,255,255,0.7)',
  },
  cuisineChipAdd: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderStyle: 'dashed',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  cuisineChipAddOpen: {
    borderStyle: 'solid',
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primaryLight,
  },
  cuisineChipAddText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  cuisineChipAddTextOpen: {
    color: theme.colors.primary,
  },
  deleteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 24,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.border,
    paddingTop: 20,
    paddingBottom: 14,
  },
  deleteRowText: {
    fontSize: 13,
    color: theme.colors.error,
  },
});
