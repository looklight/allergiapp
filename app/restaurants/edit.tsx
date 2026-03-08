import { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Text, Button, Surface, Chip } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../../constants/theme';
import { RESTAURANT_CATEGORIES, CUISINE_CATEGORIES } from '../../constants/restaurantCategories';
import { RestaurantService } from '../../services/restaurantService';
import { useAuth } from '../../contexts/AuthContext';
import type { Restaurant } from '../../types/restaurants';
import type { RestaurantCategoryId, AppLanguage } from '../../types';
import i18n from '../../utils/i18n';

const PRICE_LEVELS = [1, 2, 3, 4] as const;

export default function EditRestaurantScreen() {
  const { restaurantId } = useLocalSearchParams<{ restaurantId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const lang = i18n.locale as AppLanguage;

  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [unauthorized, setUnauthorized] = useState(false);

  // Editable fields
  const [categories, setCategories] = useState<RestaurantCategoryId[]>([]);
  const [priceLevel, setPriceLevel] = useState<1 | 2 | 3 | 4 | undefined>(undefined);

  const load = useCallback(async () => {
    if (!restaurantId || !user) return;
    setIsLoading(true);
    const rest = await RestaurantService.getRestaurant(restaurantId);
    if (!rest) {
      setIsLoading(false);
      return;
    }
    if (rest.addedBy !== user.uid) {
      setUnauthorized(true);
      setIsLoading(false);
      return;
    }
    setRestaurant(rest);
    setCategories(rest.categories);
    setPriceLevel(rest.priceLevel);
    setIsLoading(false);
  }, [restaurantId, user]);

  useEffect(() => {
    load();
  }, [load]);

  const toggleCategory = (id: RestaurantCategoryId) => {
    setCategories(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleSave = async () => {
    if (!restaurantId) return;
    setIsSaving(true);
    const success = await RestaurantService.updateRestaurant(restaurantId, {
      categories,
      priceLevel,
    });
    setIsSaving(false);
    if (success) {
      Alert.alert('Salvato', 'Le modifiche sono state salvate.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } else {
      Alert.alert('Errore', 'Impossibile salvare le modifiche. Riprova.');
    }
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={[styles.customHeader, { paddingTop: insets.top }]}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={8} activeOpacity={0.6}>
            <MaterialCommunityIcons name="arrow-left" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Modifica ristorante</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.centered}>
          <ActivityIndicator color={theme.colors.primary} size="large" />
        </View>
      </View>
    );
  }

  if (unauthorized || !restaurant) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={[styles.customHeader, { paddingTop: insets.top }]}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={8} activeOpacity={0.6}>
            <MaterialCommunityIcons name="arrow-left" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Modifica ristorante</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.centered}>
          <Text style={styles.errorText}>
            {unauthorized
              ? 'Non hai i permessi per modificare questo ristorante.'
              : 'Ristorante non trovato.'}
          </Text>
          <Button onPress={() => router.back()}>Torna indietro</Button>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.customHeader, { paddingTop: insets.top }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8} activeOpacity={0.6}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Modifica ristorante</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Read-only info */}
        <Surface style={styles.readOnlySection} elevation={0}>
          <View style={styles.readOnlyRow}>
            <MaterialCommunityIcons name="map-marker" size={18} color={theme.colors.primary} />
            <View style={styles.readOnlyText}>
              <Text style={styles.readOnlyName}>{restaurant.name}</Text>
              <Text style={styles.readOnlyAddress} numberOfLines={1}>{restaurant.address}</Text>
              <Text style={styles.readOnlyCity}>{restaurant.city} · {restaurant.countryCode}</Text>
            </View>
          </View>
        </Surface>

        {/* Categorie */}
        <Text style={styles.sectionLabel}>Categorie</Text>
        <Text style={styles.sectionHint}>
          Seleziona le categorie che descrivono questo ristorante.
        </Text>
        <View style={styles.allergenGrid}>
          {RESTAURANT_CATEGORIES.map(cat => {
            const isActive = categories.includes(cat.id);
            return (
              <Chip
                key={cat.id}
                selected={isActive}
                onPress={() => toggleCategory(cat.id)}
                style={[styles.allergenChip, isActive && styles.allergenChipActive]}
                textStyle={[styles.allergenChipText, isActive && styles.allergenChipTextActive]}
              >
                {cat.icon} {cat.translations[lang] ?? cat.translations.en}
              </Chip>
            );
          })}
        </View>

        {/* Tipo di cucina */}
        <Text style={styles.sectionLabel}>Tipo di cucina</Text>
        <View style={styles.allergenGrid}>
          {CUISINE_CATEGORIES.map(cat => {
            const isActive = categories.includes(cat.id);
            return (
              <Chip
                key={cat.id}
                selected={isActive}
                onPress={() => toggleCategory(cat.id)}
                style={[styles.allergenChip, isActive && styles.allergenChipActive]}
                textStyle={[styles.allergenChipText, isActive && styles.allergenChipTextActive]}
              >
                {cat.icon} {cat.translations[lang] ?? cat.translations.en}
              </Chip>
            );
          })}
        </View>

        {/* Price level */}
        <Text style={styles.sectionLabel}>Livello prezzo</Text>
        <View style={styles.priceLevelRow}>
          {PRICE_LEVELS.map(level => (
            <TouchableOpacity
              key={level}
              style={[
                styles.priceLevelButton,
                priceLevel === level && styles.priceLevelButtonActive,
              ]}
              onPress={() => setPriceLevel(priceLevel === level ? undefined : level)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.priceLevelText,
                  priceLevel === level && styles.priceLevelTextActive,
                ]}
              >
                {'€'.repeat(level)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Save */}
        <Button
          mode="contained"
          onPress={handleSave}
          loading={isSaving}
          disabled={isSaving}
          style={styles.saveButton}
          contentStyle={styles.saveButtonContent}
          icon="check"
        >
          Salva modifiche
        </Button>
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
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorText: {
    color: theme.colors.textSecondary,
    marginBottom: 16,
    textAlign: 'center',
  },
  content: {
    padding: 16,
    gap: 12,
  },
  readOnlySection: {
    backgroundColor: theme.colors.primaryLight,
    borderRadius: 12,
    padding: 14,
  },
  readOnlyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  readOnlyText: {
    flex: 1,
  },
  readOnlyName: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  readOnlyAddress: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  readOnlyCity: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  sectionLabel: {
    fontSize: 17,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginTop: 4,
  },
  sectionHint: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
  allergenGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  allergenChip: {
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  allergenChipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  allergenChipText: {
    fontSize: 13,
    color: theme.colors.textPrimary,
  },
  allergenChipTextActive: {
    color: '#FFFFFF',
  },
  priceLevelRow: {
    flexDirection: 'row',
    gap: 10,
  },
  priceLevelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
  },
  priceLevelButtonActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  priceLevelText: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  priceLevelTextActive: {
    color: '#FFFFFF',
  },
  saveButton: {
    borderRadius: 10,
    marginTop: 8,
  },
  saveButtonContent: {
    paddingVertical: 6,
  },
});
