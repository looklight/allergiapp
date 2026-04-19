import {
  createContext, forwardRef, useContext, useEffect, useImperativeHandle,
  useMemo, type ReactNode,
} from 'react';
import { Keyboard, StyleSheet, View, useWindowDimensions, type ViewStyle } from 'react-native';
import Animated, {
  runOnJS, useAnimatedStyle, useSharedValue, withSpring,
  type SharedValue, type WithSpringConfig,
} from 'react-native-reanimated';
import { Gesture, GestureDetector, type GestureType } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../../constants/theme';

export type BottomSheetRef = {
  snapToIndex: (index: number) => void;
  close: () => void;
};

type Props = {
  /** Snap points come frazioni di altezza schermo, ordinate dal più piccolo (es. [0.55, 0.92]). */
  snapPoints: number[];
  /** Indice iniziale tra gli snap points. */
  initialIndex?: number;
  /** Anima l'ingresso dal fondo schermo. */
  enterFromBottom?: boolean;
  /** Notifica lo snap corrente come frazione (0 = chiuso, 1 = fullscreen). */
  onSnapChange?: (fraction: number) => void;
  /** Chiamato quando lo sheet raggiunge la posizione chiusa (sotto il primo snap). */
  onClose?: () => void;
  /** Contenuto non scrollabile sotto l'handle. */
  headerContent?: ReactNode;
  /** Area scrollabile. Usa <BottomSheetScrollView> o <BottomSheetFlatList> per la coordinazione drag-to-collapse. */
  children: ReactNode;
  style?: ViewStyle;
};

const SPRING: WithSpringConfig = { damping: 22, stiffness: 220, mass: 1 };
const DRAG_ACTIVATION_OFFSET = 8;
const CLOSE_DISTANCE_THRESHOLD = 40;
const CLOSE_VELOCITY_THRESHOLD = 800;
const SNAP_VELOCITY_BIAS = 0.0004;

// ─── Context per coordinare il body pan con lo scroll interno ───────────────

type BottomSheetContextValue = {
  scrollOffset: SharedValue<number>;
  scrollGesture: GestureType;
};

const BottomSheetContext = createContext<BottomSheetContextValue | null>(null);

export function useBottomSheetInternal(): BottomSheetContextValue | null {
  return useContext(BottomSheetContext);
}

// ─── Componente principale ──────────────────────────────────────────────────

