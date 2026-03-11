import { useState, useCallback, useMemo, useRef } from 'react';
import { Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useRouter, useFocusEffect } from 'expo-router';
import { RestaurantService } from '../services/restaurantService';
import { useAuth } from '../contexts/AuthContext';
import type { Restaurant, Review, ReviewPhoto, MenuPhoto, Report, CuisineVote } from '../services/restaurantService';

export interface UnifiedReview {
  key: string;
  userId?: string;
  displayName: string;
  rating?: number;
  text?: string;
  photos: ReviewPhoto[];
  createdAt: Date;
  allergensSnapshot?: string[];
  dietarySnapshot?: string[];
}

export type ReviewSortOrder = 'recent' | 'rating' | 'relevance';

export function useRestaurantDetail(restaurantId: string | undefined) {
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
        RestaurantService.getReviews(restaurantId),
        RestaurantService.getMenuPhotos(restaurantId),
        RestaurantService.getReports(restaurantId),
        RestaurantService.getCuisineVotes(restaurantId),
      ]);
      const userPromise = user?.uid
        ? Promise.all([
            RestaurantService.getUserReview(restaurantId, user.uid),
            RestaurantService.isFavorite(user.uid, restaurantId),
            RestaurantService.getUserReport(restaurantId, user.uid),
          ])
        : Promise.resolve([null, false, null] as const);

      const [[rest, rv, mp, rp, cv], [ur, fav, urp]] = await Promise.all([basePromise, userPromise]);

      if (loadId !== loadIdRef.current) return;

      setRestaurant(rest);
      setReviews(rv);
      setMenuPhotos(mp);
      setReports(rp);
      setCuisineVotes(cv);
      setUserReview(ur);
      setIsFavorite(fav ?? false);
      setUserReport(urp);
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
        userId: r.user_id ?? undefined,
        displayName: r.user_display_name ?? 'Utente',
        rating: r.rating,
        text: r.comment ?? undefined,
        photos: r.photos ?? [],
        createdAt: new Date(r.created_at),
        allergensSnapshot: r.allergens_snapshot,
        dietarySnapshot: r.dietary_snapshot,
      });
    }

    switch (reviewSortOrder) {
      case 'rating':
        items.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
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
    setIsFavorite(expected);
    setRestaurant(prev => prev ? {
      ...prev,
      favorite_count: (prev.favorite_count ?? 0) + (expected ? 1 : -1),
    } : prev);

    try {
      const actual = await RestaurantService.toggleFavorite(user.uid, restaurant.id);
      if (actual !== expected) {
        setIsFavorite(actual);
        setRestaurant(prev => prev ? {
          ...prev,
          favorite_count: (prev.favorite_count ?? 0) + (actual ? 1 : -1) - (expected ? 1 : -1),
        } : prev);
      }
    } catch {
      // Rollback optimistic update
      setIsFavorite(!expected);
      setRestaurant(prev => prev ? {
        ...prev,
        favorite_count: (prev.favorite_count ?? 0) + (expected ? -1 : 1),
      } : prev);
    }
  }, [isAuthenticated, user, restaurant, isFavorite, router]);

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
      quality: 1,
    });
    if (result.canceled || !result.assets[0]) return;

    setIsUploadingMenu(true);
    const photo = await RestaurantService.addMenuPhoto(restaurantId, result.assets[0].uri, user.uid);
    if (photo) {
      setMenuPhotos(prev => [photo, ...prev]);
    }
    setIsUploadingMenu(false);
  }, [isAuthenticated, user, restaurantId, router]);

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
    handleToggleFavorite,
    navigateToContribute,
    handleAddMenuPhoto,
    handleDeleteMenuPhoto,
  };
}
