import { memo } from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../constants/theme';
import i18n from '../utils/i18n';
import type { RecentPlace } from '../utils/storage';

type Props = {
  places: RecentPlace[];
  onSelect: (place: RecentPlace) => void;
  onClear: () => void;
};

function RecentSearches({ places, onSelect, onClear }: Props) {
  if (places.length === 0) return null;

  return (
    <View style={styles.container}>
      <ScrollView keyboardShouldPersistTaps="handled" bounces={false}>
        <View style={styles.headerRow}>
          <Text style={styles.sectionHeader}>{i18n.t('restaurants.search.recent')}</Text>
          <TouchableOpacity onPress={onClear} hitSlop={8}>
            <Text style={styles.clearText}>{i18n.t('restaurants.search.clear')}</Text>
          </TouchableOpacity>
        </View>
        {places.map((p, i) => (
          <TouchableOpacity
            key={`rp-${i}-${p.name}`}
            style={styles.row}
            onPress={() => onSelect(p)}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons name="history" size={18} color={theme.colors.textSecondary} style={styles.icon} />
            <Text style={styles.name} numberOfLines={1}>{p.name}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

export default memo(RecentSearches);

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    maxHeight: 280,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 4,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  clearText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  icon: {
    marginRight: 10,
  },
  name: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.textPrimary,
  },
});
