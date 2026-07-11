import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Surface } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useMemo, memo } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { cardShadow, type AppTheme } from '../constants/theme';
import i18n from '../utils/i18n';
import { getCountryName } from '../utils/countryNames';
import StarRating from './StarRating';
import Avatar from './Avatar';
import type { UserReview } from '../services/restaurantService';
import { venueIconName } from '../constants/restaurantCategories';

interface Props {
  review: UserReview;
  onPress: () => void;
  /** Attribuzione autore in testa alla card (feed "Seguiti"): avatar + nome,
   *  tap → profilo. Omesso nelle liste "mie recensioni" dove l'autore è ovvio. */
  author?: {
    username: string | null;
    avatarUrl: string | null;
    onPress?: () => void;
  };
}

function UserReviewCard({ review, onPress, author }: Props) {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const restaurantName = review.restaurant_name ?? i18n.t('restaurants.myReviews.restaurantFallback');
  const countryName = getCountryName(review.restaurant_country_code, i18n.locale, review.restaurant_country);
  const location = [review.restaurant_city, countryName].filter(Boolean).join(', ');
  const date = new Date(review.created_at).toLocaleDateString(i18n.locale, {
    month: 'short', year: 'numeric',
  });
  const hasRating = review.rating != null && review.rating > 0;
  const photosCount = review.photos?.length ?? 0;
  const venueIcon = venueIconName(review.restaurant_offers_lodging);

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
      <Surface style={styles.card} elevation={0}>
        {author && (
          <TouchableOpacity
            style={styles.authorRow}
            onPress={author.onPress}
            disabled={!author.onPress}
            activeOpacity={0.6}
            accessibilityRole="button"
            accessibilityLabel={author.username ?? undefined}
          >
            <Avatar avatarId={author.avatarUrl} initial={author.username ?? undefined} size={22} />
            <Text style={styles.authorName} numberOfLines={1}>{author.username}</Text>
          </TouchableOpacity>
        )}
        <View style={styles.header}>
          <MaterialCommunityIcons name={venueIcon} size={16} color={theme.colors.primary} />
          <Text style={styles.name} numberOfLines={1}>{restaurantName}</Text>
          <MaterialCommunityIcons name="chevron-right" size={18} color={theme.colors.textSecondary} />
        </View>

        {(hasRating || location) && (
          <View style={styles.ratingRow}>
            {hasRating && <StarRating rating={review.rating} size={14} />}
            {location ? (
              <Text style={styles.location} numberOfLines={1}>{location}</Text>
            ) : null}
          </View>
        )}

        {review.comment ? (
          <Text style={styles.comment} numberOfLines={3}>{review.comment}</Text>
        ) : null}

        <View style={styles.footer}>
          {photosCount > 0 ? (
            <View style={styles.photoBadge}>
              <MaterialCommunityIcons name="image-outline" size={13} color={theme.colors.textSecondary} />
              <Text style={styles.footerText}>
                {i18n.t('restaurants.myReviews.photosCount', { count: photosCount })}
              </Text>
            </View>
          ) : <View />}
          <Text style={styles.date}>{date}</Text>
        </View>
      </Surface>
    </TouchableOpacity>
  );
}

// Memo: salta i re-render quando il dato `review` non cambia (es. mentre altri
// loader del profilo risolvono in background). `onPress` è ignorato di proposito:
// per una data card apre sempre lo stesso dettaglio. I cambi di tema passano
// comunque via context (useTheme), quindi la dark mode resta reattiva.
export default memo(UserReviewCard, (prev, next) => prev.review === next.review);

const makeStyles = (theme: AppTheme) => StyleSheet.create({
  card: {
    padding: 16,
    borderRadius: 14,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    ...cardShadow(theme, { radius: 8, height: 2 }),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  authorName: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    flexShrink: 1,
  },
  name: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.primary,
    flex: 1,
  },
  ratingRow: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  location: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    flex: 1,
  },
  comment: {
    fontSize: 14,
    color: theme.colors.textPrimary,
    lineHeight: 20,
    marginTop: 8,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  photoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  footerText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  date: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
});
