/**
 * Badge "salvato" mostrato sui pin della mappa. Precedenza:
 * emoji (lista custom) > cuore (Preferiti) > bookmark (lista custom senza emoji).
 * Condiviso da MapPin e SelectedMarkerOverlay per un'unica fonte di verità.
 */
import { Text as RNText } from 'react-native';
import type { StyleProp, TextStyle } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { AppTheme } from '../../constants/theme';

export type Badge = { kind: 'heart' } | { kind: 'bookmark' } | { kind: 'emoji'; value: string };

/** Risolve il badge da (cuore Preferiti, simbolo lista custom: emoji | null=bookmark | undefined=nessuna). */
export function resolveBadge(isFavorite: boolean, customSymbol: string | null | undefined): Badge | null {
  if (typeof customSymbol === 'string') return { kind: 'emoji', value: customSymbol };
  if (isFavorite) return { kind: 'heart' };
  if (customSymbol === null) return { kind: 'bookmark' };
  return null;
}

/** Glifo interno al badge (cuore/bookmark/emoji). */
export function badgeGlyph(
  badge: Badge,
  glyphStyle: StyleProp<TextStyle>,
  bookmarkSize: number,
  theme: AppTheme,
) {
  if (badge.kind === 'emoji') return <RNText style={glyphStyle}>{badge.value}</RNText>;
  if (badge.kind === 'bookmark') return <MaterialCommunityIcons name="bookmark" size={bookmarkSize} color={theme.colors.primary} />;
  return <RNText style={glyphStyle}>{'♥'}</RNText>;
}
