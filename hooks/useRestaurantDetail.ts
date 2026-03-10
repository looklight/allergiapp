import { useState, useCallback, useMemo } from 'react';
import { Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useRouter, useFocusEffect } from 'expo-router';
import { RestaurantService } from '../services/restaurantService';
import { useAuth } from '../contexts/AuthContext';
import { useDishLikes } from './useDishLikes';
import type { Restaurant, Review, ReviewDish, MenuPhoto, Report } from '../services/restaurantService';

export interface UnifiedReview {
  key: string;
  userId?: string;
  displayName: string;
  rating?: number;
  text?: string;
  dishes: ReviewDish[];
  createdAt: Date;
  allergensSnapshot?: string[];
  dietarySnapshot?: string[];
}

export interface AggregatedDish {
  name: string;
  description?: string;
  photo_url?: string | null;
  thumbnail_url?: string | null;
  totalLikes: number;
  likerIds: Set<string>;
  count: number;
  sources: { reviewDishId: string }[];
}

export function useRestaurantDetail(restaurantId: string | undefined) {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();

  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isFavorite, setIsFavorite] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [userReview, setUserReview] = useState<Review | null>(null);
  const [menuPhotos, setMenuPhotos] = useState<MenuPhoto[]>([]);
  const [isUploadingMenu, setIsUploadingMenu] = useState(false);
  const [userReport, setUserReport] = useState<Report | null>(null);
  const [reports, setReports] = useState<Report[]>([]);

  const { dishLikes, toggleLike, isLiked: isDishLiked, getLikers, reloadLikes } = useDishLikes(restaurantId);

  const load = useCallback(async () => {
    if (!restaurantId) return;
    if (!restaurant) setIsLoading(true);
    const [rest, rv, mp, rp] = await Promise.all([
      RestaurantService.getRestaurant(restaurantId),
      RestaurantService.getReviews(restaurantId),
      RestaurantService.getMenuPhotos(restaurantId),
      RestaurantService.getReports(restaurantId),
    ]);
    setRestaurant(rest);
    setReviews(rv);
    setMenuPhotos(mp);
    setReports(rp);
    if (user?.uid) {
      const [ur, fav, urp] = await Promise.all([
        RestaurantService.getUserReview(restaurantId, user.uid),
        RestaurantService.isFavorite(user.uid, restaurantId),
        RestaurantService.getUserReport(restaurantId, user.uid),
      ]);
      setUserReview(ur);
      setIsFavorite(fav);
      setUserReport(urp);
    } else {
      setIsFavorite(false);
      setUserReport(null);
    }
    setIsLoading(false);
  }, [restaurantId, user?.uid]);

  useFocusEffect(useCallback(() => { load(); reloadLikes(); }, [load, reloadLikes]));

  const allReviews = useMemo((): UnifiedReview[] => {
    const items: UnifiedReview[] = [];

    for (const r of reviews) {
      items.push({
        key: `review-${r.id}`,
        userId: r.user_id ?? undefined,
        displayName: r.user_display_name ?? 'Utente',
        rating: r.rating,
        text: r.comment ?? undefined,
        dishes: r.dishes ?? [],
        createdAt: new Date(r.created_at),
        allergensSnapshot: r.allergens_snapshot,
        dietarySnapshot: r.dietary_snapshot,
      });
    }

    items.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return items;
  }, [reviews]);

  const aggregatedDishes = useMemo((): AggregatedDish[] => {
    const map = new Map<string, AggregatedDish>();

    for (const c of allReviews) {
      for (const d of c.dishes) {
        const normalized = d.name.trim().toLowerCase();
        const existing = map.get(normalized);

        const likers: string[] = d.id ? (dishLikes.get(d.id) ?? []) : [];

        if (existing) {
          if (!existing.photo_url && d.photo_url) {
            existing.photo_url = d.photo_url;
            existing.thumbnail_url = d.thumbnail_url;
          }
          if (!existing.description && d.description) existing.description = d.description;
          existing.totalLikes += likers.length;
          likers.forEach(uid => existing.likerIds.add(uid));
          existing.count++;
          if (d.id) {
            existing.sources.push({ reviewDishId: d.id });
          }
        } else {
          map.set(normalized, {
            name: d.name,
            description: d.description ?? undefined,
            photo_url: d.photo_url,
            thumbnail_url: d.thumbnail_url,
            totalLikes: likers.length,
            likerIds: new Set(likers),
            count: 1,
            sources: d.id ? [{ reviewDishId: d.id }] : [],
          });
        }
      }
    }

    return Array.from(map.values()).sort((a, b) => b.totalLikes - a.totalLikes || b.count - a.count);
  }, [allReviews, dishLikes]);

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
    aggregatedDishes,
    menuPhotos,
    reports,
    userReview,
    userReport,
    isFavorite,
    isLoading,
    isUploadingMenu,
    handleToggleFavorite,
    navigateToContribute,
    handleAddMenuPhoto,
    handleDeleteMenuPhoto,
    toggleLike,
    isDishLiked,
    getLikers,
  };
}
