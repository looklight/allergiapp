import { useState, useEffect, useCallback, useRef } from 'react';
import { View, StyleSheet, BackHandler, Platform } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { TouchableOpacity } from 'react-native';
import { theme } from '../../constants/theme';
import { useRestaurantDetail } from '../../hooks/useRestaurantDetail';
import BottomSheet, { type BottomSheetRef } from '../BottomSheet';
import RestaurantDetailBody from './RestaurantDetailBody';

const HEADER_LINE_HEIGHT = 26;
const SNAP_POINTS = [0.55, 0.92];

type Props = {
  restaurantId: string;
  onClose: () => void;
  onFavoriteToggled?: (restaurantId: string, delta: number) => void;
};

export default function RestaurantDetailSheet({ restaurantId, onClose, onFavoriteToggled }: Props) {
  const sheetRef = useRef<BottomSheetRef>(null);
  const detail = useRestaurantDetail(restaurantId, onFavoriteToggled);
  const [isCompactHeader, setIsCompactHeader] = useState(false);
  // Scroll is enabled only when the sheet is fully open (snap 0.92).
  // At half height (0.55) the body is a static preview: the user drags
  // the handle to open fully, exactly like Google Maps / Apple Maps.
  const [bodyScrollEnabled, setBodyScrollEnabled] = useState(false);

  const handleDismiss = useCallback(() => {
    sheetRef.current?.close();
  }, []);

  const handleSnapChange = useCallback((fraction: number) => {
    const fullyOpen = fraction >= 0.9;
    setBodyScrollEnabled(fullyOpen);
    if (!fullyOpen) setIsCompactHeader(false);
  }, []);

  const handleScrollOffset = useCallback((y: number) => {
    const compact = y > 10;
    setIsCompactHeader(prev => prev === compact ? prev : compact);
  }, []);

  // Android back button closes the sheet
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      handleDismiss();
      return true;
    });
    return () => sub.remove();
  }, [handleDismiss]);

  const header = (
    <View style={[styles.sheetHeader, isCompactHeader && styles.sheetHeaderCompact]}>
      <View style={styles.sheetNameRow}>
        <Text
          style={styles.sheetName}
          numberOfLines={isCompactHeader ? 1 : undefined}
        >
          {detail.restaurant?.name ?? ''}
        </Text>
        <TouchableOpacity onPress={detail.handleToggleFavorite} hitSlop={10} activeOpacity={0.6} style={styles.sheetActionBtn}>
          <MaterialCommunityIcons
            name={detail.isFavorite ? 'heart' : 'heart-outline'}
            size={22}
            color={detail.isFavorite ? theme.colors.error : theme.colors.textSecondary}
          />
        </TouchableOpacity>
        <TouchableOpacity onPress={handleDismiss} hitSlop={10} activeOpacity={0.6} style={[styles.sheetActionBtn, { marginLeft: 2 }]}>
          <MaterialCommunityIcons name="close" size={22} color={theme.colors.textSecondary} />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <BottomSheet
      ref={sheetRef}
      snapPoints={SNAP_POINTS}
      initialIndex={0}
      enterFromBottom
      headerContent={header}
      onSnapChange={handleSnapChange}
      onClose={onClose}
      style={styles.sheetShadow}
    >
      <RestaurantDetailBody
        restaurantId={restaurantId}
        detail={detail}
        onDismiss={handleDismiss}
        hideNameAndRating
        scrollEnabled={bodyScrollEnabled}
        onScrollOffset={handleScrollOffset}
      />
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  sheetShadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 16,
  },
  sheetHeader: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  sheetHeaderCompact: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
    paddingBottom: 10,
  },
  sheetNameRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  sheetName: {
    flex: 1,
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    lineHeight: HEADER_LINE_HEIGHT,
  },
  sheetActionBtn: {
    width: HEADER_LINE_HEIGHT,
    height: HEADER_LINE_HEIGHT,
    borderRadius: HEADER_LINE_HEIGHT / 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
