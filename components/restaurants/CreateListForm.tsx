import { useState, useEffect, useMemo, type ReactNode } from 'react';
import { View, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import type { AppTheme } from '../../constants/theme';
import EmojiPicker from '../EmojiPicker';
import i18n from '../../utils/i18n';

const NAME_MAX_LENGTH = 50;

type Props = {
  /** True quando il form e' la vista attiva: (ri)allinea i valori. */
  active: boolean;
  initialName?: string;
  initialEmoji?: string | null;
  submitLabel: string;
  onSubmit: (name: string, emoji: string | null) => void;
  /** Se presente, mostra "Elimina lista" (solo in modifica). */
  onDelete?: () => void;
  /** Sezione opzionale resa tra l'azione e l'elimina (slot "fase 2"): oggi il
   *  toggle "Mostra sulla mappa". Render-prop così riceve l'emoji *live* scelta
   *  nel form (serve all'anteprima del pin nel toggle). */
  extraSection?: (emoji: string | null) => ReactNode;
};

/**
 * Form riusabile crea/modifica lista: emoji + nome + azione + (in modifica)
 * elimina. Pensato come sezione verticale estendibile — domani qui in mezzo
 * entrera' la sezione "Condividi / visibilita'". Usato sia nel pannello laterale
 * del bottom sheet "Salva in…" sia nel bottom sheet del profilo.
 */
export default function CreateListForm({
  active,
  initialName = '',
  initialEmoji = null,
  submitLabel,
  onSubmit,
  onDelete,
  extraSection,
}: Props) {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [name, setName] = useState(initialName);
  // null = bookmark (default neutro): le nuove liste nascono col bookmark.
  const [emoji, setEmoji] = useState<string | null>(initialEmoji);

  // Quando diventa attivo riallinea ai valori. NIENTE autofocus: la tastiera
  // (e quindi il lift del modal) parte solo quando l'utente tocca il campo.
  useEffect(() => {
    if (!active) return;
    setName(initialName);
    setEmoji(initialEmoji);
  }, [active, initialName, initialEmoji]);

  const trimmed = name.trim();
  const submit = () => { if (trimmed) onSubmit(trimmed, emoji); };

  return (
    <View style={styles.form}>
      <EmojiPicker value={emoji} onChange={setEmoji} active={active}>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder={i18n.t('restaurants.collections.namePlaceholder')}
          placeholderTextColor={theme.colors.textSecondary}
          maxLength={NAME_MAX_LENGTH}
          selectionColor={theme.colors.primary}
          returnKeyType="done"
          onSubmitEditing={submit}
        />
      </EmojiPicker>

      {/* Slot di configurazione, sopra l'azione primaria (es. toggle "Mostra
          sulla mappa"; domani la sezione "Condividi / visibilita'"). Riceve
          l'emoji live così l'anteprima del pin riflette la scelta corrente. */}
      {extraSection?.(emoji)}

      <TouchableOpacity
        style={[styles.submit, !trimmed && styles.submitDisabled]}
        onPress={submit}
        disabled={!trimmed}
        activeOpacity={0.8}
      >
        <Text style={styles.submitText}>{submitLabel}</Text>
      </TouchableOpacity>

      {onDelete && (
        <TouchableOpacity style={styles.deleteRow} onPress={onDelete} activeOpacity={0.6}>
          <MaterialCommunityIcons name="trash-can-outline" size={20} color={theme.colors.error} />
          <Text style={styles.deleteText}>{i18n.t('restaurants.collections.deleteList')}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const makeStyles = (theme: AppTheme) => StyleSheet.create({
  form: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    gap: theme.spacing.lg,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.lg,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: theme.colors.textPrimary,
    backgroundColor: theme.colors.surface,
  },
  submit: {
    paddingVertical: theme.spacing.md,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
  },
  submitDisabled: { backgroundColor: theme.colors.surfaceMuted },
  submitText: { fontSize: 15, fontWeight: '700', color: theme.colors.onPrimary },
  deleteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
  },
  deleteText: { fontSize: 14, fontWeight: '600', color: theme.colors.error },
});
