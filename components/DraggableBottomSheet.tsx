import { useRef, useEffect, useImperativeHandle, forwardRef, useCallback, type ReactNode } from 'react';
import {
  View,
  StyleSheet,
  Keyboard,
  Animated,
  useWindowDimensions,
  type ViewStyle,
} from 'react-native';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import type { PanGestureHandlerGestureEvent } from 'react-native-gesture-handler';
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
  /**
   * When true, the body area responds to pan gestures to move the sheet.
   * Enable when body scroll is disabled (sheet at half height) so the user
   * can swipe anywhere — not just the handle — to expand.
   */
  bodyPanEnabled?: boolean;
  /**
   * Ref to the NativeViewGestureHandler wrapping the inner ScrollView.
   * When provided, enables fluid "drag-to-collapse" from the body at full height:
   * the body PanGestureHandler runs simultaneously with the scroll and takes
   * over the moment the content reaches y=0.
   */
  collapseScrollRef?: React.RefObject<any>;
  /**
   * Ref to a number tracking the inner ScrollView's current contentOffset.y.
   * Required together with collapseScrollRef.
   */
  scrollPositionRef?: React.RefObject<number>;
};

const SPRING_CONFIG = { speed: 20, bounciness: 4, useNativeDriver: true } as const;

/**
 * Trova lo snap point più vicino, biased dalla velocità del gesto.
 * Velocità positiva (verso il basso) → favorisce snap più bassi (sheet più chiuso).
 */
function findNearestSnap(positions: number[], current: number, velocityY: number): number {
  let target = positions[0];
  let minDist = Infinity;
  for (const snap of positions) {
    const dist = Math.abs(current - snap) - velocityY * (snap - current) * 0.0004;
    if (dist < minDist) {
      minDist = dist;
      target = snap;
    }
  }
  return target;
}

