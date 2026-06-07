import { useState, useEffect, useMemo } from 'react';
import { Modal, View, StyleSheet, TextInput, Pressable, KeyboardAvoidingView, Platform } from 'react-native';
import { Text, Button } from 'react-native-paper';
import { useTheme } from '../contexts/ThemeContext';
import type { AppTheme } from '../constants/theme';
import EmojiPicker, { LIST_EMOJIS } from './EmojiPicker';
import i18n from '../utils/i18n';

type Props = {
  visible: boolean;
  title: string;
  placeholder?: string;
  initialValue?: string;
  confirmLabel?: string;
  maxLength?: number;
  /** Mostra il selettore emoji (per crea/rinomina lista). */
  showEmoji?: boolean;
  initialEmoji?: string | null;
  onCancel: () => void;
  onConfirm: (value: string, emoji: string | null) => void;
};

/**
 * Dialog centrale con campo di testo (e, opzionale, selettore emoji). Stile
 * allineato al dialog "nuova card" (CardBadgesSection). Resta un Modal nativo —
 * non un Portal di Paper — perche' viene aperto da dentro un altro Modal nativo
 * (il bottom sheet "Salva in…"), dove un Portal finirebbe sotto. La tastiera e'
 * gestita con KeyboardAvoidingView (l'input e' in autofocus).
 */
export default function TextPromptModal({
  visible,
  title,
  placeholder,
  initialValue = '',
  confirmLabel,
  maxLength = 50,
  showEmoji = false,
  initialEmoji = null,
  onCancel,
  onConfirm,
}: Props) {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [value, setValue] = useState(initialValue);
  const [emoji, setEmoji] = useState<string | null>(initialEmoji);

  useEffect(() => {
    if (visible) {
      setValue(initialValue);
      setEmoji(initialEmoji ?? (showEmoji ? LIST_EMOJIS[0] : null));
    }
  }, [visible, initialValue, initialEmoji, showEmoji]);

  const trimmed = value.trim();
  const handleConfirm = () => {
    if (!trimmed) return;
    onConfirm(trimmed, emoji);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onCancel}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={styles.overlay} onPress={onCancel}>
          <Pressable style={styles.card} onPress={() => {}}>
            <Text style={styles.title}>{title}</Text>
            <View style={styles.inputRow}>
              {showEmoji && emoji != null && <Text style={styles.inputEmoji}>{emoji}</Text>}
              <TextInput
                style={styles.input}
                value={value}
                onChangeText={setValue}
                placeholder={placeholder}
                placeholderTextColor={theme.colors.textSecondary}
                maxLength={maxLength}
                autoFocus
                selectionColor={theme.colors.primary}
                returnKeyType="done"
                onSubmitEditing={handleConfirm}
              />
            </View>
            {showEmoji && <View style={styles.emojiWrap}><EmojiPicker value={emoji} onChange={setEmoji} /></View>}
            <View style={styles.actions}>
              <Button mode="text" onPress={onCancel} labelStyle={styles.secondaryLabel} rippleColor="transparent">
                {i18n.t('common.cancel')}
              </Button>
              <Button mode="contained" onPress={handleConfirm} disabled={!trimmed} labelStyle={styles.primaryLabel} rippleColor="transparent">
                {confirmLabel ?? i18n.t('common.save')}
              </Button>
            </View>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const makeStyles = (theme: AppTheme) => StyleSheet.create({
  flex: { flex: 1 },
  overlay: {
    flex: 1,
    backgroundColor: theme.colors.overlay,
    // Ancorato in basso: con KeyboardAvoidingView il dialog resta appena sopra
    // la tastiera invece di ricentrarsi troppo in alto.
    justifyContent: 'flex-end',
    paddingHorizontal: theme.spacing.xxl,
    paddingBottom: theme.spacing.lg,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: 20,
    paddingTop: theme.spacing.lg,
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
    textAlign: 'center',
    marginBottom: theme.spacing.lg,
  },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  inputEmoji: { fontSize: 22 },
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
  emojiWrap: { marginTop: theme.spacing.lg },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },
  primaryLabel: { fontSize: 14, fontWeight: '600' },
  secondaryLabel: { fontSize: 13, color: theme.colors.textSecondary },
});
