import {
  useSharedValue, useAnimatedStyle, withTiming, cancelAnimation,
  runOnJS, Easing,
} from 'react-native-reanimated';
import Animated from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Image } from 'react-native';

interface Props {
  uri: string;
  style: { width: number; height: number };
  maxScale?: number;
  onZoomChange?: (zoomed: boolean) => void;
  onSingleTap?: () => void;
}

// Animazioni fluide senza rimbalzo — stile iOS Photos
const TIMING = { duration: 250, easing: Easing.out(Easing.cubic) };

export default function ZoomableImage({
  uri,
  style,
  maxScale = 4,
  onZoomChange,
  onSingleTap,
}: Props) {
  const W = style.width;
  const H = style.height;

  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const savedTx = useSharedValue(0);
  const savedTy = useSharedValue(0);

  function clampTx(val: number, s: number) {
    'worklet';
    const m = Math.max(0, (W * (s - 1)) / 2);
    return Math.min(m, Math.max(-m, val));
  }

  function clampTy(val: number, s: number) {
    'worklet';
    const m = Math.max(0, (H * (s - 1)) / 2);
    return Math.min(m, Math.max(-m, val));
  }

  function notifyZoom(zoomed: boolean) {
    'worklet';
    if (onZoomChange) runOnJS(onZoomChange)(zoomed);
  }

  /** Ferma animazioni in corso e salva i valori correnti come base per il nuovo gesto */
  function freezeCurrentValues() {
    'worklet';
    cancelAnimation(scale);
    cancelAnimation(tx);
    cancelAnimation(ty);
    savedScale.value = scale.value;
    savedTx.value = tx.value;
    savedTy.value = ty.value;
  }

  // ─── Pinch: zoom verso il punto focale + pan a due dita ─────────
  // Traccia il focal point iniziale in coordinate schermo.
  // onUpdate combina: (1) zoom centrato sul focal point + (2) pan dalle dita che si muovono
  const startFocalX = useSharedValue(0);
  const startFocalY = useSharedValue(0);

  const pinch = Gesture.Pinch()
    .onStart((e) => {
      freezeCurrentValues();
      startFocalX.value = e.focalX;
      startFocalY.value = e.focalY;
    })
    .onUpdate((e) => {
      const newScale = Math.min(maxScale, Math.max(1, savedScale.value * e.scale));
      scale.value = newScale;
      // Focal point relativo al centro dell'immagine
      const fx = startFocalX.value - W / 2;
      const fy = startFocalY.value - H / 2;
      // (1) Zoom: mantieni il focal point fisso sullo schermo
      const zoomTx = savedTx.value + fx * (savedScale.value - newScale);
      const zoomTy = savedTy.value + fy * (savedScale.value - newScale);
      // (2) Pan: delta del punto medio tra le dita
      const panTx = e.focalX - startFocalX.value;
      const panTy = e.focalY - startFocalY.value;
      tx.value = zoomTx + panTx;
      ty.value = zoomTy + panTy;
    })
    .onEnd(() => {
      if (scale.value < 1.1) {
        // Reset a scala 1
        scale.value = withTiming(1, TIMING);
        tx.value = withTiming(0, TIMING);
        ty.value = withTiming(0, TIMING);
        savedScale.value = 1;
        savedTx.value = 0;
        savedTy.value = 0;
        notifyZoom(false);
      } else {
        // Clamp nella regione visibile e salva i target per il prossimo gesto
        const s = scale.value;
        const cx = clampTx(tx.value, s);
        const cy = clampTy(ty.value, s);
        tx.value = withTiming(cx, TIMING);
        ty.value = withTiming(cy, TIMING);
        savedScale.value = s;
        savedTx.value = cx;
        savedTy.value = cy;
        notifyZoom(true);
      }
    });

  // ─── Pan: solo 1 dito e solo quando zoomato ─────────────────────
  const pan = Gesture.Pan()
    .manualActivation(true)
    .onTouchesMove((e, state) => {
      if (savedScale.value <= 1 || e.numberOfTouches !== 1) {
        state.fail();
      } else {
        state.activate();
      }
    })
    .onStart(() => {
      freezeCurrentValues();
    })
    .onUpdate((e) => {
      tx.value = clampTx(savedTx.value + e.translationX, savedScale.value);
      ty.value = clampTy(savedTy.value + e.translationY, savedScale.value);
    })
    .onEnd(() => {
      savedTx.value = tx.value;
      savedTy.value = ty.value;
    });

  // ─── Double-tap: zoom in al punto toccato, o reset ──────────────
  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .maxDuration(200) // Riduce l'attesa del single-tap da ~300ms a ~200ms
    .onEnd((e) => {
      if (savedScale.value > 1) {
        scale.value = withTiming(1, TIMING);
        tx.value = withTiming(0, TIMING);
        ty.value = withTiming(0, TIMING);
        savedScale.value = 1;
        savedTx.value = 0;
        savedTy.value = 0;
        notifyZoom(false);
      } else {
        const target = 2.5;
        const fx = e.x - W / 2;
        const fy = e.y - H / 2;
        const newTx = clampTx(fx * (1 - target), target);
        const newTy = clampTy(fy * (1 - target), target);
        scale.value = withTiming(target, TIMING);
        tx.value = withTiming(newTx, TIMING);
        ty.value = withTiming(newTy, TIMING);
        savedScale.value = target;
        savedTx.value = newTx;
        savedTy.value = newTy;
        notifyZoom(true);
      }
    });

  // ─── Single-tap: chiudi (aspetta che doubleTap fallisca) ────────
  const singleTap = Gesture.Tap()
    .numberOfTaps(1)
    .requireExternalGestureToFail(doubleTap)
    .onEnd(() => {
      if (savedScale.value <= 1 && onSingleTap) {
        runOnJS(onSingleTap)();
      }
    });

  const composed = Gesture.Simultaneous(
    Gesture.Simultaneous(pinch, pan),
    doubleTap,
    singleTap,
  );

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: tx.value },
      { translateY: ty.value },
      { scale: scale.value },
    ],
  }));

  return (
    <GestureDetector gesture={composed}>
      <Animated.View style={[style, animatedStyle]}>
        <Image source={{ uri }} style={style} resizeMode="contain" />
      </Animated.View>
    </GestureDetector>
  );
}
