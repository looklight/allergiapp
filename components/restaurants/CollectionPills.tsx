import { useMemo } from 'react';
import { View, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import type { AppTheme } from '../../constants/theme';
import type { CollectionWithCount } from '../../services/collectionService';
import i18n from '../../utils/i18n';

type Props = {
  /** Preferiti (lista di default). */
  isFavorite: boolean;
  /** Liste custom dell'utente. */
  collections: CollectionWithCount[];
  /** Id delle liste custom che contengono il ristorante. */
  membership: Set<string>;
  /** Apre il bottom sheet "Salva in…" (gestione). */
  onOpen: () => void;
};

/**
 * Riga read-only "Salvato in" sotto il banner compatibilita': mostra le liste in
 * cui il ristorante e' salvato (Preferiti + custom, con emoji). Tap su una pill
 * apre il modal per gestire. Se non e' salvato da nessuna parte non mostra nulla
 * (l'accesso al salvataggio resta il bookmark nell'header).
 */
export default function CollectionPills({ isFavorite, collections, membership, onOpen }: Props) {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  const savedCustom = collections.filter((c) => membership.has(c.id));
  if (!isFavorite && savedCustom.length === 0) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {isFavorite && (
        <Pill
          symbol={<MaterialCommunityIcons name="heart" size={14} color={theme.colors.error} />}
          label={i18n.t('restaurants.myRestaurants.filterFavorites')}
          onPress={onOpen}
          theme={theme}
        />
      )}
      {savedCustom.map((c) => (
        <Pill
          key={c.id}
          // Bookmark (emoji null) = simbolo neutro/default: nella pill mostriamo
          // solo il nome. L'emoji invece la mostriamo.
          symbol={c.emoji ? <Text style={styles.pillEmoji}>{c.emoji}</Text> : null}
          label={c.name}
          onPress={onOpen}
          theme={theme}
        />
      ))}
    </ScrollView>
  );
}

function Pill({
  symbol,
  label,
  onPress,
  theme,
}: {
  symbol?: React.ReactNode;
  label: string;
  onPress: () => void;
  theme: AppTheme;
}) {
  const styles = useMemo(() => makeStyles(theme), [theme]);
  return (
    <TouchableOpacity style={styles.pill} onPress={onPress} activeOpacity={0.7}>
      {symbol != null && <View style={styles.pillSymbol}>{symbol}</View>}
      <Text style={styles.pillLabel} numberOfLines={1}>{label}</Text>
    </TouchableOpacity>
  );
}

const makeStyles = (theme: AppTheme) => StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.xs,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    maxWidth: 180,
    paddingVertical: 5,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  pillSymbol: { width: 16, alignItems: 'center' },
  pillEmoji: { fontSize: 13 },
  pillLabel: {
    flexShrink: 1,
    fontSize: 13,
    fontWeight: '500',
    color: theme.colors.textPrimary,
  },
});
