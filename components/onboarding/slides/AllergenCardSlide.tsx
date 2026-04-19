import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { Text, Surface } from 'react-native-paper';
import { theme } from '../../../constants/theme';
import OnboardingSlide from '../OnboardingSlide';
import type { OnboardingSlideProps } from '../types';

type Row = { icon: string; label: string };

const ROWS: readonly Row[] = [
  { icon: '🌾', label: 'Glutine / Gluten' },
  { icon: '🥚', label: 'Uova / Eggs' },
];

export default function AllergenCardSlide({ isActive }: OnboardingSlideProps) {
  const cardTranslate = useRef(new Animated.Value(50)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const cardScale = useRef(new Animated.Value(0.94)).current;
  const rowAnims = useRef(ROWS.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    if (!isActive) {
      cardTranslate.setValue(50);
      cardOpacity.setValue(0);
      cardScale.setValue(0.94);
      rowAnims.forEach(a => a.setValue(0));
      return;
    }

    const cardIn = Animated.parallel([
      Animated.timing(cardTranslate, {
        toValue: 0,
        duration: 360,
        delay: 80,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(cardOpacity, {
        toValue: 1,
        duration: 300,
        delay: 80,
        useNativeDriver: true,
      }),
      Animated.timing(cardScale, {
        toValue: 1,
        duration: 360,
        delay: 80,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]);

    const rowsIn = Animated.stagger(
      130,
      rowAnims.map(a =>
        Animated.timing(a, {
          toValue: 1,
          duration: 320,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        })
      )
    );

    const seq = Animated.sequence([cardIn, Animated.delay(80), rowsIn]);
    seq.start();
    return () => seq.stop();
  }, [isActive, cardTranslate, cardOpacity, cardScale, rowAnims]);

  return (
    <OnboardingSlide
      title="La tua card allergeni"
      description={
        <>
          Prima di ordinare mostra la <Text style={styles.bold}>card</Text> al cameriere per comunicare le tue esigenze in modo chiaro, nella lingua del posto.
        </>
      }
      visual={
        <Animated.View
          style={[
            styles.cardWrap,
            {
              opacity: cardOpacity,
              transform: [
                { translateY: cardTranslate },
                { scale: cardScale },
              ],
            },
          ]}
        >
          <Surface style={styles.card} elevation={4}>
            <View style={styles.header}>
              <Text style={styles.headerTitle}>⚠️ ALLERGIA</Text>
              <Text style={styles.headerSubtitle}>Sono allergico a:</Text>
            </View>

            <View style={styles.rows}>
              {ROWS.map((row, i) => {
                const anim = rowAnims[i];
                return (
                  <Animated.View
                    key={row.label}
                    style={[
                      styles.row,
                      i < ROWS.length - 1 && styles.rowDivider,
                      {
                        opacity: anim,
                        transform: [
                          {
                            translateX: anim.interpolate({
                              inputRange: [0, 1],
                              outputRange: [-12, 0],
                            }),
                          },
                        ],
                      },
                    ]}
                  >
                    <Text style={styles.rowIcon}>{row.icon}</Text>
                    <Text style={styles.rowLabel}>{row.label}</Text>
                  </Animated.View>
                );
              })}
            </View>
          </Surface>
        </Animated.View>
      }
    />
  );
}

const styles = StyleSheet.create({
  bold: {
    fontWeight: '700',
    color: theme.colors.textSecondary,
  },
  cardWrap: {
    width: '100%',
    maxWidth: 260,
    alignSelf: 'center',
  },
  card: {
    borderRadius: 14,
    backgroundColor: theme.colors.surface,
    overflow: 'hidden',
  },
  header: {
    backgroundColor: theme.colors.error,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.onPrimary,
    letterSpacing: 2,
  },
  headerSubtitle: {
    fontSize: 12,
    color: theme.colors.onPrimary,
    letterSpacing: 1,
    marginTop: 2,
  },
  rows: {
    paddingHorizontal: 14,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 12,
  },
  rowDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.divider,
  },
  rowIcon: {
    fontSize: 22,
  },
  rowLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.error,
  },
});
