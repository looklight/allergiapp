import React from 'react';
import { Text, StyleSheet, View, TextStyle, ViewStyle, StyleProp } from 'react-native';
import { FOOD_SVG_ICONS, type FoodIconId } from '../assets/icons/food';

interface FoodIconProps {
  // Il prop accetta string per non vincolare i call site, ma la lookup nella
  // map è type-safe perché FOOD_SVG_ICONS è tipato a FoodIconId.
  id: string;
  emoji: string;
  size?: number;
  // Applicato sia al wrapper View (caso SVG) che al Text (caso emoji).
  // I prop layout (margin*) funzionano in entrambi; fontSize/lineHeight sono
  // ignorati dal View ma applicati al Text — comportamento desiderato.
  style?: StyleProp<TextStyle & ViewStyle>;
}

// Le SVG AI-generated tendono ad avere whitespace interno nel viewBox, mentre
// le emoji di sistema riempiono il box. Senza compensazione, le SVG sembrano
// più piccole rispetto agli emoji vicini a parità di size.
const SVG_VISUAL_BOOST = 1.2;

export default function FoodIcon({ id, emoji, size = 18, style }: FoodIconProps) {
  const SvgComponent = FOOD_SVG_ICONS[id as FoodIconId];
  if (SvgComponent) {
    const svgSize = size * SVG_VISUAL_BOOST;
    return (
      <View style={[style, styles.svgWrap, { width: size, height: size }]}>
        <SvgComponent width={svgSize} height={svgSize} />
      </View>
    );
  }
  return <Text style={style ?? defaultEmojiStyle(size)}>{emoji}</Text>;
}

const defaultEmojiStyle = (size: number) => ({
  fontSize: size - 2,
  lineHeight: size + 4,
  textAlign: 'center' as const,
});

const styles = StyleSheet.create({
  svgWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
