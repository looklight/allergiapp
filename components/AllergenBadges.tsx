import { View, StyleSheet, Text } from 'react-native';
import { ALLERGENS } from '../constants/allergens';
import type { AllergenId } from '../types';

interface AllergenBadgesProps {
  allergenIds: AllergenId[] | Set<string>;
  /** Font size for emoji icons. Default: 16 */
  size?: number;
  /** Gap between icons. Default: 2 */
  gap?: number;
}

export default function AllergenBadges({ allergenIds, size = 16, gap = 2 }: AllergenBadgesProps) {
  const ids = allergenIds instanceof Set ? Array.from(allergenIds) : allergenIds;
  if (ids.length === 0) return null;

  return (
    <View style={[styles.row, { gap }]}>
      {ids.map(aId => {
        const a = ALLERGENS.find(x => x.id === aId);
        return a ? <Text key={aId} style={{ fontSize: size }}>{a.icon}</Text> : null;
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    marginTop: 4,
  },
});
