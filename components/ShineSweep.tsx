import { useEffect, useState, type ReactNode } from 'react';
import { AccessibilityInfo, View, StyleSheet, type LayoutChangeEvent } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

type Props = {
  /** Raggio angoli: deve combaciare con quello del figlio per non sbordare. */
  borderRadius?: number;
  /** RGB del riflesso, come "r,g,b" (gli estremi sfumano allo stesso RGB con
   *  alpha 0: evita l'alone scuro di 'transparent' = nero su Android). */
  tint?: string;
  /** Opacità di picco del riflesso. */
  peakOpacity?: number;
  /** Durata della singola spazzata (ms). */
  sweepMs?: number;
  /** Ritardo prima della (prima) spazzata: lascia posare la schermata. */
  delayMs?: number;
  /** Se true ripete in loop con pausa `restMs`; se false fa una sola spazzata. */
  loop?: boolean;
  /** Pausa tra una spazzata e la successiva (ms), solo in modalità loop. */
  restMs?: number;
  /** Inclinazione della lama di luce (gradi). */
  angleDeg?: number;
  children: ReactNode;
};

/**
 * Avvolge un elemento e ci fa passare sopra, ogni tanto, un riflesso di luce in
 * diagonale (effetto "shine/sweep") per enfatizzarlo. Il riflesso è ritagliato
 * sulla forma del figlio, non intercetta i tocchi e rispetta "Riduci movimento".
 */
export default function ShineSweep({
  borderRadius = 12,
  tint = '255,255,255',
  peakOpacity = 0.45,
  sweepMs = 750,
  delayMs = 900,
  loop = false,
  restMs = 3400,
  angleDeg = 20,
  children,
}: Props) {
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const [reduceMotion, setReduceMotion] = useState(false);
  const tx = useSharedValue(0);

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then((v) => {
      if (mounted) setReduceMotion(v);
    });
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => {
      mounted = false;
      sub.remove();
    };
  }, []);

  const w = size?.w ?? 0;
  const band = Math.max(48, w * 0.32);
  const startX = -band * 2;
  const endX = w + band;

  useEffect(() => {
    if (reduceMotion || !size) {
      cancelAnimation(tx);
      return;
    }
    tx.value = startX;
    const sweep = withTiming(endX, { duration: sweepMs, easing: Easing.inOut(Easing.quad) });
    if (loop) {
      tx.value = withDelay(
        delayMs,
        withRepeat(
          withSequence(
            sweep,
            // resta fuori campo a destra per la pausa, poi rientra di scatto a sinistra
            withDelay(restMs, withTiming(startX, { duration: 0 })),
          ),
          -1,
          false,
        ),
      );
    } else {
      // Una sola spazzata, dopo il ritardo iniziale.
      tx.value = withDelay(delayMs, sweep);
    }
    return () => cancelAnimation(tx);
  }, [reduceMotion, size, sweepMs, delayMs, loop, restMs, startX, endX, tx]);

  const bandStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }, { rotate: `${angleDeg}deg` }],
  }));

  return (
    <View
      onLayout={(e: LayoutChangeEvent) => {
        const { width, height } = e.nativeEvent.layout;
        setSize((p) => (p && p.w === width && p.h === height ? p : { w: width, h: height }));
      }}
      style={[styles.clip, { borderRadius }]}
    >
      {children}
      {!reduceMotion && size && (
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          <Animated.View
            style={[
              {
                position: 'absolute',
                top: -size.h,
                bottom: -size.h,
                width: band,
                left: 0,
              },
              bandStyle,
            ]}
          >
            <LinearGradient
              colors={[`rgba(${tint},0)`, `rgba(${tint},${peakOpacity})`, `rgba(${tint},0)`]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  clip: {
    overflow: 'hidden',
  },
});
