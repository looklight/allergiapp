import { View, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { theme } from '../../constants/theme';
import { ALLERGENS } from '../../constants/allergens';
import { DIETS } from '../../constants/diets';
import StarRating from '../StarRating';
import type { UnifiedReview } from '../../hooks/useRestaurantDetail';

interface ReviewCardProps {
  review: UnifiedReview;
  getLikers: (reviewDishId: string) => string[];
  isDishLiked: (reviewDishId: string) => boolean;
  toggleLike: (reviewDishId: string) => Promise<void>;
  onDishPress: (dish: { photo_url?: string | null; name: string; description?: string }) => void;
  onImagePress: (imageUrl: string) => void;
}

const getInitial = (name: string) => (name.charAt(0) || '?').toUpperCase();

export default function ReviewCard({
  review: item,
  getLikers,
  isDishLiked,
  toggleLike,
  onDishPress,
  onImagePress,
}: ReviewCardProps) {
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
              {item.createdAt.toLocaleDateString('it-IT', {
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
          {(item.dietarySnapshot ?? []).map(dId => {
            const diet = DIETS.find(x => x.id === dId);
            return diet ? <Text key={dId} style={styles.dietaryBadgeIcon}>{diet.icon}</Text> : null;
          })}
          {(item.allergensSnapshot ?? []).map(aId => {
            const allergen = ALLERGENS.find(x => x.id === aId);
            return allergen ? <Text key={aId} style={styles.dietaryBadgeIcon}>{allergen.icon}</Text> : null;
          })}
        </View>
      )}

      {/* Piatti del contributo */}
      {item.dishes.length > 0 && (
        <View style={styles.contributionDishes}>
          {item.dishes.map((d, dIdx) => {
            const likeCount = d.id ? getLikers(d.id).length : 0;
            const liked = d.id ? isDishLiked(d.id) : false;

            return (
              <TouchableOpacity
                key={d.id ?? dIdx}
                style={styles.dishCard}
                activeOpacity={0.7}
                onPress={() => onDishPress({ photo_url: d.photo_url, name: d.name, description: d.description ?? undefined })}
              >
                {d.photo_url ? (
                  <Image source={{ uri: d.thumbnail_url ?? d.photo_url }} style={styles.dishPhoto} />
                ) : (
                  <View style={styles.dishPhotoPlaceholder}>
                    <MaterialCommunityIcons name="silverware-fork-knife" size={20} color={theme.colors.primary} />
                  </View>
                )}
                <View style={styles.dishContent}>
                  <Text style={styles.dishName}>{d.name}</Text>
                  {d.description && (
                    <Text style={styles.dishDescription}>{d.description}</Text>
                  )}
                  <View style={styles.dishBottomRow}>
                    <View />
                    {d.id && (
                      <TouchableOpacity
                        style={styles.dishLikeBtn}
                        activeOpacity={0.6}
                        hitSlop={8}
                        onPress={(e) => {
                          e.stopPropagation?.();
                          toggleLike(d.id);
                        }}
                      >
                        <MaterialCommunityIcons
                          name={liked ? 'thumb-up' : 'thumb-up-outline'}
                          size={16}
                          color={liked ? theme.colors.primary : theme.colors.textSecondary}
                        />
                        {likeCount > 0 && (
                          <Text style={[styles.dishLikeCount, liked && styles.dishLikeCountPrimary]}>
                            {likeCount}
                          </Text>
                        )}
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
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
  contributionDishes: {
    gap: 8,
    marginTop: 2,
  },
  dishCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: theme.colors.background,
    borderRadius: 12,
    padding: 10,
  },
  dishPhoto: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  dishPhotoPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dishContent: {
    flex: 1,
  },
  dishName: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.textPrimary,
  },
  dishDescription: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  dishBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  dishLikeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingVertical: 2,
    paddingHorizontal: 4,
  },
  dishLikeCount: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  dishLikeCountPrimary: {
    color: theme.colors.primary,
  },
  dietaryBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 2,
    marginTop: 2,
  },
  dietaryBadgeIcon: {
    fontSize: 14,
  },
});
