import { useState, useRef, useEffect, ReactNode } from 'react';
import { View, StyleSheet, FlatList, Dimensions, TouchableOpacity, Linking } from 'react-native';
import { Text } from 'react-native-paper';
import i18n from '../../utils/i18n';
import { theme } from '../../constants/theme';
import { Analytics } from '../../utils/analytics';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

/**
 * Tipi di banner supportati
 */
export type BannerType = 'info' | 'ad' | 'custom';

/**
 * Item del banner carousel
 */
export interface BannerItem {
  id: string;
  type: BannerType;
  icon?: string;
  title?: string;
  subtitle?: string;
  // Per ads/referral
  adUrl?: string;
  adImage?: string;
  adButtonText?: string;
  // Per custom render
  customContent?: ReactNode;
}

interface BannerCarouselProps {
  /**
   * Banner aggiuntivi da inserire nel carousel (es. ads, referral)
   * Verranno inseriti tra i banner informativi
   */
  extraBanners?: BannerItem[];
  /**
   * Intervallo di auto-scroll in millisecondi
   * @default 6000
   */
  autoScrollInterval?: number;
}

export default function BannerCarousel({
  extraBanners = [],
  autoScrollInterval = 6000,
}: BannerCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const autoScrollTimer = useRef<NodeJS.Timeout | null>(null);
  const viewedBanners = useRef<Set<string>>(new Set());

  // Banner predefiniti informativi
  const infoBanners: BannerItem[] = [
    {
      id: 'info-1',
      type: 'info',
      icon: '🌍',
      title: i18n.t('home.bannerWelcome'),
      subtitle: i18n.t('home.bannerMotivation'),
    },
    {
      id: 'info-2',
      type: 'info',
      icon: '🍽️',
      title: i18n.t('home.bannerHowToUse'),
      subtitle: i18n.t('home.bannerHowToUseDesc'),
    },
    {
      id: 'info-3',
      type: 'info',
      icon: '✈️',
      title: i18n.t('home.bannerTip'),
      subtitle: '',
    },
  ];

  // Combina banner informativi con extra banners (ads, referral, etc.)
  // Gli ads vengono inseriti strategicamente ogni 2 banner informativi
  const allBanners: BannerItem[] = [];
  infoBanners.forEach((banner, index) => {
    allBanners.push(banner);
    // Inserisci un ad ogni 2 banner informativi
    if (index === 1 && extraBanners.length > 0) {
      allBanners.push(extraBanners[0]);
    }
  });
  // Aggiungi eventuali ads rimanenti alla fine
  if (extraBanners.length > 1) {
    allBanners.push(...extraBanners.slice(1));
  }

  // Auto-scroll effect
  useEffect(() => {
    if (allBanners.length > 1) {
      startAutoScroll();
    }
    return () => {
      if (autoScrollTimer.current) {
        clearInterval(autoScrollTimer.current);
      }
    };
  }, [allBanners.length]);

  const startAutoScroll = () => {
    if (autoScrollTimer.current) {
      clearInterval(autoScrollTimer.current);
    }
    autoScrollTimer.current = setInterval(() => {
      setActiveIndex((prevIndex) => {
        const nextIndex = (prevIndex + 1) % allBanners.length;
        try {
          flatListRef.current?.scrollToIndex({
            index: nextIndex,
            animated: true,
          });
        } catch (error) {
          // Ignora errori se il FlatList non è ancora pronto
        }
        return nextIndex;
      });
    }, autoScrollInterval);
  };

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      const index = viewableItems[0].index || 0;
      setActiveIndex(index);

      // Traccia la visualizzazione del banner (solo la prima volta)
      const banner = allBanners[index];
      if (banner && !viewedBanners.current.has(banner.id)) {
        viewedBanners.current.add(banner.id);

        // Log banner view
        Analytics.logBannerViewed(banner.id, banner.type, banner.title);

        // Se è un ad, traccia anche l'impression
        if (banner.type === 'ad') {
          Analytics.logAdImpression(banner.id, banner.adUrl, banner.title);
        }
      }
    }
  }).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
  }).current;

  const onScrollBeginDrag = () => {
    if (autoScrollTimer.current) {
      clearInterval(autoScrollTimer.current);
    }
  };

  const onScrollEndDrag = () => {
    startAutoScroll();
  };

  const onScrollToIndexFailed = (info: any) => {
    setTimeout(() => {
      try {
        flatListRef.current?.scrollToIndex({
          index: info.index,
          animated: true,
        });
      } catch (error) {
        // Ignora
      }
    }, 100);
  };

  const handleAdPress = (item: BannerItem) => {
    // Traccia il click sul banner/ad
    Analytics.logBannerClicked(item.id, item.type, item.title, item.adUrl);

    // Apri l'URL se presente
    if (item.adUrl) {
      Linking.openURL(item.adUrl);
    }
  };

  const renderBannerItem = ({ item }: { item: BannerItem }) => {
    // Info banner (default)
    if (item.type === 'info') {
      return (
        <View style={styles.bannerItem}>
          <Text style={styles.bannerIcon}>{item.icon}</Text>
          <View style={styles.bannerTextContainer}>
            <Text style={styles.bannerTitle}>{item.title}</Text>
            {item.subtitle ? (
              <Text style={styles.bannerSubtitle}>{item.subtitle}</Text>
            ) : null}
          </View>
        </View>
      );
    }

    // Ad/Referral banner
    if (item.type === 'ad') {
      return (
        <TouchableOpacity
          style={styles.adBannerItem}
          onPress={() => handleAdPress(item)}
          activeOpacity={0.8}
        >
          <Text style={styles.adIcon}>{item.icon || '🎁'}</Text>
          <View style={styles.bannerTextContainer}>
            <Text style={styles.adTitle}>{item.title}</Text>
            {item.subtitle && (
              <Text style={styles.adSubtitle}>{item.subtitle}</Text>
            )}
            {item.adButtonText && (
              <Text style={styles.adButton}>{item.adButtonText}</Text>
            )}
          </View>
        </TouchableOpacity>
      );
    }

    // Custom banner
    if (item.type === 'custom' && item.customContent) {
      return <View style={styles.bannerItem}>{item.customContent}</View>;
    }

    return null;
  };

  if (allBanners.length === 0) return null;

  return (
    <View style={styles.bannerContainer}>
      <FlatList
        ref={flatListRef}
        data={allBanners}
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
        bounces={false}
      />
      {allBanners.length > 1 && (
        <View style={styles.paginationDots}>
          {allBanners.map((_, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                index === activeIndex && styles.dotActive,
              ]}
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
  adBannerItem: {
    width: SCREEN_WIDTH - 32,
    height: 140,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    gap: 16,
    backgroundColor: `${theme.colors.primary}08`, // Light tint for ads
  },
  bannerIcon: {
    fontSize: 48,
    marginRight: 16,
  },
  adIcon: {
    fontSize: 48,
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
  adTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.primary,
    marginBottom: 4,
  },
  adSubtitle: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    lineHeight: 18,
    marginBottom: 6,
  },
  adButton: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.primary,
    textDecorationLine: 'underline',
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
