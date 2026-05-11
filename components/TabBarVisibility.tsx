import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { StyleSheet } from 'react-native';
import { BottomTabBar, type BottomTabBarProps } from '@react-navigation/bottom-tabs';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

export type TabBarVisibility = {
  hide: () => void;
  show: () => void;
};

type InternalValue = TabBarVisibility & { progress: SharedValue<number> };

const TabBarVisibilityContext = createContext<InternalValue | null>(null);

export function useTabBarVisibility(): TabBarVisibility {
  const ctx = useContext(TabBarVisibilityContext);
  if (!ctx) {
    throw new Error('useTabBarVisibility must be used within TabBarVisibilityProvider');
  }
  return ctx;
}

const ANIM_CONFIG = { duration: 280, easing: Easing.out(Easing.cubic) };

export function TabBarVisibilityProvider({ children }: { children: ReactNode }) {
  const progress = useSharedValue(0);

  // Asimmetrico: sparizione istantanea per non vedere la tab bar passare "sopra"
  // al sheet che sale, ricomparsa animata in sincronia col sheet che si chiude.
  const value = useMemo<InternalValue>(
    () => ({
      hide: () => {
        progress.value = 1;
      },
      show: () => {
        progress.value = withTiming(0, ANIM_CONFIG);
      },
      progress,
    }),
    [progress],
  );

  return (
    <TabBarVisibilityContext.Provider value={value}>
      {children}
    </TabBarVisibilityContext.Provider>
  );
}

export function AnimatedTabBar(props: BottomTabBarProps) {
  const ctx = useContext(TabBarVisibilityContext);
  if (!ctx) throw new Error('AnimatedTabBar must be used within TabBarVisibilityProvider');
  const { progress } = ctx;
  const measuredHeight = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: progress.value * measuredHeight.value }],
  }));

  return (
    <Animated.View
      pointerEvents="box-none"
      onLayout={(e) => {
        measuredHeight.value = e.nativeEvent.layout.height;
      }}
      style={[styles.container, animatedStyle]}
    >
      <BottomTabBar {...props} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
});
