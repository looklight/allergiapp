import { FlatList, type FlatListProps } from 'react-native';
import Animated, { runOnJS, useAnimatedScrollHandler } from 'react-native-reanimated';
import { GestureDetector } from 'react-native-gesture-handler';
import { useBottomSheetInternal } from './BottomSheet';

const AnimatedFlatList = Animated.createAnimatedComponent(FlatList);

type Props<T> = FlatListProps<T> & {
  onScrollOffset?: (y: number) => void;
};

/**
 * FlatList compatibile con <BottomSheet>. Se usato dentro un BottomSheet,
 * sincronizza lo scroll sul UI thread per il drag-to-collapse fluido.
 */
export default function BottomSheetFlatList<T>({ onScrollOffset, ...props }: Props<T>) {
  const ctx = useBottomSheetInternal();
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (e) => {
      if (ctx) ctx.scrollOffset.value = e.contentOffset.y;
      if (onScrollOffset) runOnJS(onScrollOffset)(e.contentOffset.y);
    },
  });

  const list = (
    <AnimatedFlatList
      bounces={false}
      overScrollMode="never"
      scrollEventThrottle={16}
      {...(props as FlatListProps<unknown>)}
      onScroll={scrollHandler}
    />
  );

  if (ctx) {
    return <GestureDetector gesture={ctx.scrollGesture}>{list}</GestureDetector>;
  }
  return list;
}
