import { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Text, Button } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../../constants/theme';
import { useAuth } from '../../contexts/AuthContext';
import { RestaurantService } from '../../services/restaurantService';
import ProfileCard from '../../components/ProfileCard';
import AppHeader from '../components/AppHeader';
import { getAnonymousLabel } from '../../utils/anonymousLabel';
import i18n from '../../utils/i18n';

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, userProfile, isAuthenticated } = useAuth();

  const [reviewCount, setReviewCount] = useState(0);
  const [likesReceived, setLikesReceived] = useState(0);
  const [favoriteCount, setFavoriteCount] = useState(0);

  useEffect(() => {
    if (!user?.uid) return;

    (async () => {
      const [totalReviews, totalLikes, userFavorites] = await Promise.all([
        RestaurantService.getReviewCountByUser(user.uid),
        RestaurantService.getLikesReceivedByUser(user.uid),
        RestaurantService.getFavorites(user.uid),
      ]);
      setReviewCount(totalReviews);
      setLikesReceived(totalLikes);
      setFavoriteCount(userFavorites.length);
    })().catch((err) => console.warn('[Profile] Errore caricamento dati:', err));
  }, [user?.uid]);

  if (!isAuthenticated || !userProfile) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <AppHeader title={i18n.t('restaurants.profile.title')} />
        <View style={styles.centered}>
          <Image
            source={require('../../assets/happy_plate_language.png')}
            style={styles.guestImage}
            resizeMode="contain"
          />
          <Text style={styles.guestTitle}>{i18n.t('restaurants.profile.guestTitle')}</Text>
          <Text style={styles.guestSubtitle}>
            {i18n.t('restaurants.profile.guestSubtitle')}
          </Text>
          <Button
            mode="contained"
            onPress={() => router.push('/auth/login')}
            style={styles.loginButton}
            labelStyle={styles.loginButtonLabel}
          >
            {i18n.t('restaurants.profile.signIn')}
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
          username: userProfile.is_anonymous
            ? getAnonymousLabel(user?.uid ?? '')
            : userProfile.username,
        }}
        stats={{ likes: likesReceived, reviews: reviewCount, favorites: favoriteCount }}
        onBack={() => router.back()}
        onEdit={() => router.push('/restaurants/edit-profile')}
        onEditDietary={() => router.push('/restaurants/edit-dietary')}
        onAvatarPress={() => router.push('/restaurants/avatar-gallery')}
      >
        {/* Azioni */}
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => router.push('/restaurants/avatar-gallery')}
          activeOpacity={0.6}
        >
          <MaterialCommunityIcons name="emoticon-outline" size={22} color={theme.colors.primary} />
          <Text style={styles.menuItemText}>{i18n.t('restaurants.profile.menuAvatars')}</Text>
          <MaterialCommunityIcons name="chevron-right" size={22} color={theme.colors.textSecondary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => router.push('/restaurants/favorites')}
          activeOpacity={0.6}
        >
          <MaterialCommunityIcons name="heart-outline" size={22} color={theme.colors.primary} />
          <Text style={styles.menuItemText}>{i18n.t('restaurants.profile.menuFavorites')}</Text>
          <MaterialCommunityIcons name="chevron-right" size={22} color={theme.colors.textSecondary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => router.push('/restaurants/my-reviews')}
          activeOpacity={0.6}
        >
          <MaterialCommunityIcons name="comment-text-outline" size={22} color={theme.colors.primary} />
          <Text style={styles.menuItemText}>{i18n.t('restaurants.profile.menuReviews')}</Text>
          <MaterialCommunityIcons name="chevron-right" size={22} color={theme.colors.textSecondary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.menuItem, styles.menuItemLeaderboard]}
          onPress={() => router.push('/leaderboard')}
          activeOpacity={0.6}
        >
          <MaterialCommunityIcons name="trophy" size={22} color={theme.colors.amberDark} />
          <Text style={[styles.menuItemText, styles.menuItemLeaderboardText]}>{i18n.t('restaurants.profile.menuLeaderboard')}</Text>
          <MaterialCommunityIcons name="chevron-right" size={22} color={theme.colors.amberDark} />
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
  menuItemLeaderboard: {
    backgroundColor: theme.colors.amberLight,
    borderWidth: 1,
    borderColor: theme.colors.amberBorder,
  },
  menuItemLeaderboardText: {
    fontWeight: '600',
    color: theme.colors.amberText,
  },
});
