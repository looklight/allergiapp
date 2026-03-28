import { useState, useCallback, useMemo, useRef } from 'react';
import { Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useRouter, useFocusEffect } from 'expo-router';
import { RestaurantService } from '../services/restaurantService';
import { useAuth } from '../contexts/AuthContext';
import type { Restaurant, Review, ReviewPhoto, MenuPhoto, Report, CuisineVote } from '../services/restaurantService';

export interface UnifiedReview {
  key: string;
  reviewId: string;
  userId?: string;
  displayName: string | null;
  isAnonymous?: boolean;
  avatarUrl?: string | null;
  profileColor?: string | null;
  rating?: number;
  text?: string;
  photos: ReviewPhoto[];
  createdAt: Date;
  allergensSnapshot?: string[];
  dietarySnapshot?: string[];
  likesCount: number;
  likedByMe: boolean;
}

export type ReviewSortOrder = 'recent' | 'rating' | 'rating-asc' | 'relevance' | 'likes';

export function useRestaurantDetail(
  restaurantId: string | undefined,
  onFavoriteToggled?: (restaurantId: string, delta: number) => void,
) {
  const router = useRouter();
  const { user, isAuthenticated, dietaryNeeds } = useAuth();

  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isFavorite, setIsFavorite] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userReview, setUserReview] = useState<Review | null>(null);
  const [menuPhotos, setMenuPhotos] = useState<MenuPhoto[]>([]);
  const [isUploadingMenu, setIsUploadingMenu] = useState(false);
  const [userHasReviews, setUserHasReviews] = useState(false);
  const [isUpdatingMenuUrl, setIsUpdatingMenuUrl] = useState(false);
  const [userReport, setUserReport] = useState<Report | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [cuisineVotes, setCuisineVotes] = useState<CuisineVote[]>([]);
  const [reviewSortOrder, setReviewSortOrder] = useState<ReviewSortOrder>('recent');
  const loadIdRef = useRef(0);

  const load = useCallback(async () => {
    if (!restaurantId) return;
    const loadId = ++loadIdRef.current;
    if (!restaurant) setIsLoading(true);
    setError(null);

    try {
      const basePromise = Promise.all([
        RestaurantService.getRestaurant(restaurantId),
        RestaurantService.getReviews(restaurantId, user?.uid),
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

      const [[rest, rv, mp, rp, cv], [ur, fav, urp, hasReviews]] = await Promise.all([basePromise, userPromise]);

      if (loadId !== loadIdRef.current) return;

      setRestaurant(rest);
      setReviews(rv);
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
  }, [restaurantId, user?.uid]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  /** Allergie+diete dell'utente corrente (per ordinamento "per me") */
  const userNeedsSet = useMemo(() => {
    const all: string[] = [...(dietaryNeeds.allergens ?? []), ...(dietaryNeeds.diets ?? [])];
    return new Set(all);
  }, [dietaryNeeds]);

  const hasUserNeeds = userNeedsSet.size > 0;

  const allReviews = useMemo((): UnifiedReview[] => {
    const items: UnifiedReview[] = [];

    for (const r of reviews) {
      items.push({
        key: `review-${r.id}`,
        reviewId: r.id,
        userId: r.user_id ?? undefined,
        displayName: r.user_display_name ?? null,
        isAnonymous: r.user_is_anonymous ?? false,
        avatarUrl: r.user_avatar_url ?? null,
        profileColor: r.user_profile_color ?? null,
        rating: r.rating,
        text: r.comment ?? undefined,
        photos: r.photos ?? [],
        createdAt: new Date(r.created_at),
        allergensSnapshot: r.allergens_snapshot,
        dietarySnapshot: r.dietary_snapshot,
        likesCount: r.likes_count ?? 0,
        likedByMe: r.liked_by_me ?? false,
      });
    }

    switch (reviewSortOrder) {
      case 'rating':
        items.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
        break;
      case 'rating-asc':
        items.sort((a, b) => (a.rating ?? 0) - (b.rating ?? 0));
        break;
      case 'relevance':
        if (hasUserNeeds) {
          items.sort((a, b) => {
            const aSnap = [...(a.allergensSnapshot ?? []), ...(a.dietarySnapshot ?? [])];
            const bSnap = [...(b.allergensSnapshot ?? []), ...(b.dietarySnapshot ?? [])];
            const aMatch = aSnap.filter(x => userNeedsSet.has(x)).length;
            const bMatch = bSnap.filter(x => userNeedsSet.has(x)).length;
            // Prima per match, poi per rating, poi per data
            return bMatch - aMatch
              || (b.rating ?? 0) - (a.rating ?? 0)
              || b.createdAt.getTime() - a.createdAt.getTime();
          });
        } else {
          items.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        }
        break;
      case 'likes':
        items.sort((a, b) => b.likesCount - a.likesCount || b.createdAt.getTime() - a.createdAt.getTime());
        break;
      default: // 'recent'
        items.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    }

    return items;
  }, [reviews, reviewSortOrder, hasUserNeeds, userNeedsSet]);

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
      // Rollback optimistic update
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
          // Rimuovi URL
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
    // Leggi lo stato corrente dalla lista più recente
    let wasLiked = false;
    setReviews(prev => {
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
      setReviews(prev => prev.map(r => r.id === reviewId
        ? { ...r, liked_by_me: result.liked, likes_count: result.likes_count }
        : r
      ));
    } catch {
      // Rollback
      setReviews(prev => prev.map(r => r.id === reviewId
        ? { ...r, liked_by_me: wasLiked, likes_count: r.likes_count + (wasLiked ? 1 : -1) }
        : r
      ));
    } finally {
      pendingLikes.current.delete(reviewId);
    }
  }, [isAuthenticated, user, router]);

  return {
    restaurant,
    allReviews,
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
