import { useEffect, useMemo, useRef, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Image, ScrollView, Alert } from 'react-native';
import { Text, Button } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, Stack } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import type { AppTheme } from '../../constants/theme';
import { useAuth } from '../../contexts/AuthContext';
import { RestaurantService } from '../../services/restaurantService';
import type { UserReview } from '../../services/restaurantService';
import { getMyRestaurants, getCollectionsWithItems, type MyRestaurantItem, type CollectionWithItems } from '../../services/myRestaurantsService';
import { CollectionService } from '../../services/collectionService';
import ProfileMapList from '../../components/ProfileMapList';
import ListEditorSheet, { type EditingList } from '../../components/ListEditorSheet';
import UserReviewCard from '../../components/UserReviewCard';
import MyRestaurantCard from '../components/my-restaurants/MyRestaurantCard';
import AnimatedLikesCounter from '../../components/AnimatedLikesCounter';
import AppHeader from '../components/AppHeader';
import { useUserItemList } from '../../hooks/useUserItemList';
import { useLikesNotification } from '../../hooks/useLikesNotification';
import { useProfileCounts } from '../../hooks/useProfileCounts';
import { useCachedCollections } from '../../hooks/useCachedCollections';
import { storage, type CollectionMeta } from '../../utils/storage';
import CountText from '../../components/CountText';
import { getAnonymousLabel } from '../../utils/anonymousLabel';
import { venueIconName } from '../../constants/restaurantCategories';
import i18n from '../../utils/i18n';

// Per ora la pill "Recensioni" resta visibile anche a 0 per incentivare gli
// utenti a scrivere la prima recensione. Quando la base recensioni sarà matura,
// mettere a false: la pill si nasconderà a 0 esattamente come "Preferiti"
// (la logica di selezione di default gestisce già il fallback).
const SHOW_REVIEWS_PILL_AT_ZERO = true;

// Selezione corrente della barra liste: 'reviews', 'favorites' (lista di
// default) oppure l'id di una lista custom.
type Selection = 'reviews' | 'favorites' | string;

// Riga unificata della lista: una recensione (card recensione) o un ristorante
// salvato (card ristorante). La pill in alto sceglie quale insieme mostrare.
type ProfileRow =
  | { kind: 'review'; data: UserReview }
  | { kind: 'favorite'; data: MyRestaurantItem };

