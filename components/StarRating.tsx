import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const STAR_COLOR = '#F5A623';
const STAR_EMPTY_COLOR = '#D0D0D0';

interface StarRatingProps {
  rating: number;
  size?: number;
  onRate?: (rating: 1 | 2 | 3 | 4 | 5) => void;
  showValue?: boolean;
}

export default function StarRating({ rating, size = 20, onRate, showValue }: StarRatingProps) {
  const stars = [1, 2, 3, 4, 5];

  const getStarIcon = (position: number): 'star' | 'star-half-full' | 'star-outline' => {
    if (rating >= position) return 'star';
    if (rating >= position - 0.5) return 'star-half-full';
    return 'star-outline';
  };

  const getStarColor = (position: number) => {
    if (rating >= position - 0.5) return STAR_COLOR;
    return STAR_EMPTY_COLOR;
  };

  return (
    <View style={styles.container}>
      {stars.map(pos => {
        const icon = getStarIcon(pos);
        const color = getStarColor(pos);

        if (onRate) {
          return (
            <TouchableOpacity
              key={pos}
              onPress={() => onRate(pos as 1 | 2 | 3 | 4 | 5)}
              hitSlop={4}
              activeOpacity={0.6}
            >
              <MaterialCommunityIcons name={icon} size={size} color={color} />
            </TouchableOpacity>
          );
        }

        return (
          <MaterialCommunityIcons key={pos} name={icon} size={size} color={color} />
        );
      })}
      {showValue && rating > 0 && (
        <Text style={[styles.value, { fontSize: size * 0.7 }]}>
          {rating.toFixed(1)}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  value: {
    marginLeft: 4,
    fontWeight: '600',
    color: '#666',
  },
});
