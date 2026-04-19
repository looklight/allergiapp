import { View, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { theme } from '../../constants/theme';
import { getRestrictionById } from '../../constants/foodRestrictions';
import { getAvatarById } from '../../constants/avatars';
import StarRating from '../StarRating';
import i18n from '../../utils/i18n';
import { getAnonymousLabel } from '../../utils/anonymousLabel';
import type { UnifiedReview } from '../../hooks/useRestaurantDetail';

interface ReviewCardProps {
  review: UnifiedReview;
  onImagePress: (imageUrl: string) => void;
  userNeeds?: string[];
  onLike?: () => void;
  onReport?: () => void;
  isReported?: boolean;
  isOwnReview?: boolean;
}

const getInitial = (name: string | null) => ((name ?? '?').charAt(0) || '?').toUpperCase();


const REVIEW_PHOTO_SIZE = 80;

export default function ReviewCard({ review: item, onImagePress, userNeeds, onLike, onReport, isReported, isOwnReview }: ReviewCardProps) {
  const router = useRouter();
  const avatarSource = item.avatarUrl ? getAvatarById(item.avatarUrl)?.source : null;
  const displayName = item.isAnonymous ? getAnonymousLabel(item.userId) : (item.displayName ?? getAnonymousLabel(item.userId));
  const canNavigateToProfile = !!item.userId && !item.isAnonymous;

  return (
    <View style={styles.contributionRow}>
      {/* Avatar + autore + data */}
      <View style={styles.contributionTop}>
        <TouchableOpacity
          style={styles.contributionAuthorTap}
          activeOpacity={canNavigateToProfile ? 0.6 : 1}
          disabled={!canNavigateToProfile}
          onPress={() => canNavigateToProfile && router.push(`/restaurants/user/${item.userId}`)}
        >
          {avatarSource ? (
            <Image source={avatarSource} style={styles.avatarImage} resizeMode="contain" />
          ) : (
            <View style={[styles.avatar, item.profileColor ? { backgroundColor: item.profileColor } : null]}>
              <Text style={[styles.avatarText, item.profileColor ? styles.avatarTextOnColor : null]}>
                {getInitial(item.isAnonymous ? null : item.displayName)}
              </Text>
            </View>
          )}
          <View style={styles.contributionMeta}>
            <Text style={styles.contributionAuthor}>{displayName}</Text>
            <Text style={styles.contributionDate}>
              {item.createdAt.toLocaleDateString(i18n.locale, {
                month: 'short', year: 'numeric',
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
            const isMatch = userNeeds?.includes(id) ?? false;
            const bg = isMatch ? theme.colors.primaryLight : theme.colors.amberLight;
            const color = isMatch ? theme.colors.success : theme.colors.amberText;
            return (
              <View key={id} style={[styles.dietaryBadge, { backgroundColor: bg }]}>
                {isMatch && (
                  <MaterialCommunityIcons name="check" size={11} color={color} />
                )}
                <Text style={[styles.dietaryBadgeText, { color }]}>{label}</Text>
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

      {/* Like + Report */}
      <View style={styles.actionRow}>
        <TouchableOpacity onPress={onLike} activeOpacity={0.7} style={styles.likeRow}>
          <MaterialCommunityIcons
            name={item.likedByMe ? 'thumb-up' : 'thumb-up-outline'}
            size={16}
            color={item.likedByMe ? theme.colors.primary : theme.colors.textSecondary}
          />
          <Text style={[styles.likeCount, item.likedByMe && { color: theme.colors.primary }, item.likesCount === 0 && { opacity: 0 }]}>
            {item.likesCount}
          </Text>
        </TouchableOpacity>
        {!isOwnReview && onReport && (
          <TouchableOpacity onPress={onReport} activeOpacity={0.6} style={styles.reportRow} hitSlop={8}>
            <MaterialCommunityIcons
              name={isReported ? 'flag' : 'flag-outline'}
              size={14}
              color={theme.colors.textDisabled}
            />
            <Text style={styles.reportText}>{isReported ? 'Segnalata' : 'Segnala'}</Text>
          </TouchableOpacity>
        )}
      </View>
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
  avatarImage: {
    width: 40,
    height: 40,
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
  avatarTextOnColor: {
    color: '#FFF',
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
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
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  likeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 2,
  },
  likeCount: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  reportRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 2,
  },
  reportText: {
    fontSize: 12,
    color: theme.colors.textDisabled,
  },
  reviewPhoto: {
    borderRadius: 10,
  },
});
