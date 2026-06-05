/**
 * Stat "like ricevuti" del profilo (numero + label), con:
 *  - count-up animato da previousLikes a currentLikes (~1.2s)
 *  - badge "+N" che sale e svanisce in coda alla riga, A DESTRA della label
 *    (~2.2s, sta in vista circa 1s dopo che il count-up si e' fermato)
 *
 * Il componente rende l'intera riga [numero][label][+N] cosi' che il badge possa
 * stare in flusso dopo la label senza sovrapporsi (prima era absolute ancorato al
 * solo numero e finiva sopra "Like ricevuti"). Per questo riceve anche `label`.
 *
 * Se delta <= 0 (nessun nuovo like, o sono diminuiti) renderizza il numero
 * statico senza animare e SENZA chiamare onAnimationEnd: non c'e' "ho visto i
 * nuovi like" da segnalare, e mark intempestivi causerebbero override del
 * snapshot in DB (vedi useLikesNotification.markAsSeen).
 *
 * Usa Animated di RN core (no reanimated): bastano un Value per il count e uno
 * per il float "+N".
 */

import { useEffect, useRef, useState, useMemo } from 'react';
import { View, Text, Animated, StyleSheet, type StyleProp, type TextStyle } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import type { AppTheme } from '../constants/theme';

const COUNT_DURATION_MS = 1200;
// Durata del "+N": prolunga oltre la fine del count-up cosi' l'utente lo nota
// (e ha tempo di leggerlo) anche dopo che il numero ha smesso di animare.
const FLOAT_DURATION_MS = 2200;

type Props = {
  currentLikes: number;
  previousLikes: number;
  onAnimationEnd?: () => void;
  /** Override dello stile del numero (es. per renderlo inline e piu' compatto). */
  numberStyle?: StyleProp<TextStyle>;
  /** Testo della label ("Like ricevuti"). Il badge "+N" appare alla sua destra. */
  label?: string;
  /** Override dello stile della label per allinearla alle altre stat dell'header. */
  labelStyle?: StyleProp<TextStyle>;
};

export default function AnimatedLikesCounter({ currentLikes, previousLikes, onAnimationEnd, numberStyle, label, labelStyle }: Props) {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
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
    <View style={styles.row}>
      <Text style={[styles.number, numberStyle]}>{displayValue}</Text>
      {label != null && <Text style={[styles.label, labelStyle]}>{label}</Text>}
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

const makeStyles = (theme: AppTheme) => StyleSheet.create({
  // Riga [numero][label][+N]: allineata come gli altri inlineStat del ProfileCard
  // (gap 4) cosi' il badge "+N" sta in flusso subito dopo "Like ricevuti".
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  number: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
    textAlign: 'center',
  },
  // Default allineato a ProfileCard.inlineStatLabel; sovrascrivibile via labelStyle.
  label: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  floatBadge: {
    // In flusso a destra della label: niente più overlap con "Like ricevuti".
    // translateY (transform) anima la salita senza spostare il layout.
    marginLeft: 2,
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.primary,
  },
});
