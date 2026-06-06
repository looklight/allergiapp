import { useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Text, Button } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, Stack } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import type { AppTheme } from '../../constants/theme';
import { useAuth } from '../../contexts/AuthContext';
import { RestaurantService } from '../../services/restaurantService';
import type { UserReview } from '../../services/restaurantService';
import { getMyRestaurants, type MyRestaurantItem } from '../../services/myRestaurantsService';
import ProfileMapList from '../../components/ProfileMapList';
import UserReviewCard from '../../components/UserReviewCard';
import MyRestaurantCard from '../components/my-restaurants/MyRestaurantCard';
import AnimatedLikesCounter from '../../components/AnimatedLikesCounter';
import AppHeader from '../components/AppHeader';
import { useUserItemList } from '../../hooks/useUserItemList';
import { useLikesNotification } from '../../hooks/useLikesNotification';
import { useProfileCounts } from '../../hooks/useProfileCounts';
import CountText from '../../components/CountText';
import { getAnonymousLabel } from '../../utils/anonymousLabel';
import i18n from '../../utils/i18n';

type Kind = 'reviews' | 'favorites';

// Riga unificata della lista: una recensione (card recensione) o un preferito
// (card ristorante). Il toggle in alto sceglie quale insieme mostrare.
type ProfileRow =
  | { kind: 'review'; data: UserReview }
  | { kind: 'favorite'; data: MyRestaurantItem };

export default function ProfileScreen() {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const router = useRouter();
  const { user, userProfile, isAuthenticated } = useAuth();

  const [kind, setKind] = useState<Kind>('reviews');
  const { currentLikes, lastSeenLikes, markAsSeen } = useLikesNotification();

  // Caso "like DIMINUITI" (unlike / recensioni cancellate): l'AnimatedLikesCounter
  // anima e chiama markAsSeen solo quando i like AUMENTANO, quindi qui — alla visita
  // del profilo — riallineiamo last_seen al valore attuale più basso. Senza questo il
  // vecchio massimo resterebbe bloccato e i nuovi like sotto quel picco non
  // riaccenderebbero mai il pallino. (Il caso "uguale" non serve: last_seen è già
  // corretto; il caso "aumentati" lo gestisce l'animazione.)
  useEffect(() => {
    if (currentLikes < lastSeenLikes) markAsSeen();
  }, [currentLikes, lastSeenLikes, markAsSeen]);

  const reviewsList = useUserItemList<UserReview>(RestaurantService.getReviewsByUser);
  const favoritesList = useUserItemList<MyRestaurantItem>(getMyRestaurants);

  const favorites = useMemo(
    () => favoritesList.items.filter((r) => r.is_favorite),
    [favoritesList.items],
  );

  // Conteggi cache-first: alla riapertura mostrano subito l'ultimo valore noto
  // (niente flash 0→N mentre le liste complete si ricaricano); skeleton solo al
  // primissimo avvio quando non c'è ancora cache. Vedi useProfileCounts.
  const counts = useProfileCounts(
    user?.uid,
    { reviews: reviewsList.items.length, favorites: favorites.length },
    { reviews: reviewsList.isLoading, favorites: favoritesList.isLoading },
  );

  const rows = useMemo<ProfileRow[]>(
    () =>
      kind === 'reviews'
        ? reviewsList.items.map((data) => ({ kind: 'review' as const, data }))
        : favorites.map((data) => ({ kind: 'favorite' as const, data })),
    [kind, reviewsList.items, favorites],
  );

  const hasContent = reviewsList.items.length > 0 || favorites.length > 0;

  // Alla chiusura dello sheet l'utente può aver tolto un preferito o aggiunto
  // una recensione: ricarica entrambe le liste.
  const reloadAll = () => {
    reviewsList.reload();
    favoritesList.reload();
  };

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

  const visibleProfile = {
    ...userProfile,
    username: userProfile.is_anonymous
      ? getAnonymousLabel(user?.uid ?? '')
      : userProfile.username,
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ProfileMapList<ProfileRow>
        profile={visibleProfile}
        stats={{ likes: currentLikes }}
        reviewsSlot={<CountText value={counts.reviews} style={styles.inlineStatNumber} />}
        likesSlot={
          <AnimatedLikesCounter
            currentLikes={currentLikes}
            previousLikes={lastSeenLikes}
            onAnimationEnd={markAsSeen}
            numberStyle={styles.inlineLikesNumber}
            label={i18n.t('restaurants.profileCard.statLikes')}
          />
        }
        onBack={() => router.back()}
        onEdit={() => router.push('/restaurants/edit-profile')}
        onEditDietary={() => router.push('/restaurants/edit-dietary')}
        onAvatarPress={() => router.push('/restaurants/avatar-gallery')}
        onAddRestaurant={() => router.push('/restaurants/add')}
        items={rows}
        headerVisible={hasContent}
        onDetailClose={reloadAll}
        getLocation={(row) =>
          row.kind === 'review'
            ? { city: row.data.restaurant_city, country: row.data.restaurant_country, countryCode: row.data.restaurant_country_code }
            : { city: row.data.city, country: row.data.country, countryCode: row.data.country_code }
        }
        getMapPin={(row) =>
          row.kind === 'review'
            ? {
                id: row.data.restaurant_id,
                name: row.data.restaurant_name ?? '',
                location: row.data.restaurant_lat != null && row.data.restaurant_lng != null
                  ? { latitude: row.data.restaurant_lat, longitude: row.data.restaurant_lng }
                  : null,
                is_favorite: false,
              }
            : { id: row.data.id, name: row.data.name, location: row.data.location, is_favorite: true }
        }
        getPinId={(row) => (row.kind === 'review' ? row.data.restaurant_id : row.data.id)}
        getRowKey={(row) => (row.kind === 'review' ? `r-${row.data.id}` : `f-${row.data.id}`)}
        renderRow={(row, onPress) =>
          row.kind === 'review'
            ? <UserReviewCard review={row.data} onPress={onPress} />
            : <MyRestaurantCard item={row.data} onPress={onPress} />
        }
        topActions={
          <>
            <View style={styles.actions}>
              <TouchableOpacity
                style={[styles.menuItem, styles.menuItemLeaderboard]}
                onPress={() => router.push('/leaderboard')}
                activeOpacity={0.6}
              >
                <MaterialCommunityIcons name="trophy" size={22} color={theme.colors.amberDark} />
                <Text style={[styles.menuItemText, styles.menuItemLeaderboardText]}>{i18n.t('restaurants.profile.menuLeaderboard')}</Text>
                <MaterialCommunityIcons name="chevron-right" size={22} color={theme.colors.amberDark} />
              </TouchableOpacity>
            </View>
            <View style={styles.actionsDivider} />
          </>
        }
        filterSlot={
          <View style={styles.kindToggle}>
            <KindButton
              label={i18n.t('restaurants.user.reviewsLabel')}
              count={counts.reviews}
              active={kind === 'reviews'}
              onPress={() => setKind('reviews')}
            />
            <KindButton
              label={i18n.t('restaurants.myRestaurants.filterFavorites')}
              count={counts.favorites}
              active={kind === 'favorites'}
              onPress={() => setKind('favorites')}
            />
          </View>
        }
        emptyState={
          <Text style={styles.emptyText}>
            {kind === 'reviews'
              ? i18n.t('restaurants.profile.emptyReviews')
              : i18n.t('restaurants.profile.emptyFavorites')}
          </Text>
        }
      />
    </>
  );
}

