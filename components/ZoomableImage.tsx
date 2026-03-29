import { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import Animated from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Image } from 'react-native';

interface Props {
  uri: string;
  style: { width: number; height: number };
  maxScale?: number;
  onZoomedIn?: () => void;
  onZoomedOut?: () => void;
  onSingleTap?: () => void;
}

const SPRING = { damping: 15, stiffness: 120 };

export default function ZoomableImage({
  uri,
  style,
  maxScale = 4,
  onZoomedIn,
  onZoomedOut,
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
  const focalX = useSharedValue(0);
  const focalY = useSharedValue(0);

  function maxTx(s: number) {
    'worklet';
    return Math.max(0, (W * (s - 1)) / 2);
  }

  function maxTy(s: number) {
    'worklet';
    return Math.max(0, (H * (s - 1)) / 2);
  }

  function clampTx(val: number, s: number) {
    'worklet';
    const m = maxTx(s);
    return Math.min(m, Math.max(-m, val));
  }

  function clampTy(val: number, s: number) {
    'worklet';
    const m = maxTy(s);
    return Math.min(m, Math.max(-m, val));
  }

  // Pinch: zoom toward focal point (where fingers are)
  const pinch = Gesture.Pinch()
    .onStart((e) => {
      focalX.value = e.focalX - W / 2;
      focalY.value = e.focalY - H / 2;
    })
    .onUpdate((e) => {
      const newScale = Math.min(maxScale, Math.max(1, savedScale.value * e.scale));
      const ratio = newScale / savedScale.value;
      scale.value = newScale;
      // Keep focal point fixed while zooming
      tx.value = focalX.value * (1 - ratio) + savedTx.value * ratio;
      ty.value = focalY.value * (1 - ratio) + savedTy.value * ratio;
    })
    .onEnd(() => {
      if (scale.value < 1.1) {
        scale.value = withSpring(1, SPRING);
        tx.value = withSpring(0, SPRING);
        ty.value = withSpring(0, SPRING);
        savedScale.value = 1;
        savedTx.value = 0;
        savedTy.value = 0;
        if (onZoomedOut) onZoomedOut();
      } else {
        const s = scale.value;
        const cx = clampTx(tx.value, s);
        const cy = clampTy(ty.value, s);
        tx.value = withSpring(cx, SPRING);
        ty.value = withSpring(cy, SPRING);
        savedScale.value = s;
        savedTx.value = cx;
        savedTy.value = cy;
        if (onZoomedIn) onZoomedIn();
      }
    });

  // Pan: only with 1 finger and only when zoomed in
  const pan = Gesture.Pan()
    .manualActivation(true)
    .onTouchesMove((e, state) => {
      if (savedScale.value <= 1 || e.numberOfTouches !== 1) {
        state.fail();
      } else {
        state.activate();
      }
    })
    .onUpdate((e) => {
      tx.value = clampTx(savedTx.value + e.translationX, savedScale.value);
      ty.value = clampTy(savedTy.value + e.translationY, savedScale.value);
    })
    .onEnd(() => {
      savedTx.value = tx.value;
      savedTy.value = ty.value;
    });

  // Double-tap: zoom in at tap point, or reset
  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd((e) => {
      if (savedScale.value > 1) {
        scale.value = withSpring(1, SPRING);
        tx.value = withSpring(0, SPRING);
        ty.value = withSpring(0, SPRING);
        savedScale.value = 1;
        savedTx.value = 0;
        savedTy.value = 0;
        if (onZoomedOut) onZoomedOut();
      } else {
        const target = 2.5;
        const fx = e.x - W / 2;
        const fy = e.y - H / 2;
        const newTx = clampTx(fx * (1 - target), target);
        const newTy = clampTy(fy * (1 - target), target);
        scale.value = withSpring(target, SPRING);
        tx.value = withSpring(newTx, SPRING);
        ty.value = withSpring(newTy, SPRING);
        savedScale.value = target;
        savedTx.value = newTx;
        savedTy.value = newTy;
        if (onZoomedIn) onZoomedIn();
      }
    });

  // Single-tap: close (waits for doubleTap to fail, only when not zoomed)
  const singleTap = Gesture.Tap()
    .numberOfTaps(1)
    .requireExternalGestureToFail(doubleTap)
    .onEnd(() => {
      if (savedScale.value <= 1 && onSingleTap) {
        onSingleTap();
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
