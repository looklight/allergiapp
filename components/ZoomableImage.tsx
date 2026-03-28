import { useRef } from 'react';
import { Animated, type ImageStyle, type StyleProp } from 'react-native';
import {
  PinchGestureHandler,
  TapGestureHandler,
  State,
  type PinchGestureHandlerGestureEvent,
  type TapGestureHandlerStateChangeEvent,
} from 'react-native-gesture-handler';

interface Props {
  uri: string;
  style: StyleProp<ImageStyle>;
  maxScale?: number;
}

const SPRING_CONFIG = { damping: 15, stiffness: 120, useNativeDriver: true };

export default function ZoomableImage({ uri, style, maxScale = 4 }: Props) {
  const baseScale = useRef(new Animated.Value(1)).current;
  const pinchScale = useRef(new Animated.Value(1)).current;
  const lastScale = useRef(1);

  const scale = Animated.multiply(baseScale, pinchScale);

  const onPinchEvent = Animated.event(
    [{ nativeEvent: { scale: pinchScale } }],
    { useNativeDriver: true },
  );

  const onPinchStateChange = (e: PinchGestureHandlerGestureEvent) => {
    if (e.nativeEvent.oldState === State.ACTIVE) {
      lastScale.current = Math.min(maxScale, Math.max(1, lastScale.current * e.nativeEvent.scale));
      baseScale.setValue(lastScale.current);
      pinchScale.setValue(1);

      if (lastScale.current < 1.1) {
        lastScale.current = 1;
        Animated.spring(baseScale, { toValue: 1, ...SPRING_CONFIG }).start();
      }
    }
  };

  const onDoubleTap = (e: TapGestureHandlerStateChangeEvent) => {
    if (e.nativeEvent.state === State.ACTIVE) {
      const target = lastScale.current > 1 ? 1 : 2.5;
      lastScale.current = target;
      Animated.spring(baseScale, { toValue: target, ...SPRING_CONFIG }).start();
    }
  };

  return (
    <TapGestureHandler numberOfTaps={2} onHandlerStateChange={onDoubleTap}>
      <Animated.View>
        <PinchGestureHandler
          onGestureEvent={onPinchEvent}
          onHandlerStateChange={onPinchStateChange}
        >
          <Animated.Image
            source={{ uri }}
            style={[style, { transform: [{ scale }] }]}
            resizeMode="contain"
          />
        </PinchGestureHandler>
      </Animated.View>
    </TapGestureHandler>
  );
}
