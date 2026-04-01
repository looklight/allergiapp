import { View, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Text, Divider } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../../constants/theme';
import ReviewCard from './ReviewCard';
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
}: Props) {
  if (reviews.length === 0) {
    return (
      <View style={styles.emptySection}>
        <MaterialCommunityIcons name="comment-text-outline" size={36} color={theme.colors.textDisabled} />
        <Text style={styles.emptySectionTitle}>Ancora nessuna recensione</Text>
        <Text style={styles.emptySectionText}>Sii il primo a condividere la tua esperienza</Text>
      </View>
    );
  }

  const sortOptions: { key: ReviewSortOrder; label: string; icon: string }[] = [
    { key: 'recent', label: 'Recenti', icon: 'clock-outline' },
    { key: 'rating', label: 'Stelle', icon: 'star-outline' },
    { key: 'likes', label: 'Più utili', icon: 'thumb-up-outline' },
    ...(hasUserNeeds
      ? [{ key: 'relevance' as ReviewSortOrder, label: 'Per me', icon: 'shield-check' }]
      : []),
  ];

  return (
    <View style={styles.section}>
      <View style={styles.reviewsHeader}>
        <Text style={styles.sectionTitle}>Recensioni ({totalCount})</Text>
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
                      {opt.label}
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
            <Text style={styles.loadMoreText}>Carica altre recensioni</Text>
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