export default function ProfileScreen() {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const router = useRouter();
  const { user, userProfile, isAuthenticated } = useAuth();

  const [selected, setSelected] = useState<Selection>('reviews');
  // Editor lista (crea/modifica/elimina) in bottom sheet. null = chiuso.
  const [editor, setEditor] = useState<null | { editing: EditingList | null }>(null);
  const { currentLikes, lastSeenLikes, markAsSeen } = useLikesNotification();

  const isCustom = selected !== 'reviews' && selected !== 'favorites';

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

  // Liste custom con i loro ristoranti, caricate una volta al mount come i
  // preferiti (eager): selezione istantanea, niente fetch on-demand/spinner.
  const listsData = useUserItemList<CollectionWithItems>(getCollectionsWithItems);
  // Pill cache-first (come Recensioni/Preferiti via useProfileCounts): a freddo
  // le pill liste compaiono subito con l'ultimo conteggio noto, poi revalidano.
  const liveMeta = useMemo<CollectionMeta[]>(
    () => listsData.items.map((c) => ({ id: c.id, name: c.name, emoji: c.emoji, item_count: c.item_count })),
    [listsData.items],
  );
  const customCollections = useCachedCollections(user?.uid, liveMeta, listsData.isLoading);
  const customItems = useMemo(
    () => (isCustom ? (listsData.items.find((c) => c.id === selected)?.items ?? []) : []),
    [isCustom, selected, listsData.items],
  );

  const rows = useMemo<ProfileRow[]>(() => {
    if (selected === 'reviews') return reviewsList.items.map((data) => ({ kind: 'review' as const, data }));
    if (selected === 'favorites') return favorites.map((data) => ({ kind: 'favorite' as const, data }));
    return customItems.map((data) => ({ kind: 'favorite' as const, data }));
  }, [selected, reviewsList.items, favorites, customItems]);

  // Visibilità delle pill auto (Recensioni/Preferiti). Preferiti = lista
  // is_default: a 0 confermato è solo rumore → pill nascosta. Durante il loading
  // (counts null) la mostriamo per evitare flash→pop. Recensioni segue il flag.
  const showReviewsPill = SHOW_REVIEWS_PILL_AT_ZERO || counts.reviews !== 0;
  const showFavoritesPill = counts.favorites !== 0;

  // Pill effettivamente presenti, in ordine di resa: la selezione deve sempre
  // puntare a una di queste. Se quella attiva sparisce (preferiti → 0, o in
  // futuro recensioni → 0 a flag spento) si ripiega sulla prima disponibile.
  const visiblePillKeys = useMemo<Selection[]>(() => {
    const keys: Selection[] = [];
    if (showReviewsPill) keys.push('reviews');
    if (showFavoritesPill) keys.push('favorites');
    for (const c of customCollections) keys.push(c.id);
    return keys;
  }, [showReviewsPill, showFavoritesPill, customCollections]);

  useEffect(() => {
    if (visiblePillKeys.length === 0) return; // nessuna pill selezionabile: lascia la selezione com'è
    if (!visiblePillKeys.includes(selected)) setSelected(visiblePillKeys[0]);
  }, [visiblePillKeys, selected]);

  // Caricamento aggregato: serve a non mostrare il testo "stato vuoto" del
  // filtro corrente prima che i dati risolvano, e a ripristinare la pill salvata
  // solo a liste complete (vedi sotto).
  const isLoadingLists = reviewsList.isLoading || favoritesList.isLoading || listsData.isLoading;

  // Ricorda l'ultima pill scelta (Recensioni/Preferiti/lista) per utente.
  // Ripristino UNA volta, a caricamento finito: solo allora `visiblePillKeys` è
  // completo, quindi una scelta non più valida (lista cancellata, pill sparita)
  // viene semplicemente ignorata (resta il default, già coerente). hydratedFor
  // traccia l'utente già ripristinato così il persist non sovrascrive prima.
  const hydratedFor = useRef<string | null>(null);
  useEffect(() => {
    if (!user?.uid || hydratedFor.current === user.uid || isLoadingLists) return;
    hydratedFor.current = user.uid;
    storage.getSelectedProfilePill(user.uid).then((saved) => {
      if (saved && visiblePillKeys.includes(saved)) setSelected(saved);
    });
  }, [user?.uid, isLoadingLists, visiblePillKeys]);

  useEffect(() => {
    if (!user?.uid || hydratedFor.current !== user.uid) return;
    storage.setSelectedProfilePill(user.uid, selected);
  }, [user?.uid, selected]);

  // Alla chiusura dello sheet l'utente può aver cambiato salvataggi o aggiunto
  // una recensione: ricarica liste, conteggi e l'eventuale lista custom aperta.
  const reloadAll = () => {
    reviewsList.reload();
    favoritesList.reload();
    listsData.reload();
  };

  // Titolo sezione e stato vuoto dipendono dalla selezione corrente.
  const currentCollection = isCustom ? customCollections.find((c) => c.id === selected) : undefined;
  const currentCollectionName = currentCollection?.name ?? '';
  // Simbolo della lista aperta per il badge sui pin: emoji (string) | null
  // (bookmark). Allinea la mini-mappa del profilo alla mappa home.
  const currentCollectionEmoji = currentCollection?.emoji ?? null;

  const handleEditorSubmit = async (name: string, emoji: string | null) => {
    if (!user?.uid) return;
    const editing = editor?.editing ?? null;
    setEditor(null);
    if (editing) {
      await CollectionService.updateCollection(editing.id, { name, emoji });
      listsData.reload();
    } else {
      const created = await CollectionService.createCollection(user.uid, name, emoji);
      await listsData.reload();
      if (created) setSelected(created.id);
    }
  };

  const handleEditorDelete = () => {
    const editing = editor?.editing;
    if (!editing) return;
    Alert.alert(
      i18n.t('restaurants.collections.deleteTitle'),
      i18n.t('restaurants.collections.deleteConfirm', { name: editing.name }),
      [
        { text: i18n.t('common.cancel'), style: 'cancel' },
        {
          text: i18n.t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            await CollectionService.deleteCollection(editing.id);
            if (selected === editing.id) setSelected('reviews');
            setEditor(null);
            listsData.reload();
          },
        },
      ],
    );
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
        // Barra sempre visibile: anche a profilo vuoto restano la pill
        // Recensioni (a 0) e il "+", che è il punto d'accesso per creare la
        // prima lista. Niente più empty state separato che compare in ritardo.
        headerVisible
        sectionTitle={
          selected === 'reviews'
            ? i18n.t('restaurants.user.reviewsLabel')
            : selected === 'favorites'
              ? i18n.t('restaurants.myRestaurants.filterFavorites')
              : currentCollectionName
        }
        onDetailClose={reloadAll}
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
        getLocation={(row) =>
          row.kind === 'review'
            ? { city: row.data.restaurant_city, country: row.data.restaurant_country, countryCode: row.data.restaurant_country_code }
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
          // Riga salvata: Preferiti → cuore; lista custom → emoji/bookmark della
          // lista (coerente con la mappa home, dove la lista marchia i suoi pin).
          const base = { id: row.data.id, name: row.data.name, location: row.data.location, offers_lodging: row.data.offers_lodging };
          return selected === 'favorites'
            ? { ...base, is_favorite: true }
            : { ...base, symbol: currentCollectionEmoji };
        }}
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
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.kindToggle}
            keyboardShouldPersistTaps="handled"
          >
            {showReviewsPill && (
              <ListPill
                label={i18n.t('restaurants.user.reviewsLabel')}
                count={counts.reviews}
                active={selected === 'reviews'}
                onPress={() => setSelected('reviews')}
              />
            )}
            {showFavoritesPill && (
              <ListPill
                label={i18n.t('restaurants.myRestaurants.filterFavorites')}
                count={counts.favorites}
                active={selected === 'favorites'}
                onPress={() => setSelected('favorites')}
              />
            )}
            {customCollections.map((c) => (
              <ListPill
                key={c.id}
                label={c.name}
                emoji={c.emoji}
                count={c.item_count}
                active={selected === c.id}
                onPress={() => setSelected(c.id)}
                onLongPress={() => setEditor({ editing: { id: c.id, name: c.name, emoji: c.emoji } })}
              />
            ))}
            <TouchableOpacity
              style={styles.addPill}
              onPress={() => setEditor({ editing: null })}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={i18n.t('restaurants.collections.newList')}
            >
              <MaterialCommunityIcons name="plus" size={18} color={theme.colors.primary} />
            </TouchableOpacity>
          </ScrollView>
        }
        emptyState={
          isLoadingLists ? null : (
            <Text style={styles.emptyText}>
              {selected === 'reviews'
                ? i18n.t('restaurants.profile.emptyReviews')
                : selected === 'favorites'
                  ? i18n.t('restaurants.profile.emptyFavorites')
                  : i18n.t('restaurants.collections.emptyList')}
            </Text>
          )
        }
      />

      <ListEditorSheet
        visible={editor !== null}
        userId={user?.uid ?? ''}
        editing={editor?.editing ?? null}
        onClose={() => setEditor(null)}
        onSubmit={handleEditorSubmit}
        onDelete={handleEditorDelete}
      />
    </>
  );
}

function ListPill({
  label,
  emoji,
  count,
  active,
  onPress,
  onLongPress,
}: {
  label: string;
  emoji?: string | null;
  count: number | null;
  active: boolean;
  onPress: () => void;
  onLongPress?: () => void;
}) {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const textStyle = [styles.kindButtonText, active && styles.kindButtonTextActive];
  return (
    <TouchableOpacity
      onPress={onPress}
      onLongPress={onLongPress}
      activeOpacity={0.7}
      style={[styles.kindButton, styles.kindButtonInner, active && styles.kindButtonActive]}
    >
      {emoji ? <Text style={styles.kindButtonEmoji}>{emoji}</Text> : null}
      <Text style={textStyle} numberOfLines={1}>{label}</Text>
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
    alignItems: 'center',
    gap: 8,
    paddingRight: 4,
  },
  kindButton: {
    maxWidth: 170,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: theme.colors.surfaceMuted,
  },
  addPill: {
    // Circolare e alto come le pill: stretch sull'altezza della riga +
    // aspectRatio 1 → cerchio della stessa altezza, senza sporgere.
    alignSelf: 'stretch',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    backgroundColor: theme.colors.surfaceMuted,
  },
  kindButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  kindButtonEmoji: {
    fontSize: 13,
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