function KindButton({
  label,
  count,
  active,
  onPress,
}: {
  label: string;
  count: number | null;
  active: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const textStyle = [styles.kindButtonText, active && styles.kindButtonTextActive];
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={[styles.kindButton, styles.kindButtonInner, active && styles.kindButtonActive]}
    >
      <Text style={textStyle}>{label}</Text>
      <CountText value={count} style={textStyle} />
    </TouchableOpacity>
  );
}

const makeStyles = (theme: AppTheme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.surface,
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
  inlineLikesNumber: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 0,
  },
  // Allineato a ProfileCard.inlineStatNumber: il conteggio recensioni nell'header
  // è reso via reviewsSlot (CountText) per supportare lo skeleton cache-first.
  inlineStatNumber: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  actions: {
    gap: 10,
  },
  // Chiude la sezione pulsanti prima del filtro/mappa: coerente con il divisore
  // che chiude la sezione profilo sopra (stesso colore e respiro ~12px).
  actionsDivider: {
    height: 1,
    backgroundColor: theme.colors.divider,
    marginTop: 12,
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
  kindToggle: {
    flexDirection: 'row',
    gap: 8,
  },
  kindButton: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: theme.colors.surfaceMuted,
  },
  kindButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  kindButtonActive: {
    backgroundColor: theme.colors.primary,
  },
  kindButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  kindButtonTextActive: {
    color: theme.colors.onPrimary,
  },
  emptyText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    paddingVertical: 24,
  },
});
