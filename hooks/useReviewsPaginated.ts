import { useState, useCallback, useRef, useEffect } from 'react';
import {
  RestaurantService,
  REVIEWS_PAGE_SIZE,
  type Review,
  type ReviewSortOrder,
} from '../services/restaurantService';

/**
 * Self-contained hook for paginated, server-sorted reviews.
 *
 * - Owns all review state (data, pagination, sort order)
 * - Exposes `fetchFirstPage` for the parent's initial load
 * - Handles sort changes and loadMore internally
 * - Has its own stale-request protection via fetchIdRef
 */
export function useReviewsPaginated(
  restaurantId: string | undefined,
  userId: string | undefined,
  userAllergens: string[],
  userDiets: string[],
) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [offset, setOffset] = useState(0);
  const [sortOrder, setSortOrder] = useState<ReviewSortOrder>('recent');
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Stale-request protection — every fetch increments this;
  // when the response arrives, it's applied only if the id still matches.
  const fetchIdRef = useRef(0);

  // Always-current values for async calls (avoids stale closures
  // without adding volatile deps to useCallback).
  const paramsRef = useRef({ userId, userAllergens, userDiets, sortOrder });
  paramsRef.current = { userId, userAllergens, userDiets, sortOrder };

  // Stable fetch primitive — only recreated when restaurantId changes
  const fetchPage = useCallback(async (pageOffset: number) => {
    if (!restaurantId) return null;
    const p = paramsRef.current;
    return RestaurantService.getReviews(restaurantId, {
      userId: p.userId,
      sort: p.sortOrder,
      userAllergens: p.userAllergens,
      userDiets: p.userDiets,
      limit: REVIEWS_PAGE_SIZE,
      offset: pageOffset,
    });
  }, [restaurantId]);

  // Fetch page 0 and replace all reviews.
  // Called by the parent in the initial load AND internally on sort change.
  const fetchFirstPage = useCallback(async () => {
    const id = ++fetchIdRef.current;
    const result = await fetchPage(0);
    if (!result || id !== fetchIdRef.current) return;
    setReviews(result.reviews);
    setTotalCount(result.totalCount);
    setOffset(0);
  }, [fetchPage]);

  // Re-fetch when the user picks a different sort order.
  // Uses a ref comparison so it doesn't fire on mount.
  const prevSortRef = useRef(sortOrder);
  useEffect(() => {
    if (prevSortRef.current === sortOrder) return;
    prevSortRef.current = sortOrder;
    fetchFirstPage();
  }, [sortOrder, fetchFirstPage]);

  // Pagination
  const hasMore = offset + REVIEWS_PAGE_SIZE < totalCount;

  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore) return;
    const nextOffset = offset + REVIEWS_PAGE_SIZE;
    const id = ++fetchIdRef.current;
    setIsLoadingMore(true);
    try {
      const result = await fetchPage(nextOffset);
      if (!result || id !== fetchIdRef.current) return;
      setReviews(prev => [...prev, ...result.reviews]);
      setOffset(nextOffset);
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoadingMore, hasMore, offset, fetchPage]);

  // Lets the parent do optimistic updates (e.g. like toggle)
  // without exposing raw setReviews.
  const updateReviews = useCallback(
    (updater: (prev: Review[]) => Review[]) => setReviews(updater),
    [],
  );

  return {
    reviews,
    totalCount,
    sortOrder,
    setSortOrder,
    hasMore,
    loadMore,
    isLoadingMore,
    fetchFirstPage,
    updateReviews,
  };
}
