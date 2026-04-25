import { ComponentType, useRef, useState } from 'react';
import { View, StyleSheet, ScrollView, Dimensions, TouchableOpacity, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import { Text, Button } from 'react-native-paper';
import { useRouter, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../../constants/theme';
import type { OnboardingSlideProps } from '../../components/onboarding/types';
import WelcomeSlide from '../../components/onboarding/slides/WelcomeSlide';
import FindRestaurantsSlide from '../../components/onboarding/slides/FindRestaurantsSlide';
import ShareExperiencesSlide from '../../components/onboarding/slides/ShareExperiencesSlide';
import AllergenCardSlide from '../../components/onboarding/slides/AllergenCardSlide';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const SLIDES: ComponentType<OnboardingSlideProps>[] = [
  WelcomeSlide,
  ShareExperiencesSlide,
  FindRestaurantsSlide,
  AllergenCardSlide,
];

export default function OnboardingTutorialScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const isLast = activeIndex === SLIDES.length - 1;

  const handleNext = () => {
    if (isLast) {
      router.replace('/(tabs)');
    } else {
      const next = activeIndex + 1;
      scrollRef.current?.scrollTo({ x: next * SCREEN_WIDTH, animated: true });
      setActiveIndex(next);
    }
  };

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    setActiveIndex(index);
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
      >
        {SLIDES.map((Slide, index) => (
          <Slide key={index} isActive={activeIndex === index} />
        ))}
      </ScrollView>

      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 16 }]}>
        <View style={styles.dots}>
          {SLIDES.map((_, index) => (
            <View
              key={index}
              style={[styles.dot, activeIndex === index && styles.dotActive]}
            />
          ))}
        </View>

        <Button
          mode="contained"
          onPress={handleNext}
          style={styles.button}
          labelStyle={styles.buttonLabel}
        >
          {isLast ? 'Inizia' : 'Avanti'}
        </Button>

        <TouchableOpacity
          onPress={() => router.replace('/(tabs)')}
          style={[styles.skipRow, isLast && { opacity: 0 }]}
          disabled={isLast}
        >
          <Text style={styles.skipText}>Salta</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  bottomBar: {
    paddingHorizontal: 24,
    paddingTop: 16,
    alignItems: 'center',
    gap: 12,
    backgroundColor: theme.colors.background,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.border,
  },
  dots: {
    flexDirection: 'row',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.border,
  },
  dotActive: {
    width: 24,
    backgroundColor: theme.colors.primary,
  },
  button: {
    borderRadius: 10,
    alignSelf: 'stretch',
  },
  buttonLabel: {
    fontSize: 16,
    paddingVertical: 4,
  },
  skipRow: {
    paddingVertical: 4,
  },
  skipText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textDecorationLine: 'underline',
  },
});
