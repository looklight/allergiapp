import { useEffect, useRef } from 'react';
import { Animated, Easing, Keyboard, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * Offset animato (≤ 0) da applicare in `translateY` per sollevare un contenuto
 * ancorato in basso (bottom sheet) sopra la tastiera. Centralizza la logica che
 * prima era duplicata nei vari sheet:
 *  - eventi corretti per piattaforma: `keyboardWillShow/Hide` su iOS (parte prima
 *    della comparsa → in sync), `keyboardDidShow/Hide` su Android (non esiste il
 *    "will");
 *  - durata/curva di sistema quando disponibili (iOS), fallback ragionevoli;
 *  - native driver (transform) per fluidità;
 *  - sottrae la safe-area inferiore (lo sheet ha già quel padding in basso).
 *
 * Punto unico anche per eventuali aggiustamenti per-piattaforma dopo i test
 * (es. se su Android il Modal venisse ridimensionato dal sistema).
 */
export function useKeyboardOffset(): Animated.Value {
  const insets = useSafeAreaInsets();
  const insetBottom = insets.bottom;
  const offset = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const onShow = (e: any) => {
      Animated.timing(offset, {
        toValue: -Math.max(0, (e.endCoordinates?.height ?? 0) - insetBottom),
        duration: e.duration || 220,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }).start();
    };
    const onHide = (e: any) => {
      Animated.timing(offset, {
        toValue: 0,
        duration: e.duration || 180,
        easing: Easing.in(Easing.ease),
        useNativeDriver: true,
      }).start();
    };
    const s1 = Keyboard.addListener(showEvt, onShow);
    const s2 = Keyboard.addListener(hideEvt, onHide);
    return () => { s1.remove(); s2.remove(); };
  }, [offset, insetBottom]);

  return offset;
}
