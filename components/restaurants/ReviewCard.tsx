import { View, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { theme } from '../../constants/theme';
import { getRestrictionById } from '../../constants/foodRestrictions';
import type { FoodRestrictionCategory } from '../../constants/foodRestrictions';
import StarRating from '../StarRating';
import i18n from '../../utils/i18n';
import type { UnifiedReview } from '../../hooks/useRestaurantDetail';

const CATEGORY_COLORS: Record<FoodRestrictionCategory, { bg: string; text: string }> = {
  eu_allergen:      { bg: theme.colors.orangeLight,  text: theme.colors.warning },
  intolerance:      { bg: theme.colors.amberLight,   text: theme.colors.amberText },
  diet:             { bg: theme.colors.primaryLight,  text: theme.colors.primary },
  food_sensitivity: { bg: theme.colors.background,   text: theme.colors.textSecondary },
};

interface ReviewCardProps {
  review: UnifiedReview;
  onImagePress: (imageUrl: string) => void;
}

const getInitial = (name: string) => (name.charAt(0) || '?').toUpperCase();

const REVIEW_PHOTO_SIZE = 56;

export default function ReviewCard({ review: item, onImagePress }: ReviewCardProps) {
  const router = useRouter();

  return (
    <View style={styles.contributionRow}>
      {/* Avatar + autore + data */}
      <View style={styles.contributionTop}>
        <TouchableOpacity
          style={styles.contributionAuthorTap}
          activeOpacity={item.userId ? 0.6 : 1}
          disabled={!item.userId}
          onPress={() => item.userId && router.push(`/restaurants/user/${item.userId}`)}
        >
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{getInitial(item.displayName)}</Text>
          </View>
          <View style={styles.contributionMeta}>
            <Text style={styles.contributionAuthor}>{item.displayName}</Text>
            <Text style={styles.contributionDate}>
              {item.createdAt.toLocaleDateString(i18n.locale, {
                day: 'numeric', month: 'short', year: 'numeric',
              })}
            </Text>
          </View>
        </TouchableOpacity>
        {item.rating != null && item.rating > 0 && (
          <StarRating rating={item.rating} size={14} />
        )}
      </View>

      {/* Testo */}
      {item.text && (
        <Text style={styles.contributionText}>{item.text}</Text>
      )}

      {/* Esigenze alimentari dell'autore */}
      {((item.allergensSnapshot?.length ?? 0) > 0 || (item.dietarySnapshot?.length ?? 0) > 0) && (
        <View style={styles.dietaryBadges}>
          {[...(item.dietarySnapshot ?? []), ...(item.allergensSnapshot ?? [])].map(id => {
            const r = getRestrictionById(id);
            if (!r) return null;
            const label = r.translations[i18n.locale as keyof typeof r.translations] ?? r.translations.en;
            const colors = CATEGORY_COLORS[r.category];
            return (
              <View key={id} style={[styles.dietaryBadge, { backgroundColor: colors.bg }]}>
                <Text style={[styles.dietaryBadgeText, { color: colors.text }]}>{label}</Text>
              </View>
            );
          })}
        </View>
      )}

      {/* Foto review */}
      {item.photos.length > 0 && (
        <View style={styles.photoGrid}>
          {item.photos.map((photo, idx) => (
            <TouchableOpacity key={idx} activeOpacity={0.8} onPress={() => onImagePress(photo.url)}>
              <Image source={{ uri: photo.thumbnailUrl }} style={[styles.reviewPhoto, { width: REVIEW_PHOTO_SIZE, height: REVIEW_PHOTO_SIZE }]} />
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  contributionRow: {
    gap: 6,
  },
  contributionTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  contributionAuthorTap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: theme.colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  contributionMeta: {
    flex: 1,
  },
  contributionAuthor: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  contributionDate: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  contributionText: {
    fontSize: 14,
    color: theme.colors.textPrimary,
    lineHeight: 20,
  },
  dietaryBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  dietaryBadge: {
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  dietaryBadgeText: {
    fontSize: 11,
    fontWeight: '500',
  },
  photoGrid: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  reviewPhoto: {
    borderRadius: 10,
  },
});
