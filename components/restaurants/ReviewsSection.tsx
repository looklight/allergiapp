import { View, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Text, Divider } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useState } from 'react';
import { theme } from '../../constants/theme';
import ReviewCard from './ReviewCard';
import i18n from '../../utils/i18n';
import type { UnifiedReview, ReviewSortOrder } from '../../hooks/useRestaurantDetail';

type Props = {
  reviews: UnifiedReview[];
  totalCount: number;
  hasMore: boolean;
  onLoadMore: () => void;
  isLoadingMore: boolean;
  reviewPhotos: { url: string }[];
  reviewSortOrder: ReviewSortOrder;
  setReviewSortOrder: (order: ReviewSortOrder) => void;
  hasUserNeeds: boolean;
  userNeeds: string[];
  onToggleReviewLike: (reviewId: string) => void;
  onImagePress: (url: string) => void;
  onReportReview: (reviewId: string) => void;
  reportedReviewIds: Set<string>;
  currentUserId?: string;
};

export default function ReviewsSection({
  reviews,
  totalCount,
  hasMore,
  onLoadMore,
  isLoadingMore,
  reviewPhotos,
  reviewSortOrder,
  setReviewSortOrder,
  hasUserNeeds,
  userNeeds,
  onToggleReviewLike,
  onImagePress,
  onReportReview,
  reportedReviewIds,
  currentUserId,
}: Props) {
  if (reviews.length === 0) {
    return (
      <View style={styles.emptySection}>
        <MaterialCommunityIcons name="comment-text-outline" size={36} color={theme.colors.textDisabled} />
        <Text style={styles.emptySectionTitle}>{i18n.t('restaurants.reviews.empty')}</Text>
        <Text style={styles.emptySectionText}>{i18n.t('restaurants.reviews.emptyHint')}</Text>
      </View>
    );
  }

  const [disclaimerVisible, setDisclaimerVisible] = useState(false);

  const sortOptions: { key: ReviewSortOrder; labelKey: string; icon: string }[] = [
    { key: 'recent', labelKey: 'restaurants.reviews.sort.recent', icon: 'clock-outline' },
    { key: 'rating', labelKey: 'restaurants.reviews.sort.rating', icon: 'star-outline' },
    { key: 'likes', labelKey: 'restaurants.reviews.sort.helpful', icon: 'thumb-up-outline' },
    ...(hasUserNeeds
      ? [{ key: 'relevance' as ReviewSortOrder, labelKey: 'restaurants.reviews.sort.forMe', icon: 'shield-check' }]
      : []),
  ];

  return (
    <View style={styles.section}>
      <View style={styles.reviewsHeader}>
        <View style={styles.titleRow}>
          <Text style={styles.sectionTitle}>{i18n.t('restaurants.reviews.titleWithCount', { count: totalCount })}</Text>
          <TouchableOpacity onPress={() => setDisclaimerVisible(v => !v)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <MaterialCommunityIcons
              name="information-outline"
              size={16}
              color={disclaimerVisible ? theme.colors.primary : theme.colors.textDisabled}
            />
          </TouchableOpacity>
        </View>
        {totalCount > 1 && (
          <View style={styles.sortRow}>
            {sortOptions.map(opt => {
              const isRating = opt.key === 'rating';
              const active = isRating
                ? reviewSortOrder === 'rating' || reviewSortOrder === 'rating-asc'
                : reviewSortOrder === opt.key;
              const onPress = () => {
                if (isRating) {
                  setReviewSortOrder(reviewSortOrder === 'rating' ? 'rating-asc' : 'rating');
                } else {
                  setReviewSortOrder(opt.key);
                }
              };
              return (
                <TouchableOpacity
                  key={opt.key}
                  onPress={onPress}
                  style={[styles.sortChip, active && styles.sortChipActive]}
                  activeOpacity={0.7}
                >
                  <MaterialCommunityIcons
                    name={opt.icon as any}
                    size={14}
                    color={active ? theme.colors.onPrimary : theme.colors.textSecondary}
                  />
                  {active && (
                    <Text style={styles.sortChipTextActive}>
                      {i18n.t(opt.labelKey)}
                    </Text>
                  )}
                  {active && isRating && (
                    <MaterialCommunityIcons
                      name={reviewSortOrder === 'rating-asc' ? 'chevron-up' : 'chevron-down'}
                      size={12}
                      color={theme.colors.onPrimary}
                    />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </View>
      {disclaimerVisible && (
        <View style={styles.disclaimerBox}>
          <Text style={styles.disclaimer}>{i18n.t('restaurants.reviews.disclaimer')}</Text>
        </View>
      )}
      {reviews.map((item, idx) => (
        <View key={item.key}>
          {idx > 0 && <Divider style={styles.divider} />}
          <ReviewCard
            review={item}
            userNeeds={userNeeds}
            onImagePress={(url) => {
              const i = reviewPhotos.findIndex(p => p.url === url);
              if (i >= 0) onImagePress(url);
            }}
            onLike={() => onToggleReviewLike(item.reviewId)}
            onReport={() => onReportReview(item.reviewId)}
            isReported={reportedReviewIds.has(item.reviewId)}
            isOwnReview={item.userId === currentUserId}
          />
        </View>
      ))}
      {hasMore && (
        <TouchableOpacity
          style={styles.loadMoreBtn}
          onPress={onLoadMore}
          disabled={isLoadingMore}
          activeOpacity={0.7}
        >
          {isLoadingMore ? (
            <ActivityIndicator size="small" color={theme.colors.primary} />
          ) : (
            <Text style={styles.loadMoreText}>{i18n.t('restaurants.reviews.loadMore')}</Text>
          )}
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: theme.colors.surface,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  reviewsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sortRow: {
    flexDirection: 'row',
    gap: 6,
  },
  sortChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 16,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  sortChipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  sortChipTextActive: {
    fontSize: 12,
    fontWeight: '500',
    color: theme.colors.onPrimary,
  },
  emptySection: {
    paddingHorizontal: 16,
    paddingVertical: 28,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    gap: 8,
  },
  disclaimerBox: {
    backgroundColor: theme.colors.background,
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  disclaimer: {
    fontSize: 11,
    color: theme.colors.textDisabled,
  },
  emptySectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  emptySectionText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  divider: {
    marginVertical: 14,
  },
  loadMoreBtn: {
    alignItems: 'center',
    paddingVertical: 14,
    marginTop: 8,
    borderRadius: 8,
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  loadMoreText: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.primary,
  },
});
