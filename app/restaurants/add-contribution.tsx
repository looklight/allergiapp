import { useState, useRef, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { Text, TextInput } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { theme } from '../../constants/theme';
import { RESTAURANT_CATEGORIES, CUISINE_CATEGORIES } from '../../constants/restaurantCategories';
import { RestaurantService } from '../../services/restaurantService';
import { useAuth } from '../../contexts/AuthContext';
import StarRating from '../../components/StarRating';
import ChipGrid from '../../components/ChipGrid';
import type { AppLanguage, RestaurantCategoryId } from '../../types';
import type { Contribution } from '../../types/restaurants';
import i18n from '../../utils/i18n';

interface DishForm {
  name: string;
  description: string;
  imageUri: string | null;
}

const emptyDish = (): DishForm => ({
  name: '',
  description: '',
  imageUri: null,
});

export default function AddContributionScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { restaurantId, restaurantName, restaurantAddress, restaurantRating, restaurantRatingCount, prefillRating, contributionId } = useLocalSearchParams<{
    restaurantId: string;
    restaurantName?: string;
    restaurantAddress?: string;
    restaurantRating?: string;
    restaurantRatingCount?: string;
    prefillRating?: string;
    contributionId?: string;
  }>();
  const ratingNum = parseFloat(restaurantRating ?? '0');
  const ratingCountNum = parseInt(restaurantRatingCount ?? '0', 10);
  const { user, dietaryNeeds } = useAuth();
  const lang = i18n.locale as AppLanguage;

  const initialRating = (parseInt(prefillRating ?? '0', 10) || 0) as 0 | 1 | 2 | 3 | 4 | 5;
  const [rating, setRating] = useState<0 | 1 | 2 | 3 | 4 | 5>(initialRating);
  const [text, setText] = useState('');
  const [dishes, setDishes] = useState<DishForm[]>([]);
  // Quale piatto è in editing (-1 = nessuno)
  const [editingDish, setEditingDish] = useState(-1);
  const [confirmedCategories, setConfirmedCategories] = useState<RestaurantCategoryId[]>([]);
  const [showCuisine, setShowCuisine] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [existingContribution, setExistingContribution] = useState<Contribution | null>(null);
  const [isLoadingExisting, setIsLoadingExisting] = useState(!!contributionId);
  const scrollRef = useRef<ScrollView>(null);
  const isEditMode = !!contributionId;

  // Carica contributo esistente per la modifica
  useEffect(() => {
    if (!contributionId || !restaurantId || !user) return;
    setIsLoadingExisting(true);
    RestaurantService.getUserContribution(restaurantId, user.uid).then(c => {
      if (c) {
        setExistingContribution(c);
        setRating((c.rating ?? 0) as 0 | 1 | 2 | 3 | 4 | 5);
        setText(c.text ?? '');
        setDishes(c.dishes.map(d => ({
          name: d.name,
          description: d.description ?? '',
          imageUri: d.imageUrl ?? null,
        })));
        setConfirmedCategories(c.confirmedCategories ?? []);
      }
      setIsLoadingExisting(false);
    });
  }, [contributionId, restaurantId, user]);

  const hasContent = rating > 0 || text.trim().length > 0 || dishes.some(d => d.name.trim().length > 0);

  const addDish = () => {
    const newIndex = dishes.length;
    setDishes(prev => [...prev, emptyDish()]);
    setEditingDish(newIndex);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  };

  const removeDish = (index: number) => {
    setDishes(prev => prev.filter((_, i) => i !== index));
    if (editingDish === index) setEditingDish(-1);
    else if (editingDish > index) setEditingDish(editingDish - 1);
  };

  const confirmDish = (index: number) => {
    if (!dishes[index].name.trim()) {
      Alert.alert('Attenzione', 'Inserisci almeno il nome del piatto.');
      return;
    }
    setEditingDish(-1);
  };

  const openEditDish = (index: number) => {
    setEditingDish(index);
  };

  const updateDish = (index: number, updates: Partial<DishForm>) => {
    setDishes(prev => prev.map((d, i) => i === index ? { ...d, ...updates } : d));
  };

  const pickDishImage = async (dishIndex: number) => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 1,
      allowsEditing: true,
    });
    if (!result.canceled && result.assets[0]) {
      updateDish(dishIndex, { imageUri: result.assets[0].uri });
    }
  };

  const handleSubmit = async () => {
    if (!restaurantId || !user) return;
    const validDishes = dishes.filter(d => d.name.trim().length > 0);
    if (rating === 0 && !text.trim() && validDishes.length === 0) {
      Alert.alert('Attenzione', 'Inserisci almeno una valutazione, un commento o un piatto.');
      return;
    }

    setIsSubmitting(true);
    const inputData = {
      ...(rating > 0 && { rating: rating as 1 | 2 | 3 | 4 | 5 }),
      ...(text.trim() && { text: text.trim() }),
      dishes: validDishes.map(d => ({
        name: d.name.trim(),
        description: d.description.trim() || undefined,
        imageUri: d.imageUri ?? undefined,
      })),
      ...(confirmedCategories.length > 0 && { confirmedCategories }),
    };

    // Snapshot delle esigenze alimentari dell'utente al momento del contributo
    const needsSnapshot = (dietaryNeeds.allergens.length > 0 || dietaryNeeds.diets.length > 0)
      ? dietaryNeeds : undefined;

    let contribution;
    if (isEditMode && contributionId && existingContribution) {
      contribution = await RestaurantService.updateContribution({
        restaurantId,
        contributionId,
        input: inputData,
        userId: user.uid,
        displayName: user.displayName ?? 'Anonimo',
        oldContribution: existingContribution,
        userDietaryNeeds: needsSnapshot,
      });
    } else {
      contribution = await RestaurantService.addContribution({
        restaurantId,
        input: inputData,
        userId: user.uid,
        displayName: user.displayName ?? 'Anonimo',
        userDietaryNeeds: needsSnapshot,
      });
    }
    setIsSubmitting(false);

    if (contribution) {
      Alert.alert(
        'Grazie!',
        isEditMode ? 'La tua recensione è stata aggiornata.' : 'La tua recensione è stata condivisa con la community.',
        [{ text: 'OK', onPress: () => router.back() }],
      );
    } else {
      Alert.alert('Errore', 'Non è stato possibile inviare. Riprova.');
    }
  };

  const renderDishSummary = (dish: DishForm, index: number) => {
    return (
      <TouchableOpacity key={index} style={styles.dishSummary} onPress={() => openEditDish(index)} activeOpacity={0.6}>
        <View style={styles.dishSummaryLeft}>
          {dish.imageUri ? (
            <Image source={{ uri: dish.imageUri }} style={styles.dishSummaryImage} />
          ) : (
            <View style={styles.dishSummaryIcon}>
              <MaterialCommunityIcons name="silverware-fork-knife" size={16} color={theme.colors.primary} />
            </View>
          )}
          <View style={styles.dishSummaryInfo}>
            <Text style={styles.dishSummaryName} numberOfLines={1}>{dish.name}</Text>
            {dish.description.length > 0 && (
              <Text style={styles.dishSummaryDesc} numberOfLines={1}>{dish.description}</Text>
            )}
          </View>
        </View>
        <View style={styles.dishSummaryActions}>
          <MaterialCommunityIcons name="pencil-outline" size={18} color={theme.colors.textSecondary} />
          <TouchableOpacity onPress={() => removeDish(index)} hitSlop={8}>
            <MaterialCommunityIcons name="close" size={18} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  const renderDishEditor = (dish: DishForm, index: number) => (
    <View key={index} style={styles.dishEditor}>
      {/* Foto */}
      {dish.imageUri ? (
        <View style={styles.imageWrap}>
          <Image source={{ uri: dish.imageUri }} style={styles.imagePreview} />
          <TouchableOpacity
            style={styles.removeImageBtn}
            onPress={() => updateDish(index, { imageUri: null })}
          >
            <MaterialCommunityIcons name="close-circle" size={24} color="#FFF" />
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity style={styles.photoButton} onPress={() => pickDishImage(index)} activeOpacity={0.6}>
          <MaterialCommunityIcons name="camera-plus-outline" size={22} color={theme.colors.primary} />
          <Text style={styles.photoButtonText}>Scatta o scegli una foto</Text>
        </TouchableOpacity>
      )}

      <TextInput
        label="Nome del piatto"
        value={dish.name}
        onChangeText={(v) => updateDish(index, { name: v })}
        mode="outlined"
        style={styles.dishInput}
        outlineStyle={styles.inputOutline}
        placeholder="Es. Risotto ai funghi"
      />

      <TextInput
        label="Note (opzionale)"
        value={dish.description}
        onChangeText={(v) => updateDish(index, { description: v })}
        mode="outlined"
        style={[styles.dishInput, { minHeight: 90 }]}
        outlineStyle={styles.inputOutline}
        multiline
        placeholder="Es. Preparato senza burro..."
      />

      {/* Conferma piatto */}
      <TouchableOpacity style={styles.confirmDishButton} onPress={() => confirmDish(index)} activeOpacity={0.6}>
        <MaterialCommunityIcons name="check" size={18} color={theme.colors.primary} />
        <Text style={styles.confirmDishText}>Conferma piatto</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8} activeOpacity={0.6}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isEditMode ? 'Modifica recensione' : 'La tua recensione'}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        ref={scrollRef}
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
          value={text}
          onChangeText={setText}
          placeholder="Racconta com'è andata"
          multiline
          mode="outlined"
          style={styles.textInput}
          outlineStyle={styles.textInputOutline}
        />

        <View style={styles.separator} />

        {/* Piatti */}
        <Text style={styles.sectionTitle}>Piatti provati</Text>
        <Text style={styles.sectionHint}>Segnala i piatti sicuri per chi ha allergie</Text>

        {dishes.map((dish, index) =>
          editingDish === index
            ? renderDishEditor(dish, index)
            : renderDishSummary(dish, index)
        )}

        <TouchableOpacity style={styles.addDishButton} onPress={addDish} activeOpacity={0.6}>
          <MaterialCommunityIcons name="plus" size={20} color={theme.colors.primary} />
          <Text style={styles.addDishText}>Aggiungi un piatto</Text>
        </TouchableOpacity>

        <View style={styles.separator} />

        {/* Categorie confermate */}
        <Text style={styles.sectionTitle}>Questo ristorante è adatto a...</Text>
        <Text style={styles.sectionHint}>Conferma le categorie in base alla tua recensione</Text>
        <ChipGrid
          items={RESTAURANT_CATEGORIES}
          activeIds={confirmedCategories}
          onToggle={(id) => setConfirmedCategories(prev =>
            prev.includes(id as RestaurantCategoryId) ? prev.filter(x => x !== id) : [...prev, id as RestaurantCategoryId]
          )}
          lang={lang}
        />

        <TouchableOpacity onPress={() => { setShowCuisine(prev => { if (!prev) setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 150); return !prev; }); }} activeOpacity={0.7} style={styles.altroToggle}>
          <Text style={styles.altroToggleText}>Tipo di cucina</Text>
          <MaterialCommunityIcons name={showCuisine ? 'chevron-up' : 'chevron-down'} size={20} color={theme.colors.primary} />
        </TouchableOpacity>
        {showCuisine && (
          <ChipGrid
            items={CUISINE_CATEGORIES}
            activeIds={confirmedCategories}
            onToggle={(id) => setConfirmedCategories(prev =>
              prev.includes(id as RestaurantCategoryId) ? prev.filter(x => x !== id) : [...prev, id as RestaurantCategoryId]
            )}
            lang={lang}
          />
        )}
        </>}

        {isEditMode && existingContribution && (
          <TouchableOpacity
            onPress={() => {
              Alert.alert(
                'Elimina contributo',
                'Sei sicuro di voler eliminare la tua recensione? Questa azione non può essere annullata.',
                [
                  { text: 'Annulla', style: 'cancel' },
                  {
                    text: 'Elimina',
                    style: 'destructive',
                    onPress: async () => {
                      if (!restaurantId || !user) return;
                      const ok = await RestaurantService.deleteContribution(restaurantId, existingContribution.id, user.uid, existingContribution);
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    backgroundColor: theme.colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  headerTitle: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    marginHorizontal: 8,
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
  sectionHint: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: -6,
    marginBottom: 12,
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
    backgroundColor: '#FFFFFF',
    fontSize: 14,
    minHeight: 100,
    marginTop: 16,
  },
  textInputOutline: {
    borderRadius: 12,
    borderColor: theme.colors.border,
  },
  // Dish summary (collapsed)
  dishSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.background,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  dishSummaryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  dishSummaryIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: theme.colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dishSummaryImage: {
    width: 36,
    height: 36,
    borderRadius: 10,
  },
  dishSummaryInfo: {
    flex: 1,
  },
  dishSummaryName: {
    fontSize: 15,
    fontWeight: '500',
    color: theme.colors.textPrimary,
  },
  dishSummaryDesc: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 1,
  },
  dishSummaryActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  // Dish editor (expanded)
  dishEditor: {
    gap: 12,
    marginBottom: 8,
    backgroundColor: theme.colors.background,
    borderRadius: 12,
    padding: 16,
  },
  dishInput: {
    backgroundColor: '#FFFFFF',
    fontSize: 14,
  },
  inputOutline: {
    borderRadius: 10,
    borderColor: theme.colors.border,
  },
  // Foto
  photoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 20,
    borderRadius: 12,
    backgroundColor: theme.colors.primaryLight,
  },
  photoButtonText: {
    fontSize: 14,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  imageWrap: {
    position: 'relative',
    alignSelf: 'center',
  },
  imagePreview: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  removeImageBtn: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 12,
  },
  altroToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 20,
    marginBottom: 12,
  },
  altroToggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  // Conferma piatto
  confirmDishButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: theme.colors.primary,
    marginTop: 4,
  },
  confirmDishText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  // Aggiungi piatto
  addDishButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    marginTop: 4,
  },
  addDishText: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  // Bottom bar
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingHorizontal: 20,
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
    opacity: 0.4,
  },
  submitText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  submitCaption: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
  },
  deleteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    marginTop: 24,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E0E0E0',
    paddingTop: 20,
  },
  deleteRowText: {
    fontSize: 13,
    color: theme.colors.error,
  },
});
