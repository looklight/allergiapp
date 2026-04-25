import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { Alert, Image } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useRouter, useFocusEffect } from 'expo-router';
import {
  RestaurantService,
  type Restaurant,
  type ReviewPhoto,
  type MenuPhoto,
  type Report,
  type CuisineVote,
} from '../services/restaurantService';
import { useAuth } from '../contexts/AuthContext';
import { useUnlockedAvatars } from '../contexts/UnlockedAvatarsContext';
import { useReviewsPaginated } from './useReviewsPaginated';

export interface UnifiedReview {
  key: string;
  reviewId: string;
  userId?: string;
  displayName: string | null;
  isAnonymous?: boolean;
  avatarUrl?: string | null;
  rating?: number;
  text?: string;
  photos: ReviewPhoto[];
  createdAt: Date;
  allergensSnapshot?: string[];
  dietarySnapshot?: string[];
  likesCount: number;
  likedByMe: boolean;
}

export type { ReviewSortOrder } from '../services/restaurant.types';

export function useRestaurantDetail(
  restaurantId: string | undefined,
  onFavoriteToggled?: (restaurantId: string, delta: number) => void,
) {
  const router = useRouter();
  const { user, isAuthenticated, dietaryNeeds } = useAuth();
  const { refresh: refreshUnlockedAvatars } = useUnlockedAvatars();

  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userReview, setUserReview] = useState<import('../services/restaurantService').Review | null>(null);
  const [menuPhotos, setMenuPhotos] = useState<MenuPhoto[]>([]);
  const [isUploadingMenu, setIsUploadingMenu] = useState(false);
  const [userHasReviews, setUserHasReviews] = useState(false);
  const [isUpdatingMenuUrl, setIsUpdatingMenuUrl] = useState(false);
  const [userReport, setUserReport] = useState<Report | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [cuisineVotes, setCuisineVotes] = useState<CuisineVote[]>([]);
  const loadIdRef = useRef(0);

  // ─── Reviews (delegated to dedicated hook) ─────────────────────────────────
  const {
    reviews: rawReviews,
    totalCount: reviewsTotalCount,
    sortOrder: reviewSortOrder,
    setSortOrder: setReviewSortOrder,
    hasMore: hasMoreReviews,
    loadMore: loadMoreReviews,
    isLoadingMore: isLoadingMoreReviews,
    fetchFirstPage: fetchReviewsFirstPage,
    updateReviews,
  } = useReviewsPaginated(
    restaurantId,
    user?.uid,
    dietaryNeeds.allergens ?? [],
    dietaryNeeds.diets ?? [],
  );

  // ─── Initial load ──────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    if (!restaurantId) return;
    const loadId = ++loadIdRef.current;
    if (!restaurant) setIsLoading(true);
    setError(null);

    try {
      const basePromise = Promise.all([
        RestaurantService.getRestaurant(restaurantId),
        fetchReviewsFirstPage(),
        RestaurantService.getMenuPhotos(restaurantId),
        RestaurantService.getReports(restaurantId),
        RestaurantService.getCuisineVotes(restaurantId),
      ]);
      const userPromise = user?.uid
        ? Promise.all([
            RestaurantService.getUserReview(restaurantId, user.uid),
            RestaurantService.isFavorite(user.uid, restaurantId),
            RestaurantService.getUserReport(restaurantId, user.uid),
            RestaurantService.getUserHasAnyReview(user.uid),
          ])
        : Promise.resolve([null, false, null, false] as const);

      const [[rest, , mp, rp, cv], [ur, fav, urp, hasReviews]] = await Promise.all([basePromise, userPromise]);

      if (loadId !== loadIdRef.current) return;

      setRestaurant(rest);
      setMenuPhotos(mp);
      setReports(rp);
      setCuisineVotes(cv);
      setUserReview(ur);
      setIsFavorite(fav ?? false);
      setUserReport(urp);
      setUserHasReviews(hasReviews);
    } catch (e) {
      if (loadId !== loadIdRef.current) return;
      setError(e instanceof Error ? e.message : 'Errore di caricamento');
    } finally {
      if (loadId === loadIdRef.current) setIsLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- restaurant read for loading optimization only
  }, [restaurantId, user?.uid, fetchReviewsFirstPage]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  // Prefetch thumbnail URLs appena i dati arrivano: riduce il lag visivo
  // tra il mount della FlatList/ScrollView e la comparsa delle immagini.
  useEffect(() => {
    for (const p of menuPhotos) {
      if (p.thumbnail_url) Image.prefetch(p.thumbnail_url).catch(() => {});
    }
    for (const r of rawReviews) {
      for (const photo of r.photos ?? []) {
        if (photo.thumbnailUrl) Image.prefetch(photo.thumbnailUrl).catch(() => {});
      }
    }
  }, [menuPhotos, rawReviews]);

  // ─── Derived state ─────────────────────────────────────────────────────────
  const userNeedsSet = useMemo(() => {
    const all: string[] = [...(dietaryNeeds.allergens ?? []), ...(dietaryNeeds.diets ?? [])];
    return new Set(all);
  }, [dietaryNeeds]);

  const hasUserNeeds = userNeedsSet.size > 0;

  const allReviews = useMemo((): UnifiedReview[] =>
    rawReviews.map(r => ({
      key: `review-${r.id}`,
      reviewId: r.id,
      userId: r.user_id ?? undefined,
      displayName: r.user_display_name ?? null,
      isAnonymous: r.user_is_anonymous ?? false,
      avatarUrl: r.user_avatar_url ?? null,
      rating: r.rating,
      text: r.comment ?? undefined,
      photos: r.photos ?? [],
      createdAt: new Date(r.created_at),
      allergensSnapshot: r.allergens_snapshot,
      dietarySnapshot: r.dietary_snapshot,
      likesCount: r.likes_count ?? 0,
      likedByMe: r.liked_by_me ?? false,
    })),
  [rawReviews]);

  // ─── Actions ───────────────────────────────────────────────────────────────
  const handleToggleFavorite = useCallback(async () => {
    if (!isAuthenticated || !user) {
      router.push('/auth/login');
      return;
    }
    if (!restaurant) return;
    const expected = !isFavorite;
    const delta = expected ? 1 : -1;
    setIsFavorite(expected);
    setRestaurant(prev => prev ? {
      ...prev,
      favorite_count: (prev.favorite_count ?? 0) + delta,
    } : prev);
    onFavoriteToggled?.(restaurant.id, delta);

    try {
      const actual = await RestaurantService.toggleFavorite(user.uid, restaurant.id);
      if (actual !== expected) {
        const correction = (actual ? 1 : -1) - delta;
        setIsFavorite(actual);
        setRestaurant(prev => prev ? {
          ...prev,
          favorite_count: (prev.favorite_count ?? 0) + correction,
        } : prev);
        onFavoriteToggled?.(restaurant.id, correction);
      }
    } catch {
      setIsFavorite(!expected);
      setRestaurant(prev => prev ? {
        ...prev,
        favorite_count: (prev.favorite_count ?? 0) - delta,
      } : prev);
      onFavoriteToggled?.(restaurant.id, -delta);
    }
  }, [isAuthenticated, user, restaurant, isFavorite, router, onFavoriteToggled]);

  const navigateToContribute = useCallback((prefilledRating?: 1 | 2 | 3 | 4 | 5, editReviewId?: string) => {
    if (!isAuthenticated) {
      router.push('/auth/login');
      return;
    }
    let url = `/restaurants/add-review?restaurantId=${restaurantId}&restaurantName=${encodeURIComponent(restaurant?.name ?? '')}&restaurantAddress=${encodeURIComponent(restaurant?.address ?? '')}&restaurantRating=${restaurant?.average_rating ?? 0}&restaurantRatingCount=${restaurant?.review_count ?? 0}`;
    if (prefilledRating) url += `&prefillRating=${prefilledRating}`;
    if (editReviewId) url += `&reviewId=${editReviewId}`;
    router.push(url);
  }, [isAuthenticated, restaurantId, restaurant, router]);

  const handleAddMenuPhoto = useCallback(async () => {
    if (!isAuthenticated || !user) {
      router.push('/auth/login');
      return;
    }
    if (!restaurantId) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      exif: false,
      preferredAssetRepresentationMode:
        ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
    });
    if (result.canceled || !result.assets[0]) return;

    setIsUploadingMenu(true);
    try {
      const photo = await RestaurantService.addMenuPhoto(restaurantId, result.assets[0].uri, user.uid);
      if (photo) {
        setMenuPhotos(prev => [photo, ...prev]);
      } else {
        Alert.alert('Errore', 'Non è stato possibile caricare la foto.');
      }
    } catch {
      Alert.alert('Errore', 'Non è stato possibile caricare la foto.');
    } finally {
      setIsUploadingMenu(false);
    }
  }, [isAuthenticated, user, restaurantId, router]);

  const handleUpdateMenuUrl = useCallback(() => {
    if (!isAuthenticated || !user) {
      router.push('/auth/login');
      return;
    }
    Alert.prompt(
      restaurant?.menu_url ? 'Modifica link menu' : 'Aggiungi link menu',
      'Inserisci l\'URL del menu online (lascia vuoto per rimuovere)',
      async (input?: string) => {
        if (input === undefined) return;
        let url = input.trim();
        if (!url) {
          setIsUpdatingMenuUrl(true);
          const ok = await RestaurantService.updateMenuUrl(restaurantId!, null);
          setIsUpdatingMenuUrl(false);
          if (ok) setRestaurant(prev => prev ? { ...prev, menu_url: null } : prev);
          else Alert.alert('Errore', 'Non è stato possibile aggiornare il link.');
          return;
        }
        if (!/^https?:\/\//i.test(url)) {
          url = 'https://' + url;
        }
        try {
          new URL(url);
        } catch {
          Alert.alert('URL non valido', 'Inserisci un indirizzo web valido (es. www.ristorante.it/menu).');
          return;
        }
        setIsUpdatingMenuUrl(true);
        const ok = await RestaurantService.updateMenuUrl(restaurantId!, url || null);
        setIsUpdatingMenuUrl(false);
        if (ok) {
          setRestaurant(prev => prev ? { ...prev, menu_url: url || null } : prev);
        } else {
          Alert.alert('Errore', 'Non è stato possibile aggiornare il link.');
        }
      },
      'plain-text',
      restaurant?.menu_url ?? '',
    );
  }, [isAuthenticated, user, restaurant?.menu_url, restaurantId, router]);

  const handleDeleteMenuPhoto = useCallback((photo: MenuPhoto) => {
    if (!user || !restaurantId) return;
    Alert.alert(
      'Elimina foto menu',
      'Sei sicuro di voler eliminare questa foto?',
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Elimina',
          style: 'destructive',
          onPress: async () => {
            const ok = await RestaurantService.deleteMenuPhoto(restaurantId, photo.id, user.uid);
            if (ok) {
              setMenuPhotos(prev => prev.filter(p => p.id !== photo.id));
            }
          },
        },
      ],
    );
  }, [user, restaurantId]);

  const pendingLikes = useRef<Set<string>>(new Set());

  const handleToggleReviewLike = useCallback(async (reviewId: string) => {
    if (!isAuthenticated || !user) {
      router.push('/auth/login');
      return;
    }
    if (pendingLikes.current.has(reviewId)) return;
    pendingLikes.current.add(reviewId);

    let wasLiked = false;
    updateReviews(prev => {
      const target = prev.find(r => r.id === reviewId);
      if (!target) return prev;
      wasLiked = target.liked_by_me;
      return prev.map(r => r.id === reviewId
        ? { ...r, liked_by_me: !wasLiked, likes_count: r.likes_count + (wasLiked ? -1 : 1) }
        : r
      );
    });
    try {
      const result = await RestaurantService.toggleReviewLike(reviewId);
      updateReviews(prev => prev.map(r => r.id === reviewId
        ? { ...r, liked_by_me: result.liked, likes_count: result.likes_count }
        : r
      ));
      // Triggera re-check sblocchi avatar (es. like a recensione di vegano).
      refreshUnlockedAvatars();
    } catch {
      updateReviews(prev => prev.map(r => r.id === reviewId
        ? { ...r, liked_by_me: wasLiked, likes_count: r.likes_count + (wasLiked ? 1 : -1) }
        : r
      ));
    } finally {
      pendingLikes.current.delete(reviewId);
    }
  }, [isAuthenticated, user, router, updateReviews, refreshUnlockedAvatars]);

  return {
    restaurant,
    allReviews,
    reviewsTotalCount,
    hasMoreReviews,
    loadMoreReviews,
    isLoadingMoreReviews,
    menuPhotos,
    reports,
    cuisineVotes,
    userReview,
    userReport,
    isFavorite,
    isLoading,
    error,
    isUploadingMenu,
    reviewSortOrder,
    setReviewSortOrder,
    hasUserNeeds,
    userHasReviews,
    isUpdatingMenuUrl,
    handleToggleFavorite,
    handleToggleReviewLike,
    navigateToContribute,
    handleAddMenuPhoto,
    handleDeleteMenuPhoto,
    handleUpdateMenuUrl,
  };
}
