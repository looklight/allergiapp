import { View, StyleSheet, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  runOnJS,
} from 'react-native-reanimated';
import { useMemo, useState } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import type { AppTheme } from '../../constants/theme';
import { getRestrictionById } from '../../constants/foodRestrictions';
import StarRating from '../StarRating';
import Avatar from '../Avatar';
import i18n from '../../utils/i18n';
import { getAuthorLabel } from '../../utils/getDisplayName';
import { shouldOfferTranslation, translateReview } from '../../services/reviewTranslationService';
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

const REVIEW_PHOTO_SIZE = 80;

export default function ReviewCard({ review: item, onImagePress, userNeeds, onLike, onReport, isReported, isOwnReview }: ReviewCardProps) {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const router = useRouter();
  // uid della route corrente: valorizzato solo dentro /restaurants/user/[uid].
  // Serve a non riaprire il profilo che stai già guardando (duplicato no-op);
  // la navigazione verso altri profili resta libera (discovery).
  const { uid: currentProfileUid } = useLocalSearchParams<{ uid?: string }>();
  const displayName = getAuthorLabel({
    userId: item.userId,
    username: item.displayName,
    isAnonymous: item.isAnonymous,
  });
  const canNavigateToProfile =
    !!item.userId && !item.isAnonymous && !item.isInactive && item.userId !== currentProfileUid;

  const [translation, setTranslation] = useState<string | null>(null);
  const [showTranslation, setShowTranslation] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [translateFailed, setTranslateFailed] = useState(false);

  const canTranslate = !!item.text && !isOwnReview && shouldOfferTranslation(item.language);
  const displayedText = showTranslation && translation ? translation : item.text;

  const handleTranslatePress = async () => {
    if (showTranslation) {
      setShowTranslation(false);
      return;
    }
    if (translation) {
      setShowTranslation(true);
      return;
    }
    setIsTranslating(true);
    setTranslateFailed(false);
    try {
      const translated = await translateReview(item.text!, item.language);
      setTranslation(translated);
      setShowTranslation(true);
    } catch {
      setTranslateFailed(true);
    } finally {
      setIsTranslating(false);
    }
  };

  const burstScale = useSharedValue(0);
  const burstOpacity = useSharedValue(0);

  const burstStyle = useAnimatedStyle(() => ({
    transform: [{ scale: burstScale.value }],
    opacity: burstOpacity.value,
  }));

  const setLikeIfNeeded = () => {
    if (onLike && !item.likedByMe) onLike();
  };

  const doubleTapLike = Gesture.Tap()
    .numberOfTaps(2)
    .maxDelay(280)
    .onEnd(() => {
      burstScale.value = 0;
      burstOpacity.value = 0;
      burstScale.value = withSequence(
        withTiming(1.15, { duration: 180 }),
        withTiming(1, { duration: 120 }),
        withTiming(0, { duration: 220 }),
      );
      burstOpacity.value = withSequence(
        withTiming(1, { duration: 120 }),
        withTiming(1, { duration: 280 }),
        withTiming(0, { duration: 180 }),
      );
      runOnJS(setLikeIfNeeded)();
    });

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
          <Avatar
            avatarId={item.avatarUrl}
            isAnonymous={item.isAnonymous}
            isInactive={item.isInactive}
            initial={item.isAnonymous || item.isInactive ? undefined : item.displayName ?? undefined}
            size="sm"
          />
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
        isOwnReview ? (
          <Text style={styles.contributionText}>{displayedText}</Text>
        ) : (
          <GestureDetector gesture={doubleTapLike}>
            <View>
              <Text style={styles.contributionText}>{displayedText}</Text>
            </View>
          </GestureDetector>
        )
      )}

      {/* Traduzione: originale + Traduci / tradotto + Mostra originale */}
      {canTranslate && (
        <View style={styles.translateRow}>
          {isTranslating ? (
            <ActivityIndicator size="small" color={theme.colors.textSecondary} />
          ) : showTranslation ? (
            <>
              <Text style={styles.translateCaption}>{i18n.t('restaurants.reviews.card.translatedAuto')}</Text>
              <TouchableOpacity onPress={handleTranslatePress} activeOpacity={0.6} hitSlop={8}>
                <Text style={styles.translateLink}>{i18n.t('restaurants.reviews.card.showOriginal')}</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity onPress={handleTranslatePress} activeOpacity={0.6} hitSlop={8}>
                <Text style={styles.translateLink}>{i18n.t('restaurants.reviews.card.translate')}</Text>
              </TouchableOpacity>
              {translateFailed && (
                <Text style={styles.translateCaption}>{i18n.t('restaurants.reviews.card.translateError')}</Text>
              )}
            </>
          )}
        </View>
      )}

      {/* Esigenze alimentari dell'autore */}
      {((item.allergensSnapshot?.length ?? 0) > 0 || (item.dietarySnapshot?.length ?? 0) > 0) && (
        <View style={styles.dietaryBadges}>
          {[...(item.dietarySnapshot ?? []), ...(item.allergensSnapshot ?? [])]
            .slice()
            .sort((a, b) => {
              const aMatch = userNeeds?.includes(a) ? 1 : 0;
              const bMatch = userNeeds?.includes(b) ? 1 : 0;
              return bMatch - aMatch;
            })
            .map(id => {
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
        {isOwnReview ? (
          // Sulle proprie recensioni mostriamo solo il counter (non interattivo).
          <View style={styles.likeRow}>
            <MaterialCommunityIcons
              name="thumb-up-outline"
              size={16}
              color={theme.colors.textSecondary}
            />
            <Text style={[styles.likeCount, item.likesCount === 0 && { opacity: 0 }]}>
              {item.likesCount}
            </Text>
          </View>
        ) : (
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
        )}
        {!isOwnReview && onReport && (
          <TouchableOpacity onPress={onReport} activeOpacity={0.6} style={styles.reportRow} hitSlop={8}>
            <MaterialCommunityIcons
              name={isReported ? 'flag' : 'flag-outline'}
              size={14}
              color={theme.colors.textDisabled}
            />
            <Text style={styles.reportText}>{isReported ? i18n.t('restaurants.reviews.card.reportedFlag') : i18n.t('restaurants.reviews.card.reportFlag')}</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Burst del doppio-tap: posizionato sull'intera card così l'icona da 56px
          ha sempre spazio verticale anche con testo di una sola riga. */}
      <Animated.View pointerEvents="none" style={[styles.likeBurst, burstStyle]}>
        <MaterialCommunityIcons name="thumb-up" size={56} color={theme.colors.primary} />
      </Animated.View>
    </View>
  );
}

const makeStyles = (theme: AppTheme) => StyleSheet.create({
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
  translateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  translateLink: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  translateCaption: {
    fontSize: 12,
    color: theme.colors.textDisabled,
  },
  likeBurst: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
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
