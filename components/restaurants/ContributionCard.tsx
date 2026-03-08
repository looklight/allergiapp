import { View, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { theme } from '../../constants/theme';
import StarRating from '../StarRating';
import AllergenBadges from '../AllergenBadges';
import type { UnifiedContribution } from '../../hooks/useRestaurantDetail';

interface ContributionCardProps {
  contribution: UnifiedContribution;
  getLikers: (contributionId: string, dishIndex: number) => string[];
  isDishLiked: (contributionId: string, dishIndex: number) => boolean;
  toggleLike: (contributionId: string, dishIndex: number) => Promise<void>;
  onDishPress: (dish: { imageUrl?: string; name: string; description?: string }) => void;
  onImagePress: (imageUrl: string) => void;
}

const getInitial = (name: string) => (name.charAt(0) || '?').toUpperCase();

export default function ContributionCard({
  contribution: item,
  getLikers,
  isDishLiked,
  toggleLike,
  onDishPress,
  onImagePress,
}: ContributionCardProps) {
  const router = useRouter();
  const isContribution = item.key.startsWith('contrib-');
  const contribId = item.key.replace(/^contrib-/, '');

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

      {/* Foto legacy review */}
      {item.imageUrl && (
        <TouchableOpacity onPress={() => onImagePress(item.imageUrl!)}>
          <Image source={{ uri: item.imageUrl }} style={styles.contributionImage} />
        </TouchableOpacity>
      )}

      {/* Piatti del contributo */}
      {item.dishes.length > 0 && (
        <View style={styles.contributionDishes}>
          {item.dishes.map((d, dIdx) => {
            const likeCount = getLikers(contribId, dIdx).length;
            const liked = isDishLiked(contribId, dIdx);

            return (
              <TouchableOpacity
                key={dIdx}
                style={styles.dishCard}
                activeOpacity={0.7}
                onPress={() => onDishPress({ imageUrl: d.imageUrl, name: d.name, description: d.description })}
              >
                {(d.thumbnailUrl ?? d.imageUrl) ? (
                  <Image source={{ uri: (d.thumbnailUrl ?? d.imageUrl)! }} style={styles.dishPhoto} />
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
                    <AllergenBadges allergenIds={d.allergenSafe} />
                    {isContribution && (
                      <TouchableOpacity
                        style={styles.dishLikeBtn}
                        activeOpacity={0.6}
                        hitSlop={8}
                        onPress={(e) => {
                          e.stopPropagation?.();
                          toggleLike(contribId, dIdx);
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
  contributionImage: {
    width: '100%',
    height: 180,
    borderRadius: 12,
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
});