const DraggableBottomSheet = forwardRef<DraggableBottomSheetRef, Props>(
  function DraggableBottomSheet(
    {
      snapPoints, initialIndex = 1, enterFromBottom = false,
      headerContent, children, onSnapChange, style,
      bodyPanEnabled = false, collapseScrollRef, scrollPositionRef,
    },
    ref,
  ) {
    const { height: screenHeight } = useWindowDimensions();

    // Frazioni → posizioni Y dall'alto (snap 0.85 → top a 15% dello schermo)
    const snapPositions = snapPoints.map(p => screenHeight * (1 - p));
    const initialTop = snapPositions[initialIndex] ?? snapPositions[0];
    const startValue = enterFromBottom ? screenHeight : initialTop;

    const translateY = useRef(new Animated.Value(startValue)).current;
    const currentY = useRef(startValue);
    const gestureStartY = useRef(startValue);
    const snapsRef = useRef(snapPositions);
    const onSnapChangeRef = useRef(onSnapChange);
    const screenHeightRef = useRef(screenHeight);

    onSnapChangeRef.current = onSnapChange;
    screenHeightRef.current = screenHeight;
    snapsRef.current = snapPositions;

    // Listener per tracciare il valore corrente durante le animazioni
    useEffect(() => {
      const id = translateY.addListener(({ value }) => { currentY.current = value; });
      return () => translateY.removeListener(id);
    }, [translateY]);

    const notifySnap = useCallback((targetTop: number) => {
      const fraction = 1 - targetTop / screenHeightRef.current;
      onSnapChangeRef.current?.(fraction);
    }, []);

    const animateTo = useCallback((target: number) => {
      Animated.spring(translateY, { toValue: target, ...SPRING_CONFIG }).start(({ finished }) => {
        if (finished) notifySnap(target);
      });
    }, [translateY, notifySnap]);

    // Animazione di ingresso
    useEffect(() => { animateTo(initialTop); }, []);

    // API imperativa
    useImperativeHandle(ref, () => ({
      snapToIndex: (index: number) => {
        const target = snapsRef.current[index];
        if (target === undefined) return;
        animateTo(target);
      },
    }), [animateTo]);

    // ─── Header gesture (handle + headerContent) ────────────────────────────

    const onHeaderGestureEvent = useCallback((event: PanGestureHandlerGestureEvent) => {
      const { translationY } = event.nativeEvent;
      const positions = snapsRef.current;
      const minTop = positions[positions.length - 1];
      const maxTop = positions[0];
      const clamped = Math.max(minTop, Math.min(maxTop, gestureStartY.current + translationY));
      translateY.setValue(clamped);
    }, [translateY]);

    const onHeaderHandlerStateChange = useCallback((event: PanGestureHandlerGestureEvent) => {
      const { state, oldState, translationY, velocityY } = event.nativeEvent;

      if (state === State.ACTIVE) {
        Keyboard.dismiss();
        translateY.stopAnimation();
        gestureStartY.current = currentY.current;
      }

      if (oldState === State.ACTIVE) {
        const positions = snapsRef.current;
        const minTop = positions[positions.length - 1];
        const maxTop = positions[0];
        const raw = gestureStartY.current + translationY;
        const clamped = Math.max(minTop, Math.min(maxTop, raw));
        animateTo(findNearestSnap(positions, clamped, velocityY));
      }
    }, [translateY, animateTo]);

    // ─── Body gesture ────────────────────────────────────────────────────────
    //
    // Due modalità:
    //   bodyPanEnabled=true  (sheet a 55%, scroll disabilitato)
    //     → muove la sheet in qualsiasi direzione, come l'header
    //
    //   collapseScrollRef presente (sheet a 92%, scroll abilitato)
    //     → lavora simultaneamente allo ScrollView (simultaneousHandlers)
    //     → inizia a muovere la sheet SOLO quando scrollY raggiunge 0
    //       e il dito continua verso il basso, senza effetto molla

    // translationY al momento in cui scrollY raggiunge 0 (ancora per il delta)
    const translationAtTopRef = useRef<number | null>(null);
    // posizione della sheet quando scrollY ha raggiunto 0
    const sheetStartForCollapseRef = useRef(0);

    const onBodyGestureEvent = useCallback((event: PanGestureHandlerGestureEvent) => {
      const { translationY } = event.nativeEvent;
      const positions = snapsRef.current;
      const minTop = positions[positions.length - 1];
      const maxTop = positions[0];

      if (bodyPanEnabled) {
        // Modalità espansione (55%): muove liberamente come l'header
        const clamped = Math.max(minTop, Math.min(maxTop, gestureStartY.current + translationY));
        translateY.setValue(clamped);
        return;
      }

      // Modalità collasso (92%): attivo solo quando scrollY = 0
      const scrollY = scrollPositionRef?.current ?? 0;
      if (scrollY <= 0) {
        if (translationAtTopRef.current === null) {
          // Primo frame con scrollY=0: ancora il punto di partenza
          translationAtTopRef.current = translationY;
          sheetStartForCollapseRef.current = currentY.current;
        }
        const delta = translationY - translationAtTopRef.current;
        if (delta > 0) {
          const clamped = Math.max(minTop, Math.min(maxTop, sheetStartForCollapseRef.current + delta));
          translateY.setValue(clamped);
        }
      } else {
        // Scroll ancora attivo: resetta l'ancora se era stata impostata
        translationAtTopRef.current = null;
      }
    }, [translateY, bodyPanEnabled, scrollPositionRef]);

    const onBodyHandlerStateChange = useCallback((event: PanGestureHandlerGestureEvent) => {
      const { state, oldState, translationY, velocityY } = event.nativeEvent;
      const positions = snapsRef.current;
      const minTop = positions[positions.length - 1];
      const maxTop = positions[0];

      if (state === State.ACTIVE) {
        Keyboard.dismiss();
        translateY.stopAnimation();
        gestureStartY.current = currentY.current;
        translationAtTopRef.current = null;
      }

      if (oldState === State.ACTIVE) {
        if (bodyPanEnabled) {
          // Espansione: snap standard
          const raw = gestureStartY.current + translationY;
          const clamped = Math.max(minTop, Math.min(maxTop, raw));
          animateTo(findNearestSnap(positions, clamped, velocityY));
        } else if (translationAtTopRef.current !== null) {
          // Collasso: il dito ha raggiunto y=0 durante il gesto
          const delta = translationY - translationAtTopRef.current;
          if (delta > 0) {
            const raw = sheetStartForCollapseRef.current + delta;
            const clamped = Math.max(minTop, Math.min(maxTop, raw));
            animateTo(findNearestSnap(positions, clamped, velocityY));
          } else {
            // Il dito è tornato indietro prima di spostare la sheet: ripristina
            animateTo(minTop);
          }
        }
        // Se translationAtTopRef === null: gesto scroll puro, nessun movimento sheet
        translationAtTopRef.current = null;
      }
    }, [translateY, bodyPanEnabled, scrollPositionRef, animateTo]);

    const bodyPanActive = bodyPanEnabled || !!collapseScrollRef;

    return (
      <Animated.View style={[styles.container, { transform: [{ translateY }] }, style]}>
        {/* Handle + header: draggabile sempre */}
        <PanGestureHandler
          onGestureEvent={onHeaderGestureEvent}
          onHandlerStateChange={onHeaderHandlerStateChange}
          activeOffsetY={[-8, 8]}
        >
          <View>
            <View style={styles.handleArea}>
              <View style={styles.handle} />
            </View>
            {headerContent}
          </View>
        </PanGestureHandler>

        {/* Body: pan attivo a 55% (espansione) e a 92% (collasso da top scroll) */}
        <PanGestureHandler
          onGestureEvent={onBodyGestureEvent}
          onHandlerStateChange={onBodyHandlerStateChange}
          activeOffsetY={[-8, 8]}
          simultaneousHandlers={collapseScrollRef ? [collapseScrollRef] : undefined}
          enabled={bodyPanActive}
        >
          <View style={[styles.body, { paddingBottom: screenHeight * (1 - snapPoints[snapPoints.length - 1]) }]}>
            {children}
          </View>
        </PanGestureHandler>
      </Animated.View>
    );
  },
);

export default DraggableBottomSheet;

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '100%',
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    shadowColor: theme.colors.shadow,
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
    backgroundColor: theme.colors.separator,
  },
  body: {
    flex: 1,
    overflow: 'hidden',
  },
});
