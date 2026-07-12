import { useState, useEffect, useMemo } from 'react';
import { View, StyleSheet, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { Text } from 'react-native-paper';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { useTheme } from '../../../contexts/ThemeContext';
import type { AppTheme } from '../../../constants/theme';
import { AuthService } from '../../../services/auth';
import { RestaurantService } from '../../../services/restaurantService';
import type { UserReview } from '../../../services/restaurantService';
import { getPublicCollections, getPublicCollectionItems, type PublicCollectionMeta, type MyRestaurantItem } from '../../../services/myRestaurantsService';
import { useAuth } from '../../../contexts/AuthContext';
import ProfileMapList from '../../../components/ProfileMapList';
import ListPill from '../../../components/ListPill';
import UserReviewCard from '../../../components/UserReviewCard';
import MyRestaurantCard from '../../components/my-restaurants/MyRestaurantCard';
import FollowButton from '../../../components/FollowButton';
import { FollowService, type FollowStats } from '../../../services/followService';
import { BlockService } from '../../../services/blockService';
import { shareProfile } from '../../../services/shareProfile';
import type { HeaderAction } from '../../components/AppHeader';
import i18n from '../../../utils/i18n';
import type { UserProfile } from '../../../services/auth';
import { getAnonymousLabel } from '../../../utils/anonymousLabel';
import { venueIconName } from '../../../constants/restaurantCategories';
import AppHeader from '../../components/AppHeader';

const getReviewLocation = (r: UserReview) => ({
  city: r.restaurant_city,
  country: r.restaurant_country,
  countryCode: r.restaurant_country_code,
});

// Riga unificata (come ProfileRow sul profilo personale): una recensione o un
// ristorante di una lista pubblica. La pill in alto sceglie l'insieme.
type PublicRow =
  | { kind: 'review'; data: UserReview }
  | { kind: 'saved'; data: MyRestaurantItem };

// Blocco utente: UI volutamente SPENTA (decisione 2026-07-12, rivalutare al
// lancio social). Tutta l'infrastruttura resta attiva e testata (mig 075/077:
// tabella, RLS, trigger, filtri nelle RPC): per riattivare basta questo flag.
// ATTENZIONE Apple: la guideline 1.2 (UGC social) si aspetta il blocco utenti
// — se la review della 1.3.0 lo contesta, riaccendere qui.
const BLOCK_UI_ENABLED = false;

export default function PublicProfileScreen() {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { uid } = useLocalSearchParams<{ uid: string }>();
  const router = useRouter();
  const { isAuthenticated, user } = useAuth();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [reviews, setReviews] = useState<UserReview[]>([]);
  const [reviewCount, setReviewCount] = useState(0);
  const [likesReceived, setLikesReceived] = useState(0);
  const [following, setFollowing] = useState<boolean | null>(null);
  // Grafo pubblico (mig 080): qui serve solo il conteggio seguiti; null
  // sugli anonimi (la RPC non li serve) → colonna Seguiti assente.
  const [followStats, setFollowStats] = useState<FollowStats | null>(null);
  const [blocked, setBlocked] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  // Liste pubbliche dell'utente: meta subito (pill), item al primo tap.
  const [publicLists, setPublicLists] = useState<PublicCollectionMeta[]>([]);
  const [selected, setSelected] = useState<'reviews' | string>('reviews');
  const [listItems, setListItems] = useState<Map<string, MyRestaurantItem[]>>(new Map());
  // Fetch in volo per-lista (non un boolean unico: cambiando pill mentre
  // un'altra lista carica, lo spinner deve seguire la lista selezionata).
  const [loadingLists, setLoadingLists] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!uid) return;
    if (!isAuthenticated) {
      router.replace('/auth/login');
      return;
    }

    (async () => {
      try {
        const [prof, contribs, totalReviews, totalLikes, isFollowing, graphStats, isBlocked, lists] = await Promise.all([
          AuthService.getUserProfile(uid),
          RestaurantService.getReviewsByUser(uid),
          RestaurantService.getReviewCountByUser(uid),
          RestaurantService.getLikesReceivedByUser(uid),
          FollowService.isFollowing(uid).catch(() => false),
          FollowService.getFollowStats(uid).catch(() => null),
          // Col flag spento niente fetch: blocked resta false e non può
          // nascondere recensioni/pill di un profilo senza UI per sbloccarlo.
          BLOCK_UI_ENABLED && user?.uid
            ? BlockService.isBlocked(user.uid, uid).catch(() => false)
            : Promise.resolve(false),
          // In parallelo (is_anonymous non è ancora noto): sui profili anonimi
          // il risultato viene scartato al render, come per il blocco.
          getPublicCollections(uid),
        ]);
        setProfile(prof);
        setReviews(contribs);
        setReviewCount(totalReviews);
        setLikesReceived(totalLikes);
        setFollowing(isFollowing);
        setFollowStats(graphStats);
        setBlocked(isBlocked);
        setPublicLists(lists);
      } catch (err) {
        console.warn('[PublicProfile] Errore caricamento:', err);
      } finally {
        setIsLoading(false);
      }
    })();
  }, [uid, isAuthenticated, user?.uid]);

  const openList = (collectionId: string) => {
    setSelected(collectionId);
    if (listItems.has(collectionId)) return;
    setLoadingLists((prev) => new Set(prev).add(collectionId));
    getPublicCollectionItems(collectionId)
      .then((items) => setListItems((prev) => new Map(prev).set(collectionId, items)))
      .finally(() => setLoadingLists((prev) => { const n = new Set(prev); n.delete(collectionId); return n; }));
  };

  // Mask username for anonymous users when viewed by others.
  // ProfileCard usa getDisplayName che oggi ritorna username; sovrascrivere
  // username con il label anonimo basta.
  const visibleProfile = profile?.is_anonymous
    ? { ...profile, username: getAnonymousLabel(uid) }
    : profile;

  // Pill "Segui": mai su anonimi (non followabili), su se stessi, su utenti
  // bloccati, o prima che lo stato iniziale sia noto (evita il flash
  // Segui → Già segui).
  const canFollow =
    !!user?.uid && user.uid !== uid && !!profile && !profile.is_anonymous && !blocked && following !== null;

  // Liste pubbliche: mai sui profili anonimi (le liste sono layer social, come
  // follow e share) né su utenti bloccati. La barra pill compare solo se c'è
  // almeno una lista da mostrare; altrimenti il profilo resta com'era.
  const showLists = !!profile && !profile.is_anonymous && !blocked && publicLists.length > 0;
  const effSelected = showLists ? selected : 'reviews';
  const currentList = effSelected !== 'reviews' ? publicLists.find((c) => c.id === effSelected) : undefined;

  const rows = useMemo<PublicRow[]>(() => {
    if (effSelected === 'reviews') return reviews.map((data) => ({ kind: 'review' as const, data }));
    return (listItems.get(effSelected) ?? []).map((data) => ({ kind: 'saved' as const, data }));
  }, [effSelected, reviews, listItems]);

  // Menu "..." (blocca/sblocca): su qualunque profilo altrui, anonimi inclusi.
  const handleBlockMenu = () => {
    if (!user?.uid) return;
    if (blocked) {
      Alert.alert(i18n.t('block.unblock'), undefined, [
        { text: i18n.t('common.cancel'), style: 'cancel' },
        {
          text: i18n.t('block.unblock'),
          onPress: async () => {
            try {
              await BlockService.unblock(user.uid, uid);
              setBlocked(false);
            } catch (err) {
              console.warn('[PublicProfile] unblock fallito:', err);
            }
          },
        },
      ]);
      return;
    }
    Alert.alert(i18n.t('block.confirmTitle'), i18n.t('block.confirmBody'), [
      { text: i18n.t('common.cancel'), style: 'cancel' },
      {
        text: i18n.t('block.block'),
        style: 'destructive',
        onPress: async () => {
          try {
            await BlockService.block(user.uid, uid);
            // Il trigger DB ha già rimosso i follow in entrambe le direzioni.
            setBlocked(true);
            setFollowing(false);
          } catch (err) {
            console.warn('[PublicProfile] block fallito:', err);
          }
        },
      },
    ]);
  };

  if (isLoading || !profile) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <AppHeader title={i18n.t('restaurants.profile.title')} />
        <View style={styles.centered}>
          {isLoading ? (
            <ActivityIndicator color={theme.colors.primary} size="large" />
          ) : (
            <Text style={styles.errorText}>{i18n.t('restaurants.user.notFound')}</Text>
          )}
        </View>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ProfileMapList<PublicRow>
        profile={visibleProfile!}
        // Del grafo qui si mostra SOLO "Seguiti" (scelta 2026-07-12): il
        // follower count altrui a numeri bassi è anti-social-proof, resta
        // visibile solo a se stessi (badge sul profilo personale).
        stats={{
          reviews: reviewCount,
          likes: likesReceived,
          following: followStats?.following,
        }}
        onBack={() => router.back()}
        // Stat Seguiti tappabile → lista navigabile (innocuo quando la
        // colonna non compare, profili anonimi).
        onFollowingPress={() =>
          router.push({ pathname: '/restaurants/follow-list', params: { uid, mode: 'following' } })
        }
        nameAccessory={
          canFollow ? (
            <FollowButton userId={user!.uid} targetId={uid} initialFollowing={following!} />
          ) : undefined
        }
        headerActions={(() => {
          const actions: HeaderAction[] = [];
          if (profile && !profile.is_anonymous && profile.username) {
            actions.push({
              icon: 'share-variant',
              onPress: () => shareProfile({ id: uid, username: profile.username }),
              accessibilityLabel: i18n.t('share.shareProfile'),
            });
          }
          if (BLOCK_UI_ENABLED && user?.uid && user.uid !== uid) {
            actions.push({ icon: 'dots-horizontal', onPress: handleBlockMenu, accessibilityLabel: i18n.t('block.menu') });
          }
          return actions.length > 0 ? actions : undefined;
        })()}
        // Utente bloccato: la promessa del blocco ("non vedrai più le sue
        // recensioni") vale anche visitando il suo profilo di proposito.
        items={blocked ? [] : rows}
        // Barra pill solo se ci sono liste pubbliche da mostrare: senza, il
        // profilo resta nella forma classica (solo recensioni, niente barra).
        headerVisible={showLists ? true : undefined}
        filterSlot={showLists ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.pillBar}
            keyboardShouldPersistTaps="handled"
          >
            <ListPill
              label={i18n.t('restaurants.user.reviewsLabel')}
              count={reviewCount}
              active={effSelected === 'reviews'}
              onPress={() => setSelected('reviews')}
            />
            {publicLists.map((c) => (
              <ListPill
                key={c.id}
                label={c.name}
                emoji={c.emoji}
                count={c.item_count}
                active={effSelected === c.id}
                onPress={() => openList(c.id)}
              />
            ))}
          </ScrollView>
        ) : undefined}
        getLocation={(row) =>
          row.kind === 'review'
            ? getReviewLocation(row.data)
            : { city: row.data.city, country: row.data.country, countryCode: row.data.country_code }
        }
        getMapPin={(row) => {
          if (row.kind === 'review') {
            return {
              id: row.data.restaurant_id,
              name: row.data.restaurant_name ?? '',
              location: row.data.restaurant_lat != null && row.data.restaurant_lng != null
                ? { latitude: row.data.restaurant_lat, longitude: row.data.restaurant_lng }
                : null,
              is_favorite: false,
              offers_lodging: row.data.restaurant_offers_lodging ?? false,
            };
          }
          // Riga di lista pubblica: badge col simbolo della lista aperta,
          // coerente col profilo personale.
          return {
            id: row.data.id,
            name: row.data.name,
            location: row.data.location,
            offers_lodging: row.data.offers_lodging,
            symbol: currentList?.emoji ?? null,
          };
        }}
        getPinId={(row) => (row.kind === 'review' ? row.data.restaurant_id : row.data.id)}
        getRowKey={(row) => (row.kind === 'review' ? `r-${row.data.id}` : `s-${row.data.id}`)}
        renderRow={(row, onPress) =>
          row.kind === 'review' ? (
            <UserReviewCard review={row.data} onPress={onPress} />
          ) : (
            <MyRestaurantCard item={row.data} onPress={onPress} />
          )
        }
        sectionTitle={effSelected === 'reviews' ? i18n.t('restaurants.user.reviewsLabel') : currentList?.name ?? ''}
        typeFilter={{
          getKey: (row) =>
            (row.kind === 'review' ? row.data.restaurant_offers_lodging : row.data.offers_lodging)
              ? 'lodging'
              : 'restaurant',
          types: [
            { key: 'restaurant', icon: venueIconName(false), label: i18n.t('restaurants.user.filterRestaurants') },
            { key: 'lodging', icon: venueIconName(true), label: i18n.t('restaurants.user.filterLodging') },
          ],
        }}
        emptyState={
          // Item della lista in caricamento al primo tap: spinner leggero.
          effSelected !== 'reviews' && loadingLists.has(effSelected) ? (
            <ActivityIndicator color={theme.colors.primary} style={styles.listSpinner} />
          ) : undefined
        }
      />
    </>
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
    padding: 24,
  },
  errorText: {
    color: theme.colors.textSecondary,
    fontSize: 16,
  },
  // Barra pill (Recensioni + liste pubbliche): stessa forma del profilo personale.
  pillBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingRight: 4,
  },
  listSpinner: {
    paddingVertical: 24,
  },
});
