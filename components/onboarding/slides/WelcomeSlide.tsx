import { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, Image, ImageSourcePropType, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { theme } from '../../../constants/theme';
import OnboardingSlide from '../OnboardingSlide';
import type { OnboardingSlideProps } from '../types';

type Chip = {
  label: string;
  /** true = dieta (border secondary); false = allergene (border primary) */
  isDiet: boolean;
};

type Member = {
  name: string;
  avatar: ImageSourcePropType;
  chips: readonly Chip[];
};

const MEMBERS: readonly Member[] = [
  {
    name: 'Marco',
    avatar: require('../../../assets/avatars/plate_forks.png'),
    chips: [
      { label: 'Glutine', isDiet: false },
      { label: 'Vegan', isDiet: true },
    ],
  },
  {
    name: 'Giulia',
    avatar: require('../../../assets/avatars/plate_language.png'),
    chips: [{ label: 'Vegan', isDiet: true }],
  },
  {
    name: 'Anna',
    avatar: require('../../../assets/avatars/plate_passport.png'),
    chips: [
      { label: 'Glutine', isDiet: false },
      { label: 'Uova', isDiet: false },
    ],
  },
];

const STAGGER_MS = 160;

export default function WelcomeSlide({ isActive }: OnboardingSlideProps) {
  const totalChips = useMemo(() => MEMBERS.reduce((sum, m) => sum + m.chips.length, 0), []);
  const chipAnims = useRef(Array.from({ length: totalChips }, () => new Animated.Value(0))).current;

  useEffect(() => {
    if (!isActive) {
      chipAnims.forEach(a => a.setValue(0));
      return;
    }

    const seq = Animated.stagger(
      STAGGER_MS,
      chipAnims.map(a =>
        Animated.timing(a, {
          toValue: 1,
          duration: 380,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        })
      )
    );

    seq.start();
    return () => seq.stop();
  }, [isActive, chipAnims]);

  let chipCounter = 0;

  return (
    <OnboardingSlide
      title="È bello averti qui."
      description="AllergiApp è una community di persone che condividono esperienze reali per trovare i posti giusti dove mangiare bene, senza pensieri."
      visual={
        <View style={styles.row}>
          {MEMBERS.map(member => (
            <View key={member.name} style={styles.member}>
              <Image source={member.avatar} style={styles.avatar} resizeMode="contain" />
              <Text style={styles.memberName}>{member.name}</Text>
              <View style={styles.chipsCol}>
                {member.chips.map(chip => {
                  const anim = chipAnims[chipCounter++];
                  return (
                    <Animated.View
                      key={chip.label}
                      style={[
                        styles.chip,
                        chip.isDiet ? styles.chipDiet : styles.chipAllergen,
                        {
                          opacity: anim,
                          transform: [
                            {
                              translateY: anim.interpolate({
                                inputRange: [0, 1],
                                outputRange: [10, 0],
                              }),
                            },
                          ],
                        },
                      ]}
                    >
                      <Text style={styles.chipText}>{chip.label}</Text>
                    </Animated.View>
                  );
                })}
              </View>
            </View>
          ))}
        </View>
      }
    />
  );
}

const AVATAR_SIZE = 68;

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 4,
  },
  member: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
  },
  memberName: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  chipsCol: {
    gap: 4,
    alignItems: 'center',
  },
  chip: {
    backgroundColor: theme.colors.surface,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
  },
  chipAllergen: {
    borderColor: theme.colors.primaryContainer,
  },
  chipDiet: {
    borderColor: theme.colors.secondaryContainer,
  },
  chipText: {
    fontSize: 12,
    color: theme.colors.textPrimary,
  },
});
