import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { Text, Surface } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../../../constants/theme';
import StarRating from '../../StarRating';
import OnboardingSlide from '../OnboardingSlide';
import type { OnboardingSlideProps } from '../types';

const CHIPS: readonly string[] = ['Glutine', 'Vegan'];

export default function ShareExperiencesSlide({ isActive }: OnboardingSlideProps) {
  const cardTranslate = useRef(new Animated.Value(40)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const chipAnims = useRef(CHIPS.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    if (!isActive) {
      cardTranslate.setValue(40);
      cardOpacity.setValue(0);
      chipAnims.forEach(a => a.setValue(0));
      return;
    }

    const cardIn = Animated.parallel([
      Animated.timing(cardTranslate, {
        toValue: 0,
        duration: 380,
        delay: 80,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(cardOpacity, {
        toValue: 1,
        duration: 320,
        delay: 80,
        useNativeDriver: true,
      }),
    ]);

    const chipsIn = Animated.stagger(
      180,
      chipAnims.map(a =>
        Animated.timing(a, {
          toValue: 1,
          duration: 360,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        })
      )
    );

    const seq = Animated.sequence([cardIn, Animated.delay(150), chipsIn]);
    seq.start();
    return () => seq.stop();
  }, [isActive, cardTranslate, cardOpacity, chipAnims]);

  return (
    <OnboardingSlide
      title="Condividi le tue esperienze"
      description="Ogni recensione porta con sé le esigenze di chi l'ha scritta: così gli altri sanno se quell'esperienza è davvero per loro."
      visual={
        <Animated.View
          style={[
            styles.cardWrap,
            {
              opacity: cardOpacity,
              transform: [{ translateY: cardTranslate }],
            },
          ]}
        >
          <Surface style={styles.card} elevation={3}>
            <View style={styles.restaurantRow}>
              <MaterialCommunityIcons name="silverware-fork-knife" size={14} color={theme.colors.textSecondary} />
              <Text style={styles.restaurantName}>Trattoria da Gino</Text>
            </View>

            <View style={styles.authorRow}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>M</Text>
              </View>
              <View style={styles.authorMeta}>
                <Text style={styles.authorName}>Marco</Text>
                <Text style={styles.authorDate}>mar 2026</Text>
              </View>
              <StarRating rating={5} size={14} />
            </View>

            <Text style={styles.reviewText} numberOfLines={2}>
              Carta allergeni chiarissima e il cameriere mi ha seguito benissimo.
            </Text>

            <View style={styles.chipsRow}>
              {CHIPS.map((label, i) => {
                const anim = chipAnims[i];
                return (
                  <Animated.View
                    key={label}
                    style={[
                      styles.chip,
                      {
                        opacity: anim,
                        transform: [
                          {
                            translateY: anim.interpolate({
                              inputRange: [0, 1],
                              outputRange: [8, 0],
                            }),
                          },
                        ],
                      },
                    ]}
                  >
                    <MaterialCommunityIcons name="check" size={11} color={theme.colors.success} />
                    <Text style={styles.chipText}>{label}</Text>
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
  cardWrap: {
    width: '100%',
    maxWidth: 320,
    alignSelf: 'center',
  },
  card: {
    padding: 14,
    borderRadius: 14,
    backgroundColor: theme.colors.surface,
    gap: 8,
  },
  restaurantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingBottom: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.divider,
  },
  restaurantName: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#E57373',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.onPrimary,
  },
  authorMeta: {
    flex: 1,
  },
  authorName: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  authorDate: {
    fontSize: 11,
    color: theme.colors.textSecondary,
  },
  reviewText: {
    fontSize: 13,
    color: theme.colors.textPrimary,
    lineHeight: 18,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 2,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: theme.colors.primaryLight,
  },
  chipText: {
    fontSize: 11,
    fontWeight: '500',
    color: theme.colors.success,
  },
});
