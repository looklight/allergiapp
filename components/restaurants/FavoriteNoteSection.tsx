import { useState } from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../../constants/theme';
import i18n from '../../utils/i18n';
import { useFavoriteNote } from '../../hooks/useFavoriteNote';

// Limite morbido lato client (nessun CHECK nel DB): tiene la cosa una "nota" e
// non una recensione. Modificabile via OTA senza migration.
const NOTE_MAX_LENGTH = 200;

type Props = {
  restaurantId: string;
  /** Visibile solo quando il ristorante e' tra i preferiti. */
  isFavorite: boolean;
  /**
   * Chiamato quando l'utente entra in modifica. Nel bottom sheet serve a portarlo
   * allo snap pieno (0.92) cosi' il campo non resta dietro la tastiera. A schermo
   * intero non serve (nessuno sheet): il prop e' opzionale.
   */
  onBeginEdit?: () => void;
};

/**
 * Nota personale privata sotto al banner compatibilita'. Stile "Google Maps":
 * un unico contenitore leggero in tutti gli stati.
 * - vuota   -> placeholder dentro il contenitore (invito a scrivere)
 * - con testo -> la nota in chiaro (stessi font delle recensioni)
 * - al tap  -> editor inline; salvataggio senza pulsante su blur/unmount.
 * Visibile solo se il posto e' preferito.
 */
export default function FavoriteNoteSection({ restaurantId, isFavorite, onBeginEdit }: Props) {
  const { note, status, onChangeNote, flush } = useFavoriteNote(restaurantId, isFavorite);
  const [editing, setEditing] = useState(false);

  if (!isFavorite) return null;

  const beginEdit = () => {
    setEditing(true);
    onBeginEdit?.();
  };

  // ─── Editor inline ────────────────────────────────────────────────────────
  if (editing) {
    return (
      <View style={styles.box}>
        <TextInput
          style={styles.input}
          value={note}
          onChangeText={onChangeNote}
          onBlur={() => { flush(); setEditing(false); }}
          placeholder={i18n.t('restaurants.detail.notes.placeholder')}
          placeholderTextColor={theme.colors.textSecondary}
          multiline
          maxLength={NOTE_MAX_LENGTH}
          textAlignVertical="top"
          scrollEnabled={false}
          autoFocus
        />
        <View style={styles.footerRow}>
          {status === 'saving' && (
            <Text style={styles.statusText}>{i18n.t('restaurants.detail.notes.saving')}</Text>
          )}
          <View style={styles.spacer} />
          {note.length > 0 && (
            <Text style={styles.counter}>{note.length}/{NOTE_MAX_LENGTH}</Text>
          )}
        </View>
      </View>
    );
  }

  // ─── Vuota: placeholder dentro il contenitore ───────────────────────────────
  if (!note.trim()) {
    return (
      <TouchableOpacity style={styles.box} onPress={beginEdit} activeOpacity={0.6}>
        <View style={styles.emptyRow}>
          <MaterialCommunityIcons name="note-plus-outline" size={16} color={theme.colors.textSecondary} />
          <Text style={styles.placeholderText}>{i18n.t('restaurants.detail.notes.placeholder')}</Text>
        </View>
      </TouchableOpacity>
    );
  }

  // ─── Con testo ──────────────────────────────────────────────────────────────
  return (
    <TouchableOpacity style={styles.box} onPress={beginEdit} activeOpacity={0.6}>
      <Text style={styles.noteText}>{note}</Text>
      {status === 'error' && (
        <Text style={styles.errorText}>{i18n.t('restaurants.detail.notes.error')}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  // Contenitore leggero condiviso da tutti gli stati (effetto Google Maps).
  box: {
    marginHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.background,
  },
  emptyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  placeholderText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
  // Stessi font/dimensioni del testo delle recensioni (contributionText).
  noteText: {
    fontSize: 14,
    color: theme.colors.textPrimary,
    lineHeight: 20,
  },
  input: {
    fontSize: 14,
    color: theme.colors.textPrimary,
    lineHeight: 20,
    minHeight: 44,
    padding: 0,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  spacer: { flex: 1 },
  statusText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  counter: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  errorText: {
    fontSize: 12,
    color: theme.colors.error,
    marginTop: 4,
  },
});
