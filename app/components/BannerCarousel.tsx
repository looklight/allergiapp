import { useState, useRef, useEffect } from 'react';
import { View, StyleSheet, FlatList, Dimensions, Image } from 'react-native';
import { Text } from 'react-native-paper';
import { BannerItem } from '../../types';
import i18n from '../../utils/i18n';
import { theme } from '../../constants/theme';
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

export default function BannerCarousel({ scrollInterval = 3000 }: BannerCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const autoScrollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const viewedBanners = useRef<Set<string>>(new Set());

  const banners: BannerItem[] = [
    {
      id: 'info-1',
      image: bannerImages.passport,
      title: i18n.t('home.bannerWelcome'),
      subtitle: i18n.t('home.bannerMotivation'),
    },
    {
      id: 'info-2',
      image: bannerImages.language,
      title: i18n.t('home.bannerHowToUse'),
      subtitle: i18n.t('home.bannerHowToUseDesc'),
    },
    {
      id: 'info-3',
      image: bannerImages.forks,
      title: i18n.t('home.bannerTip'),
      subtitle: '',
    },
  ];

  const scheduleNextScroll = (currentIndex: number) => {
    if (autoScrollTimer.current) {
      clearTimeout(autoScrollTimer.current);
    }
    autoScrollTimer.current = setTimeout(() => {
      const nextIndex = (currentIndex + 1) % banners.length;
      try {
        flatListRef.current?.scrollToIndex({ index: nextIndex, animated: true });
      } catch {
        // FlatList not ready yet
      }
      setActiveIndex(nextIndex);
      scheduleNextScroll(nextIndex);
    }, scrollInterval);
  };

  useEffect(() => {
    if (banners.length > 1) {
      scheduleNextScroll(activeIndex);
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
    scheduleNextScroll(activeIndex);
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

  const renderBannerItem = ({ item }: { item: BannerItem }) => (
    <View
      style={styles.bannerItem}
      accessibilityLabel={`${item.title}${item.subtitle ? `. ${item.subtitle}` : ''}`}
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
        {item.subtitle ? <Text style={styles.bannerSubtitle}>{item.subtitle}</Text> : null}
      </View>
    </View>
  );

  if (banners.length === 0) return null;

  return (
    <View style={styles.bannerContainer}>
      <FlatList
        ref={flatListRef}
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
          length: SCREEN_WIDTH - 32,
          offset: (SCREEN_WIDTH - 32) * index,
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

const styles = StyleSheet.create({
  bannerContainer: {
    height: 140,
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: theme.colors.surface,
  },
  bannerItem: {
    width: SCREEN_WIDTH - 32,
    height: 140,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
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
  paginationDots: {
    position: 'absolute',
    bottom: 12,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.border,
    marginHorizontal: 3,
  },
  dotActive: {
    width: 20,
    backgroundColor: theme.colors.primary,
  },
});
