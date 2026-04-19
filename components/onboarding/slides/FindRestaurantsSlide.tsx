import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { Text, Surface } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../../../constants/theme';
import i18n from '../../../utils/i18n';
import StarRating from '../../StarRating';
import OnboardingSlide from '../OnboardingSlide';
import type { OnboardingSlideProps } from '../types';

type MatchState = 'full' | 'partial';

type MockRestaurant = {
  name: string;
  city: string;
  distance: string;
  rating: number;
  thumbColor: string;
  covered: number;
  total: number;
  match: MatchState;
};

const RESTAURANTS: readonly MockRestaurant[] = [
  { name: 'Trattoria da Gino',  city: 'Milano, IT',  distance: '450 m',  rating: 4.5, thumbColor: '#E57373', covered: 3, total: 3, match: 'full' },
  { name: 'Pizzeria del Corso', city: 'Milano, IT',  distance: '800 m',  rating: 4.2, thumbColor: '#64B5F6', covered: 2, total: 3, match: 'partial' },
  { name: 'Osteria Belvedere',  city: 'Milano, IT',  distance: '1,2 km', rating: 4.7, thumbColor: '#BA68C8', covered: 1, total: 3, match: 'partial' },
];

const CARD_STAGGER_MS = 90;

export default function FindRestaurantsSlide({ isActive }: OnboardingSlideProps) {
  const cardAnims = useRef(RESTAURANTS.map(() => new Animated.Value(0))).current;
  const badgeScale = useRef(new Animated.Value(1)).current;
  const haloScale = useRef(new Animated.Value(0.6)).current;
  const haloOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!isActive) {
      cardAnims.forEach(a => a.setValue(0));
      badgeScale.setValue(1);
      haloScale.setValue(0.6);
      haloOpacity.setValue(0);
      return;
    }

    const cardsIn = Animated.sequence([
      Animated.delay(80),
      Animated.stagger(
        CARD_STAGGER_MS,
        cardAnims.map(a =>
          Animated.timing(a, {
            toValue: 1,
            duration: 320,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          })
        )
      ),
    ]);

    const pulse = Animated.loop(
      Animated.sequence([
        Animated.delay(150),
        Animated.parallel([
          Animated.sequence([
            Animated.timing(badgeScale, { toValue: 1.18, duration: 280, useNativeDriver: true }),
            Animated.timing(badgeScale, { toValue: 1, duration: 280, useNativeDriver: true }),
          ]),
          Animated.sequence([
            Animated.parallel([
              Animated.timing(haloOpacity, { toValue: 0.45, duration: 280, useNativeDriver: true }),
              Animated.timing(haloScale, { toValue: 1.5, duration: 560, useNativeDriver: true }),
            ]),
            Animated.timing(haloOpacity, { toValue: 0, duration: 280, useNativeDriver: true }),
          ]),
        ]),
        Animated.timing(haloScale, { toValue: 0.6, duration: 0, useNativeDriver: true }),
        Animated.delay(1200),
      ])
    );

    const sequence = Animated.sequence([cardsIn, pulse]);
    sequence.start();
    return () => {
      sequence.stop();
      pulse.stop();
    };
  }, [isActive, cardAnims, badgeScale, haloScale, haloOpacity]);

  return (
    <OnboardingSlide
      title={i18n.t('onboardingTutorial.find.title')}
      description={i18n.t('onboardingTutorial.find.description')}
      visual={
        <View style={styles.stack}>
          {RESTAURANTS.map((r, i) => {
            const anim = cardAnims[i];
            const isHighlighted = i === 0;
            return (
              <Animated.View
                key={r.name}
                style={{
                  opacity: anim,
                  transform: [
                    {
                      translateY: anim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [24, 0],
                      }),
                    },
                  ],
                }}
              >
                <Surface style={styles.card} elevation={isHighlighted ? 3 : 1}>
                  <View style={styles.cardRow}>
                    <View style={[styles.thumb, { backgroundColor: r.thumbColor }]}>
                      <MaterialCommunityIcons name="silverware-fork-knife" size={18} color={theme.colors.onPrimary} />
                    </View>

                    <View style={styles.content}>
                      <View style={styles.topRow}>
                        <Text style={styles.name} numberOfLines={1}>{r.name}</Text>
                      </View>
                      <Text style={styles.city} numberOfLines={1}>{r.city} · <Text style={styles.distance}>{r.distance}</Text></Text>

                      <View style={styles.bottomRow}>
                        <View style={styles.rating}>
                          <StarRating rating={r.rating} size={11} />
                          <Text style={styles.ratingText}>{r.rating.toFixed(1)}</Text>
                        </View>

                        <View style={styles.badgeWrap}>
                          {isHighlighted && (
                            <Animated.View
                              pointerEvents="none"
                              style={[
                                styles.halo,
                                {
                                  opacity: haloOpacity,
                                  transform: [{ scale: haloScale }],
                                },
                              ]}
                            />
                          )}
                          <Animated.View
                            style={[
                              styles.badge,
                              r.match === 'full' ? styles.badgeFull : styles.badgePartial,
                              isHighlighted && { transform: [{ scale: badgeScale }] },
                            ]}
                          >
                            <MaterialCommunityIcons
                              name="shield-check"
                              size={10}
                              color={r.match === 'full' ? theme.colors.success : theme.colors.amberDark}
                            />
                            <Text
                              style={[
                                styles.badgeText,
                                { color: r.match === 'full' ? theme.colors.success : theme.colors.amberDark },
                              ]}
                            >
                              {r.covered}/{r.total}
                            </Text>
                          </Animated.View>
                        </View>
                      </View>
                    </View>
                  </View>
                </Surface>
              </Animated.View>
            );
          })}
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  stack: {
    width: '100%',
    maxWidth: 320,
    alignSelf: 'center',
    gap: 8,
  },
  card: {
    padding: 10,
    borderRadius: 12,
    backgroundColor: theme.colors.surface,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  thumb: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    marginLeft: 10,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 1,
  },
  name: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    flex: 1,
  },
  city: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  distance: {
    fontWeight: '600',
    color: theme.colors.primary,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontSize: 11,
    color: theme.colors.textSecondary,
  },
  badgeWrap: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  halo: {
    position: 'absolute',
    width: 56,
    height: 24,
    borderRadius: 12,
    backgroundColor: theme.colors.primary,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  badgeFull: {
    backgroundColor: theme.colors.primaryLight,
  },
  badgePartial: {
    backgroundColor: theme.colors.amberLight,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
});
