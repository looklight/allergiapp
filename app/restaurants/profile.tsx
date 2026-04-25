import { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Alert, Image } from 'react-native';
import { Text, Button } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../../constants/theme';
import { useAuth } from '../../contexts/AuthContext';
import { AuthService } from '../../services/auth';
import { RestaurantService } from '../../services/restaurantService';
import type { Review } from '../../services/restaurantService';
import ProfileCard from '../../components/ProfileCard';
import HeaderBar from '../../components/HeaderBar';
import { getAnonymousLabel } from '../../utils/anonymousLabel';

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, userProfile, isAuthenticated } = useAuth();

  const [reviews, setReviews] = useState<(Review & { restaurant_name?: string })[]>([]);
  const [restaurantCount, setRestaurantCount] = useState(0);
  const [favoriteCount, setFavoriteCount] = useState(0);

  useEffect(() => {
    if (!user?.uid) return;

    (async () => {
      const [userReviews, userRestaurants, userFavorites] = await Promise.all([
        RestaurantService.getReviewsByUser(user.uid),
        RestaurantService.getRestaurantsByUser(user.uid),
        RestaurantService.getFavorites(user.uid),
      ]);
      setReviews(userReviews);
      setRestaurantCount(userRestaurants.length);
      setFavoriteCount(userFavorites.length);
    })().catch((err) => console.warn('[Profile] Errore caricamento dati:', err));
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
        <HeaderBar title="Profilo" />
        <View style={styles.centered}>
          <Image
            source={require('../../assets/happy_plate_language.png')}
            style={styles.guestImage}
            resizeMode="contain"
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
        profile={{
          ...userProfile,
          display_name: userProfile.is_anonymous
            ? getAnonymousLabel(user?.uid ?? '')
            : (userProfile.display_name || user?.displayName || ''),
        }}
        stats={{ restaurants: restaurantCount, reviews: reviews.length, favorites: favoriteCount }}
        onBack={() => router.back()}
        onEdit={() => router.push('/restaurants/edit-profile')}
        onEditDietary={() => router.push('/restaurants/edit-dietary')}
        onAvatarPress={() => router.push('/restaurants/avatar-gallery')}
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
          onPress={() => router.push('/restaurants/favorites')}
          activeOpacity={0.6}
        >
          <MaterialCommunityIcons name="heart-outline" size={22} color={theme.colors.primary} />
          <Text style={styles.menuItemText}>I miei preferiti</Text>
          <MaterialCommunityIcons name="chevron-right" size={22} color={theme.colors.textSecondary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => router.push('/restaurants/my-reviews')}
          activeOpacity={0.6}
        >
          <MaterialCommunityIcons name="comment-text-outline" size={22} color={theme.colors.primary} />
          <Text style={styles.menuItemText}>Le mie recensioni</Text>
          <MaterialCommunityIcons name="chevron-right" size={22} color={theme.colors.textSecondary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => router.push('/leaderboard')}
          activeOpacity={0.6}
        >
          <MaterialCommunityIcons name="trophy-outline" size={22} color={theme.colors.primary} />
          <Text style={styles.menuItemText}>Classifica</Text>
          <MaterialCommunityIcons name="chevron-right" size={22} color={theme.colors.textSecondary} />
        </TouchableOpacity>
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
    paddingHorizontal: 32,
  },
  guestImage: {
    width: 150,
    height: 150,
    marginBottom: 32,
  },
  guestTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 12,
    textAlign: 'center',
  },
  guestSubtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  loginButton: {
    borderRadius: 10,
    alignSelf: 'stretch',
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
});
