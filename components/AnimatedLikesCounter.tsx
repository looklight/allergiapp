/**
 * Numero "like" del profilo, con:
 *  - count-up animato da previousLikes a currentLikes (~1.2s)
 *  - badge "+N" laterale che sale e svanisce a destra del numero (~2.2s, sta
 *    in vista circa 1s dopo che il count-up si e' fermato)
 *
 * Se delta <= 0 (nessun nuovo like, o sono diminuiti) renderizza il numero
 * statico senza animare e SENZA chiamare onAnimationEnd: non c'e' "ho visto i
 * nuovi like" da segnalare, e mark intempestivi causerebbero override del
 * snapshot in DB (vedi useLikesNotification.markAsSeen).
 *
 * Usa Animated di RN core (no reanimated): bastano un Value per il count e uno
 * per il float "+N".
 */

import { useEffect, useRef, useState } from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';
import { theme } from '../constants/theme';

const COUNT_DURATION_MS = 1200;
// Durata del "+N": prolunga oltre la fine del count-up cosi' l'utente lo nota
// (e ha tempo di leggerlo) anche dopo che il numero ha smesso di animare.
const FLOAT_DURATION_MS = 2200;

type Props = {
  currentLikes: number;
  previousLikes: number;
  onAnimationEnd?: () => void;
};

export default function AnimatedLikesCounter({ currentLikes, previousLikes, onAnimationEnd }: Props) {
  const delta = currentLikes - previousLikes;
  const shouldAnimate = delta > 0;

  const [displayValue, setDisplayValue] = useState(shouldAnimate ? previousLikes : currentLikes);
  const countAnim = useRef(new Animated.Value(shouldAnimate ? previousLikes : currentLikes)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!shouldAnimate) {
      // Niente da animare: aggiorniamo il valore visibile e basta. NON chiamiamo
      // onAnimationEnd qui perche' significherebbe segnalare "ho visto i nuovi
      // like" anche quando non ne sono arrivati di nuovi (o sono diminuiti).
      setDisplayValue(currentLikes);
      return;
    }

    countAnim.setValue(previousLikes);
    floatAnim.setValue(0);

    const listener = countAnim.addListener(({ value }) => {
      setDisplayValue(Math.round(value));
    });

    Animated.parallel([
      Animated.timing(countAnim, {
        toValue: currentLikes,
        duration: COUNT_DURATION_MS,
        useNativeDriver: false,
      }),
      Animated.timing(floatAnim, {
        toValue: 1,
        duration: FLOAT_DURATION_MS,
        useNativeDriver: true,
      }),
    ]).start(() => {
      countAnim.removeListener(listener);
      onAnimationEnd?.();
    });

    return () => {
      countAnim.removeListener(listener);
    };
    // shouldAnimate dipende da currentLikes/previousLikes; le animazioni vanno
    // (ri)avviate solo quando cambiano questi due, non onAnimationEnd.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentLikes, previousLikes]);

  return (
    <View>
      <Text style={styles.number}>{displayValue}</Text>
      {shouldAnimate && (
        <Animated.Text
          style={[
            styles.floatBadge,
            {
              opacity: floatAnim.interpolate({
                inputRange: [0, 0.08, 0.85, 1],
                outputRange: [0, 1, 1, 0],
              }),
              transform: [
                {
                  translateY: floatAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, -18],
                  }),
                },
              ],
            },
          ]}
        >
          +{delta}
        </Animated.Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  number: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
    marginBottom: 2,
    textAlign: 'center',
  },
  floatBadge: {
    // Posizionato a destra del numero (offset negativo lo fa sporgere fuori dal
    // box auto-width del numero, dentro lo statItem del ProfileCard).
    position: 'absolute',
    top: 2,
    right: -26,
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.primary,
  },
});
