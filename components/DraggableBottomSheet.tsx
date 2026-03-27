import { useRef, useEffect, useImperativeHandle, forwardRef, type ReactNode } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  PanResponder,
  Keyboard,
  useWindowDimensions,
  type ViewStyle,
} from 'react-native';
import { theme } from '../constants/theme';

export type DraggableBottomSheetRef = {
  snapToIndex: (index: number) => void;
};

type Props = {
  /** Snap points as fractions of screen height (e.g. [0.12, 0.45, 0.85]) */
  snapPoints: number[];
  /** Initial snap index */
  initialIndex?: number;
  /** If true, sheet slides up from off-screen on mount */
  enterFromBottom?: boolean;
  /** Fixed header content (search, filters) — does not scroll */
  headerContent?: ReactNode;
  /** Scrollable body content */
  children: ReactNode;
  /** Called when the sheet snaps to a new position (fraction of screen covered) */
  onSnapChange?: (fraction: number) => void;
  /** Extra styles for the container (e.g. elevation override) */
  style?: ViewStyle;
};

const DraggableBottomSheet = forwardRef<DraggableBottomSheetRef, Props>(
  function DraggableBottomSheet(
    { snapPoints, initialIndex = 1, enterFromBottom = false, headerContent, children, onSnapChange, style },
    ref,
  ) {
    const { height: screenHeight } = useWindowDimensions();

    // Convert fractions to pixel positions from top of screen
    // snapPoint 0.85 means sheet covers 85% → top = 15% of screen
    const snapPositions = snapPoints.map(p => screenHeight * (1 - p));
    const initialTop = snapPositions[initialIndex] ?? snapPositions[0];

    // When enterFromBottom=true, start off-screen so the mount animation slides up
    const startValue = enterFromBottom ? screenHeight : initialTop;
    const translateY = useRef(new Animated.Value(startValue)).current;
    const lastSnap = useRef(startValue);
    // Keep refs accessible to PanResponder (created once)
    const snapRef = useRef(snapPositions);
    snapRef.current = snapPositions;
    const onSnapChangeRef = useRef(onSnapChange);
    onSnapChangeRef.current = onSnapChange;
    const screenHeightRef = useRef(screenHeight);
    screenHeightRef.current = screenHeight;

    // Animate to initial position on mount (slides up when enterFromBottom=true)
    useEffect(() => {
      lastSnap.current = initialTop;
      Animated.spring(translateY, {
        toValue: initialTop,
        useNativeDriver: false,
        bounciness: 4,
        speed: 14,
      }).start();
    }, []);

    useImperativeHandle(ref, () => ({
      snapToIndex: (index: number) => {
        const positions = snapRef.current;
        const target = positions[index];
        if (target === undefined) return;
        lastSnap.current = target;
        Animated.spring(translateY, {
          toValue: target,
          useNativeDriver: false,
          bounciness: 4,
          speed: 14,
        }).start(() => {
          const fraction = 1 - target / screenHeightRef.current;
          onSnapChangeRef.current?.(fraction);
        });
      },
    }), []);

    const panResponder = useRef(
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_, gesture) => {
          return Math.abs(gesture.dy) > 8 && Math.abs(gesture.dy) > Math.abs(gesture.dx);
        },
        onPanResponderGrant: () => {
          Keyboard.dismiss();
          translateY.stopAnimation(val => {
            lastSnap.current = val;
            translateY.setOffset(val);
            translateY.setValue(0);
          });
        },
        onPanResponderMove: (_, gesture) => {
          const positions = snapRef.current;
          const minTop = positions[positions.length - 1]; // highest (sheet most open)
          const maxTop = positions[0]; // lowest (sheet most closed)
          const newVal = lastSnap.current + gesture.dy;
          const clamped = Math.max(minTop, Math.min(maxTop, newVal));
          translateY.setOffset(0);
          translateY.setValue(clamped);
        },
        onPanResponderRelease: (_, gesture) => {
          translateY.flattenOffset();
          const positions = snapRef.current;
          const currentPos = lastSnap.current + gesture.dy;
          const velocity = gesture.vy;

          // Find nearest snap point, biased by velocity
          let targetSnap = positions[0];
          let minDist = Infinity;
          for (const snap of positions) {
            const dist = Math.abs(currentPos - snap) - velocity * (currentPos - snap) * 0.4;
            if (dist < minDist) {
              minDist = dist;
              targetSnap = snap;
            }
          }

          lastSnap.current = targetSnap;
          Animated.spring(translateY, {
            toValue: targetSnap,
            useNativeDriver: false,
            bounciness: 4,
            speed: 14,
          }).start(() => {
            const fraction = 1 - targetSnap / screenHeightRef.current;
            onSnapChangeRef.current?.(fraction);
          });
        },
      })
    ).current;

    return (
      <Animated.View
        style={[
          styles.container,
          { top: translateY },
          style,
        ]}
      >
        {/* Drag handle + header: both draggable */}
        <View {...panResponder.panHandlers}>
          <View style={styles.handleArea}>
            <View style={styles.handle} />
          </View>
          {headerContent}
        </View>

        {/* Scrollable body */}
        <View style={styles.body}>
          {children}
        </View>
      </Animated.View>
    );
  }
);

export default DraggableBottomSheet;

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  handleArea: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CCCCCC',
  },
  body: {
    flex: 1,
  },
});
