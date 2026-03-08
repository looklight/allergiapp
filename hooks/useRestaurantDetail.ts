import { useState, useCallback, useMemo } from 'react';
import { Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useRouter, useFocusEffect } from 'expo-router';
import { RestaurantService } from '../services/restaurantService';
import { useAuth } from '../contexts/AuthContext';
import { useDishLikes } from './useDishLikes';
import type { Restaurant, Dish, Review, Contribution, ContributionDish, MenuPhoto, RestaurantReport } from '../types/restaurants';
import type { DietaryNeeds } from '../types';

export interface UnifiedContribution {
  key: string;
  userId?: string;
  displayName: string;
  rating?: number;
  text?: string;
  dishes: ContributionDish[];
  createdAt: Date;
  imageUrl?: string;
  userDietaryNeeds?: DietaryNeeds;
}

export interface AggregatedDish {
  name: string;
  description?: string;
  imageUrl?: string;
  thumbnailUrl?: string;
  totalLikes: number;
  likerIds: Set<string>;
  count: number;
  sources: { contributionKey: string; dishIndex: number }[];
}

export function useRestaurantDetail(restaurantId: string | undefined) {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();

  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [legacyDishes, setLegacyDishes] = useState<Dish[]>([]);
  const [legacyReviews, setLegacyReviews] = useState<Review[]>([]);
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [isFavorite, setIsFavorite] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [userContribution, setUserContribution] = useState<Contribution | null>(null);
  const [menuPhotos, setMenuPhotos] = useState<MenuPhoto[]>([]);
  const [isUploadingMenu, setIsUploadingMenu] = useState(false);
  const [userReport, setUserReport] = useState<RestaurantReport | null>(null);
  const [reports, setReports] = useState<RestaurantReport[]>([]);

  const { dishLikes, toggleLike, isLiked: isDishLiked, getLikers, reloadLikes } = useDishLikes(restaurantId);

  const load = useCallback(async () => {
    if (!restaurantId) return;
    if (!restaurant) setIsLoading(true);
    const [rest, d, r, c, mp, rp] = await Promise.all([
      RestaurantService.getRestaurant(restaurantId),
      RestaurantService.getDishes(restaurantId),
      RestaurantService.getReviews(restaurantId),
      RestaurantService.getContributions(restaurantId),
      RestaurantService.getMenuPhotos(restaurantId),
      RestaurantService.getReports(restaurantId),
    ]);
    setRestaurant(rest);
    setLegacyDishes(d);
    setLegacyReviews(r);
    setContributions(c);
    setMenuPhotos(mp);
    setReports(rp);
    if (user?.uid) {
      const [uc, fav, ur] = await Promise.all([
        RestaurantService.getUserContribution(restaurantId, user.uid),
        RestaurantService.isFavorite(user.uid, restaurantId),
        RestaurantService.getUserReport(restaurantId, user.uid),
      ]);
      setUserContribution(uc);
      setIsFavorite(fav);
      setUserReport(ur);
    } else {
      setIsFavorite(false);
      setUserReport(null);
    }
    setIsLoading(false);
  }, [restaurantId, user?.uid]);

  useFocusEffect(useCallback(() => { load(); reloadLikes(); }, [load, reloadLikes]));

  const allContributions = useMemo((): UnifiedContribution[] => {
    const items: UnifiedContribution[] = [];

    for (const c of contributions) {
      items.push({
        key: `contrib-${c.id}`,
        userId: c.userId,
        displayName: c.displayName,
        rating: c.rating,
        text: c.text,
        dishes: c.dishes,
        createdAt: c.createdAt.toDate(),
        userDietaryNeeds: c.userDietaryNeeds,
      });
    }

    for (const r of legacyReviews) {
      items.push({
        key: `review-${r.id}`,
        userId: r.userId,
        displayName: r.displayName,
        rating: r.rating,
        text: r.text,
        dishes: [],
        createdAt: r.createdAt.toDate(),
        imageUrl: r.imageUrl,
      });
    }

    for (const d of legacyDishes) {
      items.push({
        key: `dish-${d.id}`,
        displayName: 'Utente',
        dishes: [{
          name: d.name,
          description: d.description,
        }],
        createdAt: d.addedAt.toDate(),
      });
    }

    items.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return items;
  }, [contributions, legacyReviews, legacyDishes]);

  const aggregatedDishes = useMemo((): AggregatedDish[] => {
    const map = new Map<string, AggregatedDish>();

    for (const c of allContributions) {
      const isContrib = c.key.startsWith('contrib-');
      for (let dIdx = 0; dIdx < c.dishes.length; dIdx++) {
        const d = c.dishes[dIdx];
        const normalized = d.name.trim().toLowerCase();
        const existing = map.get(normalized);

        let likers: string[] = [];
        if (isContrib) {
          const contribId = c.key.replace(/^contrib-/, '');
          const likeKey = `${contribId}_${dIdx}`;
          likers = dishLikes.get(likeKey) ?? [];
        }

        if (existing) {
          if (!existing.imageUrl && d.imageUrl) {
            existing.imageUrl = d.imageUrl;
            existing.thumbnailUrl = d.thumbnailUrl;
          }
          if (!existing.description && d.description) existing.description = d.description;
          existing.totalLikes += likers.length;
          likers.forEach(uid => existing.likerIds.add(uid));
          existing.count++;
          if (isContrib) {
            existing.sources.push({ contributionKey: c.key, dishIndex: dIdx });
          }
        } else {
          map.set(normalized, {
            name: d.name,
            description: d.description,
            imageUrl: d.imageUrl,
            thumbnailUrl: d.thumbnailUrl,
            totalLikes: likers.length,
            likerIds: new Set(likers),
            count: 1,
            sources: isContrib ? [{ contributionKey: c.key, dishIndex: dIdx }] : [],
          });
        }
      }
    }

    return Array.from(map.values()).sort((a, b) => b.totalLikes - a.totalLikes || b.count - a.count);
  }, [allContributions, dishLikes]);

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
      favoriteCount: prev.favoriteCount + (expected ? 1 : -1),
    } : prev);

    const actual = await RestaurantService.toggleFavorite(user.uid, restaurant);
    if (actual !== expected) {
      setIsFavorite(actual);
      setRestaurant(prev => prev ? {
        ...prev,
        favoriteCount: prev.favoriteCount + (actual ? 1 : -1) - (expected ? 1 : -1),
      } : prev);
    }
  }, [isAuthenticated, user, restaurant, isFavorite, router]);

  const navigateToContribute = useCallback((prefilledRating?: 1 | 2 | 3 | 4 | 5, editContributionId?: string) => {
    if (!isAuthenticated) {
      router.push('/auth/login');
      return;
    }
    let url = `/restaurants/add-contribution?restaurantId=${restaurantId}&restaurantName=${encodeURIComponent(restaurant?.name ?? '')}&restaurantAddress=${encodeURIComponent(restaurant?.address ?? '')}&restaurantRating=${restaurant?.averageRating ?? 0}&restaurantRatingCount=${restaurant?.ratingCount ?? 0}`;
    if (prefilledRating) url += `&prefillRating=${prefilledRating}`;
    if (editContributionId) url += `&contributionId=${editContributionId}`;
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
    const photo = await RestaurantService.addMenuPhoto(restaurantId, result.assets[0].uri, user.uid, user.displayName ?? 'Utente');
    if (photo) {
      setMenuPhotos(prev => [photo, ...prev]);
      setRestaurant(prev => prev ? { ...prev, menuPhotoCount: (prev.menuPhotoCount ?? 0) + 1 } : prev);
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
              setRestaurant(prev => prev ? { ...prev, menuPhotoCount: Math.max(0, (prev.menuPhotoCount ?? 1) - 1) } : prev);
            }
          },
        },
      ],
    );
  }, [user, restaurantId]);

  return {
    restaurant,
    allContributions,
    aggregatedDishes,
    menuPhotos,
    reports,
    userContribution,
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
