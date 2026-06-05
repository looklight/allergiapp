/**
 * Placeholder a "respiro" (pulse di opacità) per dati non ancora caricati.
 * Usato al primo caricamento, quando non esiste ancora un valore in cache da
 * mostrare: occupa spazio fisso così non c'è layout shift quando il dato vero
 * lo rimpiazza. Animated core (no reanimated): basta un Value per l'opacità.
 */

import { useEffect, useRef } from 'react';
import { Animated, type DimensionValue, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

type Props = {
  width: DimensionValue;
  height?: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
  /** Annuncio per screen reader (es. "Caricamento"); se assente il box è nascosto agli AT. */
  accessibilityLabel?: string;
};

export default function Skeleton({ width, height = 14, radius = 4, style, accessibilityLabel }: Props) {
  const theme = useTheme();
  const pulse = useRef(new Animated.Value(0.45)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 650, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.45, duration: 650, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return (
    <Animated.View
      accessible={!!accessibilityLabel}
      accessibilityLabel={accessibilityLabel}
      importantForAccessibility={accessibilityLabel ? 'yes' : 'no-hide-descendants'}
      style={[
        { width, height, borderRadius: radius, backgroundColor: theme.colors.divider, opacity: pulse },
        style,
      ]}
    />
  );
}
