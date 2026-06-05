import { useMemo } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Surface } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../../contexts/ThemeContext';
import type { AppTheme } from '../../../constants/theme';
import type { MyRestaurantItem } from '../../../services/myRestaurantsService';
import i18n from '../../../utils/i18n';
import { getCountryName } from '../../../utils/countryNames';

export default function MyRestaurantCard({
  item,
  onPress,
}: {
  item: MyRestaurantItem;
  onPress: () => void;
}) {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
      <Surface style={styles.card} elevation={0}>
        <View style={styles.titleRow}>
          <MaterialCommunityIcons
            name={item.is_favorite ? 'heart' : 'silverware-fork-knife'}
            size={16}
            color={item.is_favorite ? theme.colors.error : theme.colors.primary}
          />
          <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
          {item.my_rating != null && (
            <View style={styles.ratingBadge}>
              <MaterialCommunityIcons name="star" size={14} color={theme.colors.starFilled} />
              <Text style={styles.ratingText}>{item.my_rating}</Text>
            </View>
          )}
        </View>
        <View style={styles.metaRow}>
          {item.average_rating != null && (
            <View style={styles.avgRow}>
              <MaterialCommunityIcons name="star" size={13} color={theme.colors.starFilled} />
              <Text style={styles.avgText}>
                {item.average_rating.toLocaleString(i18n.locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
              </Text>
              <Text style={styles.avgCount}>({item.review_count})</Text>
            </View>
          )}
          <Text style={styles.city} numberOfLines={1}>
            {item.city ?? ''} · {getCountryName(item.country_code, i18n.locale, item.country)}
          </Text>
          {item.my_review_date ? (
            <Text style={styles.date}>
              {new Date(item.my_review_date).toLocaleDateString(i18n.locale, { month: 'short', year: 'numeric' })}
            </Text>
          ) : null}
        </View>

        {item.note ? (
          <Text style={styles.comment} numberOfLines={2}>{item.note}</Text>
        ) : null}

        {item.my_review_photos > 0 ? (
          <View style={styles.footer}>
            <View style={styles.photoBadge}>
              <MaterialCommunityIcons name="image-outline" size={13} color={theme.colors.textSecondary} />
              <Text style={styles.footerText}>
                {i18n.t('restaurants.myReviews.photosCount', { count: item.my_review_photos })}
              </Text>
            </View>
          </View>
        ) : null}
      </Surface>
    </TouchableOpacity>
  );
}

const makeStyles = (theme: AppTheme) => StyleSheet.create({
  card: {
    padding: 16,
    borderRadius: 14,
    backgroundColor: theme.colors.surface,
    shadowColor: theme.colors.shadow,
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    flex: 1,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  ratingText: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  avgRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  avgText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  avgCount: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  city: {
    fontSize: 13,
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
