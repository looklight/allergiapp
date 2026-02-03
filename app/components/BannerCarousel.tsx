import { useState, useRef, useEffect, ReactNode } from 'react';
import { View, StyleSheet, FlatList, Dimensions, TouchableOpacity, Linking, Image } from 'react-native';
import { Text } from 'react-native-paper';
import i18n from '../../utils/i18n';
import { theme } from '../../constants/theme';
import { Analytics } from '../../utils/analytics';
import { RemoteConfig } from '../../utils/remoteConfig';

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
  // Layout and styling
  layout?: 'default' | 'full_image';
  backgroundColor?: string;
  textColor?: string;
  // Display duration in milliseconds (overrides default)
  displayDuration?: number;
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
   * Intervallo di auto-scroll di default in millisecondi
   * @default 3000
   */
  defaultScrollInterval?: number;
}

export default function BannerCarousel({
  extraBanners = [],
  defaultScrollInterval = 3000,
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

  // Get promotional banner from Remote Config (if enabled)
  const promoBanner = RemoteConfig.getPromoBanner();

  // Combine extra banners with Remote Config banner
  const allExtraBanners: BannerItem[] = [
    ...extraBanners,
    ...(promoBanner ? [promoBanner] : []),
  ];

  // Combina banner informativi con extra banners (ads, referral, etc.)
  // Gli ads vengono inseriti strategicamente ogni 2 banner informativi
  const allBanners: BannerItem[] = [];
  infoBanners.forEach((banner, index) => {
    allBanners.push(banner);
    // Inserisci un ad ogni 2 banner informativi
    if (index === 1 && allExtraBanners.length > 0) {
      allBanners.push(allExtraBanners[0]);
    }
  });
  // Aggiungi eventuali ads rimanenti alla fine
  if (allExtraBanners.length > 1) {
    allBanners.push(...allExtraBanners.slice(1));
  }

  // Get display duration for current banner
  const getCurrentDuration = (index: number) => {
    const banner = allBanners[index];
    return banner?.displayDuration || defaultScrollInterval;
  };

  // Schedule next auto-scroll based on current banner's duration
  const scheduleNextScroll = (currentIndex: number) => {
    if (autoScrollTimer.current) {
      clearTimeout(autoScrollTimer.current);
    }
    const duration = getCurrentDuration(currentIndex);
    autoScrollTimer.current = setTimeout(() => {
      const nextIndex = (currentIndex + 1) % allBanners.length;
      try {
        flatListRef.current?.scrollToIndex({
          index: nextIndex,
          animated: true,
        });
      } catch (error) {
        // Ignora errori se il FlatList non è ancora pronto
      }
      setActiveIndex(nextIndex);
      scheduleNextScroll(nextIndex);
    }, duration);
  };

  // Auto-scroll effect
  useEffect(() => {
    if (allBanners.length > 1) {
      scheduleNextScroll(activeIndex);
    }
    return () => {
      if (autoScrollTimer.current) {
        clearTimeout(autoScrollTimer.current);
      }
    };
  }, [allBanners.length]);

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
      clearTimeout(autoScrollTimer.current);
    }
  };

  const onScrollEndDrag = () => {
    scheduleNextScroll(activeIndex);
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
      // Full image layout - image fills entire banner (ideal for Canva designs)
      if (item.layout === 'full_image' && item.adImage) {
        return (
          <TouchableOpacity
            style={styles.fullImageBanner}
            onPress={() => handleAdPress(item)}
            activeOpacity={0.9}
          >
            <Image
              source={{ uri: item.adImage }}
              style={styles.fullImage}
              resizeMode="cover"
            />
          </TouchableOpacity>
        );
      }

      // Default layout - icon/image on left, text on right
      const customBgStyle = item.backgroundColor ? { backgroundColor: item.backgroundColor } : {};
      const customTextStyle = item.textColor ? { color: item.textColor } : {};

      return (
        <TouchableOpacity
          style={[styles.adBannerItem, customBgStyle]}
          onPress={() => handleAdPress(item)}
          activeOpacity={0.8}
        >
          {item.adImage ? (
            <Image
              source={{ uri: item.adImage }}
              style={styles.adImageIcon}
              resizeMode="contain"
            />
          ) : (
            <Text style={styles.adIcon}>{item.icon || '🎁'}</Text>
          )}
          <View style={styles.bannerTextContainer}>
            <Text style={[styles.adTitle, customTextStyle]}>{item.title}</Text>
            {item.subtitle && (
              <Text style={[styles.adSubtitle, customTextStyle, { opacity: 0.8 }]}>{item.subtitle}</Text>
            )}
            {item.adButtonText && (
              <Text style={[styles.adButton, customTextStyle]}>{item.adButtonText}</Text>
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
  fullImageBanner: {
    width: SCREEN_WIDTH - 32,
    height: 140,
    borderRadius: 0,
    overflow: 'hidden',
  },
  fullImage: {
    width: '100%',
    height: '100%',
  },
  bannerIcon: {
    fontSize: 48,
    marginRight: 16,
  },
  adIcon: {
    fontSize: 48,
    marginRight: 16,
  },
  adImageIcon: {
    width: 64,
    height: 64,
    borderRadius: 12,
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
