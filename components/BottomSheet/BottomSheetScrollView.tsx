import { forwardRef } from 'react';
import { type ScrollViewProps } from 'react-native';
import Animated, { runOnJS, useAnimatedScrollHandler } from 'react-native-reanimated';
import { GestureDetector } from 'react-native-gesture-handler';
import { useBottomSheetInternal } from './BottomSheet';

type AnimatedScrollViewRef = React.ComponentRef<typeof Animated.ScrollView>;

type Props = ScrollViewProps & {
  /** Callback JS thread con l'offset Y corrente (utile per es. header compatto al scroll). */
  onScrollOffset?: (y: number) => void;
};

/**
 * ScrollView compatibile con <BottomSheet>. Se usato dentro un BottomSheet,
 * sincronizza lo scroll sul UI thread abilitando il drag-to-collapse fluido.
 * Fuori dal BottomSheet si comporta come una normale Animated.ScrollView.
 */
const BottomSheetScrollView = forwardRef<AnimatedScrollViewRef, Props>(
  function BottomSheetScrollView({ onScrollOffset, ...props }, ref) {
    const ctx = useBottomSheetInternal();
    const scrollHandler = useAnimatedScrollHandler({
      onScroll: (e) => {
        if (ctx) ctx.scrollOffset.value = e.contentOffset.y;
        if (onScrollOffset) runOnJS(onScrollOffset)(e.contentOffset.y);
      },
    });

    const scrollView = (
      <Animated.ScrollView
        ref={ref}
        bounces={false}
        overScrollMode="never"
        scrollEventThrottle={16}
        {...props}
        onScroll={scrollHandler}
      />
    );

    if (ctx) {
      return <GestureDetector gesture={ctx.scrollGesture}>{scrollView}</GestureDetector>;
    }
    return scrollView;
  },
);

export default BottomSheetScrollView;
