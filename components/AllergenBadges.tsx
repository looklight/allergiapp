import { View, StyleSheet, Text } from 'react-native';
import { getRestrictionById } from '../constants/foodRestrictions';

interface AllergenBadgesProps {
  allergenIds: string[] | Set<string>;
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
      {ids.map(id => {
        const r = getRestrictionById(id);
        return r?.icon ? <Text key={id} style={{ fontSize: size }}>{r.icon}</Text> : null;
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
