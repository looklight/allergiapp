import { useState, useRef, useEffect, useMemo } from 'react';
import { View, StyleSheet, FlatList, Dimensions, Image, TouchableOpacity, Linking } from 'react-native';
import type { LayoutChangeEvent } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BannerItem } from '../../types';
import i18n from '../../utils/i18n';
import { useTheme } from '../../contexts/ThemeContext';
import type { AppTheme } from '../../constants/theme';
import { Analytics } from '../../services/analytics';

const bannerImages = {
  passport: require('../../assets/happy_plate_passport.png'),
  language: require('../../assets/happy_plate_language.png'),
  forks: require('../../assets/happy_plate_forks.png'),
};

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface BannerCarouselProps {
  scrollInterval?: number;
}

export default function BannerCarousel({ scrollInterval = 8000 }: BannerCarouselProps) {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [activeIndex, setActiveIndex] = useState(0);
  // Altezza uniforme per tutte le slide = la più alta misurata a runtime. Via
  // minHeight (non taglia mai) così regge sottotitoli lunghi e qualsiasi lingua;
  // la slide con CTA (più alta) detta la misura, le altre crescono a pari.
  const [cardHeight, setCardHeight] = useState(120);
  const flatListRef = useRef<FlatList>(null);
  const autoScrollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const viewedBanners = useRef<Set<string>>(new Set());
  // Indice corrente "vero", sempre aggiornato (swipe manuale via onViewableItemsChanged
  // + auto-scroll). L'auto-scroll legge QUESTO allo scatto del timer, non lo stato
  // React (che nella closure può essere stale dopo uno swipe → saltava i banner).
  const activeIndexRef = useRef(0);

  const banners: BannerItem[] = [
    {
      // Slide in evidenza: titolo + sottotitolo + CTA inline compatta (link, non
      // pillola), così resta poco più alta delle slide normali — "best of both".
      id: 'info-3',
      image: bannerImages.forks,
      title: i18n.t('home.bannerTip'),
      subtitle: i18n.t('home.bannerTipDesc'),
      gradient: theme.colors.bannerGradientFeatured,
      cta: { label: i18n.t('home.bannerTipCta'), url: 'https://allergiapp.com/restaurants' },
    },
    {
      id: 'info-2',
      image: bannerImages.language,
      title: i18n.t('home.bannerHowToUse'),
      subtitle: i18n.t('home.bannerHowToUseDesc'),
    },
    {
      id: 'info-1',
      image: bannerImages.passport,
      title: i18n.t('home.bannerWelcome'),
      subtitle: i18n.t('home.bannerMotivation'),
    },
  ];

  const scheduleNextScroll = () => {
    if (autoScrollTimer.current) {
      clearTimeout(autoScrollTimer.current);
    }
    autoScrollTimer.current = setTimeout(() => {
      // Legge l'indice corrente ALLO SCATTO (non catturato prima): riflette sempre
      // la posizione reale, anche dopo uno swipe manuale → niente banner saltati.
      const nextIndex = (activeIndexRef.current + 1) % banners.length;
      try {
        flatListRef.current?.scrollToIndex({ index: nextIndex, animated: true });
      } catch {
        // FlatList not ready yet
      }
      activeIndexRef.current = nextIndex;
      setActiveIndex(nextIndex);
      scheduleNextScroll();
    }, scrollInterval);
  };

  useEffect(() => {
    if (banners.length > 1) {
      scheduleNextScroll();
    }
    return () => {
      if (autoScrollTimer.current) {
        clearTimeout(autoScrollTimer.current);
      }
    };
  }, [banners.length]);

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      const index = viewableItems[0].index || 0;
      activeIndexRef.current = index;
      setActiveIndex(index);

      const banner = banners[index];
      if (banner && !viewedBanners.current.has(banner.id)) {
        viewedBanners.current.add(banner.id);
        Analytics.logBannerViewed(banner.id, banner.title);
      }
    }
  }).current;

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 50 }).current;

  const onScrollBeginDrag = () => {
    if (autoScrollTimer.current) {
      clearTimeout(autoScrollTimer.current);
    }
  };

  const onScrollEndDrag = () => {
    scheduleNextScroll();
  };

  const onScrollToIndexFailed = (info: any) => {
    setTimeout(() => {
      try {
        flatListRef.current?.scrollToIndex({ index: info.index, animated: true });
      } catch {
        // ignore
      }
    }, 100);
  };

  // Cresce in modo monotòno fino alla slide più alta, poi si stabilizza
  // (quando l'altezza imposta = max, nessuna slide la supera → niente setState).
  const onCardLayout = (e: LayoutChangeEvent) => {
    const h = Math.ceil(e.nativeEvent.layout.height);
    setCardHeight((prev) => (h > prev ? h : prev));
  };

  const handleCtaPress = (item: BannerItem) => {
    if (!item.cta) return;
    Analytics.logBannerClicked(item.id, item.title);
    Linking.openURL(item.cta.url).catch(() => {
      // URL non apribile (nessun browser / link malformato): ignora silenziosamente.
    });
  };

  const renderBannerItem = ({ item }: { item: BannerItem }) => {
    const a11yLabel = `${item.title ?? ''}${item.subtitle ? `. ${item.subtitle}` : ''}${item.cta ? `. ${item.cta.label}` : ''}`;
    const card = (
      <LinearGradient
        colors={item.gradient ?? theme.colors.bannerGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.bannerCard, { minHeight: cardHeight }]}
        onLayout={onCardLayout}
      >
        {item.image ? (
          <Image
            source={item.image}
            style={styles.bannerImage}
            resizeMode="contain"
            accessibilityElementsHidden
          />
        ) : (
          <Text style={styles.bannerIcon} accessibilityElementsHidden>
            {item.icon}
          </Text>
        )}
        <View style={styles.bannerTextContainer}>
          <Text style={styles.bannerTitle}>{item.title}</Text>
          {item.subtitle ? (
            <Text style={styles.bannerSubtitle}>{item.subtitle}</Text>
          ) : null}
        </View>
        {/* Pulsantino-segnale (solo visivo): l'intera slide è già tappabile.
            In assoluto in basso a destra → NON aggiunge altezza al banner. */}
        {item.cta ? (
          <View style={styles.ctaChip} pointerEvents="none">
            <Text style={styles.ctaLabel}>{item.cta.label}</Text>
            <MaterialCommunityIcons name="open-in-new" size={11} color={theme.colors.onPrimary} />
          </View>
        ) : null}
      </LinearGradient>
    );

    // Slide con CTA = intero banner cliccabile (apre il link); le altre restano
    // statiche. Niente touchable annidato: la chip è solo visiva (pointerEvents none).
    return (
      <View style={styles.bannerItem}>
        {item.cta ? (
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => handleCtaPress(item)}
            accessibilityRole="link"
            accessibilityLabel={a11yLabel}
          >
            {card}
          </TouchableOpacity>
        ) : (
          <View accessibilityLabel={a11yLabel}>{card}</View>
        )}
      </View>
    );
  };

  if (banners.length === 0) return null;

  return (
    <View style={styles.bannerContainer}>
      <FlatList
        ref={flatListRef}
        style={styles.flatList}
        data={banners}
        renderItem={renderBannerItem}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        onScrollBeginDrag={onScrollBeginDrag}
        onScrollEndDrag={onScrollEndDrag}
        onScrollToIndexFailed={onScrollToIndexFailed}
        getItemLayout={(_, index) => ({
          length: SCREEN_WIDTH,
          offset: SCREEN_WIDTH * index,
          index,
        })}
        bounces={false}
      />
      {banners.length > 1 && (
        <View
          style={styles.paginationDots}
          accessible
          accessibilityLabel={`${activeIndex + 1}/${banners.length}`}
        >
          {banners.map((_, index) => (
            <View
              key={index}
              style={[styles.dot, index === activeIndex && styles.dotActive]}
              accessibilityElementsHidden
            />
          ))}
        </View>
      )}
    </View>
  );
}

const makeStyles = (theme: AppTheme) => StyleSheet.create({
  bannerContainer: {
    marginBottom: 24,
    marginHorizontal: -16,
    overflow: 'hidden',
  },
  flatList: {
    flexGrow: 0,
  },
  bannerItem: {
    width: SCREEN_WIDTH,
  },
  bannerCard: {
    marginHorizontal: 16,
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  bannerImage: {
    width: 80,
    height: 80,
    borderRadius: 13,
  },
  bannerIcon: {
    fontSize: 48,
    lineHeight: 58,
    marginRight: 16,
  },
  bannerTextContainer: {
    flex: 1,
  },
  bannerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.primary,
    marginBottom: 4,
  },
  bannerSubtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
  ctaChip: {
    position: 'absolute',
    right: 12,
    bottom: 9,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.secondary,
  },
  ctaLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.onPrimary,
  },
  paginationDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 12,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.separator,
    marginHorizontal: 3,
  },
  dotActive: {
    width: 20,
    backgroundColor: theme.colors.primary,
  },
});