const BottomSheet = forwardRef<BottomSheetRef, Props>(function BottomSheet(
  {
    snapPoints, initialIndex = 0, enterFromBottom = false,
    onSnapChange, onClose, headerContent, children, style,
  },
  ref,
) {
  const { height } = useWindowDimensions();
  const { bottom: insetBottom } = useSafeAreaInsets();

  // Il container è alto quanto lo snap massimo: a full-open il suo bottom
  // coincide con il bottom dello schermo, quindi il safe-area padding sul
  // body è visibile correttamente (niente overflow off-screen).
  const maxSnap = useMemo(() => Math.max(...snapPoints), [snapPoints]);
  const containerHeight = height * maxSnap;

  // Posizioni Y dall'alto per ogni snap: frazione 0.92 → top a 8% dello schermo.
  // positions[0] è lo snap più basso (sheet più chiuso), positions[last] il più alto.
  const positions = useMemo(
    () => snapPoints.map(p => height * (1 - p)),
    [snapPoints, height],
  );
  const closedY = height;
  const topY = positions[positions.length - 1];
  const bottomY = positions[0];
  const initialY = positions[initialIndex] ?? bottomY;

  const translateY = useSharedValue(enterFromBottom ? closedY : initialY);
  const gestureStartY = useSharedValue(0);
  const dragAnchor = useSharedValue(-1);
  const dragStartSheet = useSharedValue(0);
  const startedFullyOpen = useSharedValue(false);

  const scrollOffset = useSharedValue(0);
  const scrollGesture = useMemo(() => Gesture.Native(), []);

  const reportSnap = (y: number) => {
    onSnapChange?.(1 - y / height);
  };

  const handleClose = () => { onClose?.(); };

  const animateTo = (target: number) => {
    'worklet';
    runOnJS(reportSnap)(target);
    translateY.value = withSpring(target, SPRING, (finished) => {
      if (finished && target === closedY) runOnJS(handleClose)();
    });
  };

  const findNearestSnap = (current: number, velocity: number): number => {
    'worklet';
    let best = positions[0];
    let minDist = Infinity;
    for (const p of positions) {
      const dist = Math.abs(current - p) - velocity * (p - current) * SNAP_VELOCITY_BIAS;
      if (dist < minDist) { minDist = dist; best = p; }
    }
    return best;
  };

  // Unica logica di settle a fine drag: chiude se l'utente ha trascinato sotto
  // al bottom snap (per distanza o velocità), altrimenti snap più vicino.
  const settleAfterDrag = (velocityY: number) => {
    'worklet';
    const y = translateY.value;
    const shouldClose =
      y > bottomY + CLOSE_DISTANCE_THRESHOLD ||
      (y > bottomY && velocityY > CLOSE_VELOCITY_THRESHOLD);
    animateTo(shouldClose ? closedY : findNearestSnap(y, velocityY));
  };

  // Animazione di ingresso (o notifica snap iniziale se già in posizione).
  useEffect(() => {
    reportSnap(initialY);
    if (enterFromBottom) {
      translateY.value = withSpring(initialY, SPRING);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useImperativeHandle(ref, () => ({
    snapToIndex: (index: number) => {
      const target = positions[index];
      if (target === undefined) return;
      reportSnap(target);
      translateY.value = withSpring(target, SPRING);
    },
    close: () => {
      reportSnap(closedY);
      translateY.value = withSpring(closedY, SPRING, (finished) => {
        if (finished) runOnJS(handleClose)();
      });
    },
  }));

  const dismissKeyboard = () => Keyboard.dismiss();

  // ─── Header pan: draggabile sempre, muove lo sheet tra gli snap. ──────────
  const headerPan = Gesture.Pan()
    .activeOffsetY([-DRAG_ACTIVATION_OFFSET, DRAG_ACTIVATION_OFFSET])
    .onStart(() => {
      runOnJS(dismissKeyboard)();
      gestureStartY.value = translateY.value;
    })
    .onUpdate((e) => {
      const raw = gestureStartY.value + e.translationY;
      translateY.value = Math.max(topY, Math.min(closedY, raw));
    })
    .onEnd((e) => {
      settleAfterDrag(e.velocityY);
    });

  // ─── Body pan: drag su tutto il sheet, coordinato con lo scroll interno. ──
  //   - Se il gesto parte con sheet non fully open: drag libero in qualsiasi
  //     direzione, può arrivare a chiudere (come Google Maps).
  //   - Se parte a fully open: drag-to-collapse attivo solo quando scrollOffset=0
  //     e dito verso il basso, coordinato col nativo scroll via simultaneous gesture.
  const bodyPan = Gesture.Pan()
    .activeOffsetY([-DRAG_ACTIVATION_OFFSET, DRAG_ACTIVATION_OFFSET])
    .simultaneousWithExternalGesture(scrollGesture)
    .onStart(() => {
      runOnJS(dismissKeyboard)();
      gestureStartY.value = translateY.value;
      dragAnchor.value = -1;
      startedFullyOpen.value = Math.abs(translateY.value - topY) < 2;
    })
    .onUpdate((e) => {
      if (!startedFullyOpen.value) {
        const raw = gestureStartY.value + e.translationY;
        translateY.value = Math.max(topY, Math.min(closedY, raw));
        return;
      }
      if (scrollOffset.value <= 0) {
        if (dragAnchor.value < 0) {
          dragAnchor.value = e.translationY;
          dragStartSheet.value = translateY.value;
        }
        const delta = e.translationY - dragAnchor.value;
        if (delta > 0) {
          const raw = dragStartSheet.value + delta;
          translateY.value = Math.max(topY, Math.min(closedY, raw));
        }
      } else {
        dragAnchor.value = -1;
      }
    })
    .onEnd((e) => {
      if (!startedFullyOpen.value || dragAnchor.value >= 0) {
        settleAfterDrag(e.velocityY);
      }
      dragAnchor.value = -1;
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const ctxValue = useMemo<BottomSheetContextValue>(
    () => ({ scrollOffset, scrollGesture }),
    [scrollOffset, scrollGesture],
  );

  return (
    <BottomSheetContext.Provider value={ctxValue}>
      <Animated.View style={[styles.container, { height: containerHeight }, animatedStyle, style]}>
        <GestureDetector gesture={headerPan}>
          <View style={styles.headerWrap}>
            <View style={styles.handleArea}>
              <View style={styles.handle} />
            </View>
            {headerContent}
          </View>
        </GestureDetector>
        <GestureDetector gesture={bodyPan}>
          <View style={[styles.body, { paddingBottom: insetBottom }]}>{children}</View>
        </GestureDetector>
      </Animated.View>
    </BottomSheetContext.Provider>
  );
});

export default BottomSheet;

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 15,
  },
  headerWrap: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    zIndex: 1,
  },
  handleArea: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.separator,
  },
  body: {
    flex: 1,
    overflow: 'hidden',
  },
});
