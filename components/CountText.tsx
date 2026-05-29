/**
 * Numero di conteggio (recensioni/preferiti) con stato di caricamento:
 *  - value === null  → skeleton (primo caricamento, niente cache)
 *  - value numero    → testo
 * value cache-first: vedi useProfileCounts (mostra subito l'ultimo conteggio noto,
 * quindi lo skeleton compare solo al primissimo avvio su questo device).
 *
 * Lo skeleton si dimensiona sul fontSize dello stile passato, così resta allineato
 * al testo che sostituisce ovunque venga usato (header stat / pill toggle).
 */

import { StyleSheet, Text, type StyleProp, type TextStyle } from 'react-native';
import Skeleton from './Skeleton';
import i18n from '../utils/i18n';

type Props = {
  value: number | null;
  style?: StyleProp<TextStyle>;
};

export default function CountText({ value, style }: Props) {
  if (value === null) {
    const fontSize = (StyleSheet.flatten(style)?.fontSize as number | undefined) ?? 14;
    return (
      <Skeleton
        width={Math.round(fontSize * 1.1)}
        height={Math.round(fontSize * 0.85)}
        accessibilityLabel={i18n.t('common.loading')}
      />
    );
  }
  return <Text style={style}>{value}</Text>;
}
