import { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Text, Surface, Button } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../../constants/theme';
import { useAuth } from '../../contexts/AuthContext';
import { AuthService } from '../../services/auth';
import { RestaurantService } from '../../services/restaurantService';
import type { Review } from '../../services/restaurantService';
import StarRating from '../../components/StarRating';
import ProfileCard from '../../components/ProfileCard';
import i18n from '../../utils/i18n';

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, userProfile, isAuthenticated } = useAuth();

  const [reviews, setContributions] = useState<(Review & { restaurant_name?: string })[]>([]);

  useEffect(() => {
    if (!user?.uid) return;

    (async () => {
      const contribs = await RestaurantService.getReviewsByUser(user.uid);
      setContributions(contribs);
    })().catch((err) => console.warn('[Profile] Errore caricamento contributi:', err));
  }, [user?.uid]);

  const handleLogout = () => {
    Alert.alert('Logout', 'Vuoi uscire dal tuo account?', [
      { text: 'Annulla', style: 'cancel' },
      {
        text: 'Esci',
        style: 'destructive',
        onPress: async () => {
          await AuthService.signOut();
          router.back();
        },
      },
    ]);
  };

  if (!isAuthenticated || !userProfile) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={[styles.customHeader, { paddingTop: insets.top }]}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={8} activeOpacity={0.6}>
            <MaterialCommunityIcons name="arrow-left" size={24} color={theme.colors.onPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Profilo</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.centered}>
          <MaterialCommunityIcons
            name="account-circle-outline"
            size={80}
            color={theme.colors.textDisabled}
          />
          <Text style={styles.guestTitle}>Non hai effettuato l'accesso</Text>
          <Text style={styles.guestSubtitle}>
            Accedi per salvare i tuoi ristoranti preferiti, aggiungere recensioni e molto altro.
          </Text>
          <Button
            mode="contained"
            onPress={() => router.push('/auth/login')}
            style={styles.loginButton}
            labelStyle={styles.loginButtonLabel}
          >
            Accedi
          </Button>
        </View>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ProfileCard
        profile={{ ...userProfile, display_name: userProfile.display_name || user?.displayName || '' }}
        onBack={() => router.back()}
        headerRight={
          <TouchableOpacity onPress={handleLogout} hitSlop={8} activeOpacity={0.6}>
            <MaterialCommunityIcons name="logout" size={22} color={theme.colors.onPrimary} />
          </TouchableOpacity>
        }
      >
        {/* Azioni */}
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => router.push('/restaurants/avatar-gallery')}
          activeOpacity={0.6}
        >
          <MaterialCommunityIcons name="emoticon-outline" size={22} color={theme.colors.primary} />
          <Text style={styles.menuItemText}>I miei Avatar</Text>
          <MaterialCommunityIcons name="chevron-right" size={22} color={theme.colors.textSecondary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => router.push('/restaurants/edit-profile')}
          activeOpacity={0.6}
        >
          <MaterialCommunityIcons name="account-edit-outline" size={22} color={theme.colors.primary} />
          <Text style={styles.menuItemText}>Modifica profilo</Text>
          <MaterialCommunityIcons name="chevron-right" size={22} color={theme.colors.textSecondary} />
        </TouchableOpacity>

        {/* Recensioni */}
        {reviews.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Le mie recensioni</Text>
            {reviews.map((c) => {
              const restaurantName = c.restaurant_name ?? 'Ristorante';
              const date = new Date(c.created_at).toLocaleDateString(i18n.locale, {
                day: 'numeric', month: 'short', year: 'numeric',
              });
              return (
                <Surface key={c.id} style={styles.reviewCard} elevation={1}>
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => router.push(`/restaurants/${c.restaurant_id}`)}
                  >
                    <View style={styles.reviewHeader}>
                      <MaterialCommunityIcons name="store" size={16} color={theme.colors.primary} />
                      <Text style={styles.reviewRestaurant} numberOfLines={1}>
                        {restaurantName}
                      </Text>
                      <MaterialCommunityIcons name="chevron-right" size={18} color={theme.colors.textSecondary} />
                    </View>
                    {c.rating != null && c.rating > 0 && (
                      <View style={styles.reviewRating}>
                        <StarRating rating={c.rating} size={14} />
                      </View>
                    )}
                    {c.comment ? (
                      <Text style={styles.reviewText} numberOfLines={3}>{c.comment}</Text>
                    ) : null}
                    {(c.photos?.length ?? 0) > 0 && (
                      <Text style={styles.reviewDishes}>
                        {c.photos.length} foto
                      </Text>
                    )}
                    <Text style={styles.reviewDate}>{date}</Text>
                  </TouchableOpacity>
                </Surface>
              );
            })}
          </>
        )}

      </ProfileCard>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
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
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  guestTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  guestSubtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  loginButton: {
    borderRadius: 10,
    paddingHorizontal: 24,
  },
  loginButtonLabel: {
    fontSize: 16,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  menuItemText: {
    flex: 1,
    fontSize: 16,
    color: theme.colors.textPrimary,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginTop: 4,
  },
  reviewCard: {
    borderRadius: 14,
    backgroundColor: theme.colors.surface,
    padding: 16,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  reviewRestaurant: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.primary,
    flex: 1,
  },
  reviewRating: {
    marginTop: 8,
  },
  reviewText: {
    fontSize: 14,
    color: theme.colors.textPrimary,
    lineHeight: 20,
    marginTop: 8,
  },
  reviewDishes: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 6,
  },
  reviewDate: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
});
