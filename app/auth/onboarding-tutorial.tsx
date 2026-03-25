import { useRef, useState } from 'react';
import { View, StyleSheet, ScrollView, Image, Dimensions, TouchableOpacity, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import { Text, Button } from 'react-native-paper';
import { useRouter, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../../constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type Slide = {
  image: ReturnType<typeof require>;
  title: string;
  description: string;
  highlight?: string;
};

const SLIDES: Slide[] = [
  {
    image: require('../../assets/happy_plate_passport.png'),
    title: 'È bello averti qui.',
    description: 'AllergiApp è una community di persone che condividono esperienze reali per trovare i posti giusti dove mangiare bene, senza pensieri.',
  },
  {
    image: require('../../assets/happy_plate_forks.png'),
    title: 'Trova ristoranti',
    description: 'Che sia vicino a casa o in viaggio, trovi consigli di persone con le tue stesse esigenze alimentari, che sanno cosa significa dover fare attenzione a quello che si ordina.',
  },
  {
    image: require('../../assets/happy_plate_language.png'),
    title: 'Condividi le tue esperienze',
    description: 'Ogni volta che racconti com\'è andata, aiuti qualcuno che si trova nella tua stessa situazione. La community di AllergiApp cresce grazie alle esperienze reali di chi, come te, vuole mangiare bene senza preoccupazioni.',
  },
  {
    image: require('../../assets/happy_plate_forks.png'),
    title: 'Salva i tuoi preferiti',
    description: 'Costruisci la tua lista di ristoranti di fiducia, in città e in viaggio. Sempre a portata di mano quando ne hai bisogno.',
  },
  {
    image: require('../../assets/happy_plate_language.png'),
    title: 'La tua card allergeni',
    description: 'Prima di ordinare non dimenticare di mostrare la card al cameriere per comunicare le tue esigenze con più semplicità e in modo chiaro. La puoi creare direttamente nella app.',
    highlight: 'card',
  },
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
        {SLIDES.map((slide, index) => (
          <View key={index} style={styles.slide}>
            <View style={styles.imageContainer}>
              <Image
                source={slide.image}
                style={styles.image}
                resizeMode="contain"
              />
            </View>
            <View style={styles.textContainer}>
              <Text style={styles.slideTitle}>{slide.title}</Text>
              <Text style={styles.slideDescription}>
                {slide.highlight
                  ? slide.description.split(slide.highlight).map((part, i, arr) =>
                      i < arr.length - 1 ? (
                        <Text key={i}>
                          {part}<Text style={styles.bold}>{slide.highlight}</Text>
                        </Text>
                      ) : part
                    )
                  : slide.description}
              </Text>
            </View>
          </View>
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
  slide: {
    width: SCREEN_WIDTH,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  imageContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingBottom: 32,
  },
  image: {
    width: SCREEN_WIDTH * 0.38,
    height: SCREEN_WIDTH * 0.38,
  },
  textContainer: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 8,
  },
  slideTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
    textAlign: 'center',
    marginBottom: 16,
  },
  slideDescription: {
    fontSize: 15,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 23,
  },
  bold: {
    fontWeight: '700',
    color: theme.colors.textSecondary,
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
