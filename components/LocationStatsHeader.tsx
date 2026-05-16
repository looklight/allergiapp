import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { theme } from '../constants/theme';
import i18n from '../utils/i18n';
import type { LocationStats } from '../hooks/useLocationFilters';

interface Props {
  stats: LocationStats;
  /** i18n key per la label del counter principale (es. 'restaurants.user.stats.reviews') */
  itemsLabelKey: string;
}

export default function LocationStatsHeader({ stats, itemsLabelKey }: Props) {
  return (
    <View style={styles.row}>
      <StatPill value={stats.items} label={i18n.t(itemsLabelKey, { count: stats.items })} />
      {stats.cities > 0 && (
        <StatPill value={stats.cities} label={i18n.t('restaurants.user.stats.cities', { count: stats.cities })} />
      )}
      {stats.countries > 0 && (
        <StatPill value={stats.countries} label={i18n.t('restaurants.user.stats.countries', { count: stats.countries })} />
      )}
    </View>
  );
}

function StatPill({ value, label }: { value: number; label: string }) {
  return (
    <View style={styles.pill}>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  pill: {
    flex: 1,
    minWidth: 80,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
  },
  value: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  label: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 2,
    textAlign: 'center',
  },
});
