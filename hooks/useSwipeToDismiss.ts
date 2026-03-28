import { useRef, useCallback } from 'react';
import { Animated } from 'react-native';
import { State, type PanGestureHandlerGestureEvent } from 'react-native-gesture-handler';

const DISMISS_THRESHOLD = 120;

export function useSwipeToDismiss(onDismiss: () => void) {
  const translateY = useRef(new Animated.Value(0)).current;

  const onPanGestureEvent = Animated.event(
    [{ nativeEvent: { translationY: translateY } }],
    { useNativeDriver: true },
  );

  const onPanStateChange = useCallback(
    (e: PanGestureHandlerGestureEvent) => {
      if (e.nativeEvent.oldState === State.ACTIVE) {
        if (e.nativeEvent.translationY > DISMISS_THRESHOLD) {
          onDismiss();
        } else {
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            damping: 20,
            stiffness: 200,
          }).start();
        }
      }
    },
    [onDismiss, translateY],
  );

  const backgroundOpacity = translateY.interpolate({
    inputRange: [-300, 0, 300],
    outputRange: [0.3, 1, 0.3],
    extrapolate: 'clamp',
  });

  const reset = useCallback(() => {
    translateY.setValue(0);
  }, [translateY]);

  return { translateY, backgroundOpacity, onPanGestureEvent, onPanStateChange, reset };
}
