import { useRef, useEffect, useCallback, useMemo } from 'react';
import { View, StyleSheet, Pressable, Modal, ScrollView, Keyboard, useWindowDimensions } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { useSharedValue, useAnimatedStyle, useAnimatedKeyboard, withTiming, interpolate, runOnJS } from 'react-native-reanimated';
import { useTheme } from '../contexts/ThemeContext';
import type { AppTheme } from '../constants/theme';
import CreateListForm from './restaurants/CreateListForm';
import MapVisibilityToggle from './restaurants/MapVisibilityToggle';
import i18n from '../utils/i18n';

export type EditingList = { id: string; name: string; emoji: string | null };

type Props = {
  visible: boolean;
  /** Utente corrente: serve al toggle "Mostra sulla mappa" (preferenza locale per-utente). */
  userId: string;
  /** null = creazione; valorizzato = modifica. */
  editing: EditingList | null;
  onClose: () => void;
  onSubmit: (name: string, emoji: string | null) => void;
  onDelete?: () => void;
};

/**
 * Bottom sheet per creare/modificare/eliminare una lista dal profilo. Riusa
 * CreateListForm (stesso form del pannello laterale dello sheet "Salva in…"),
 * cosi' la gestione liste e' coerente e bottom-up ovunque.
 */
export default function ListEditorSheet({ visible, userId, editing, onClose, onSubmit, onDelete }: Props) {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const hideOffset = height;

  const progress = useSharedValue(0);
  const keyboard = useAnimatedKeyboard();
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const finishClose = useCallback(() => onCloseRef.current(), []);

  const overlayStyle = useAnimatedStyle(() => ({ opacity: progress.value }));
  const contentStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(progress.value, [0, 1], [hideOffset, 0]) - keyboard.height.value }],
  }));

  useEffect(() => {
    if (!visible) return;
    progress.value = 0;
    progress.value = withTiming(1, { duration: 280 });
  }, [visible, progress]);

  const close = useCallback(() => {
    Keyboard.dismiss();
    progress.value = withTiming(0, { duration: 200 }, (finished) => {
      if (finished) runOnJS(finishClose)();
    });
  }, [progress, finishClose]);

  return (
    <Modal visible={visible} animationType="none" transparent statusBarTranslucent onRequestClose={close}>
      <View style={styles.container}>
        <Animated.View style={[styles.overlay, overlayStyle]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={close} />
        </Animated.View>

        <Animated.View
          style={[
            styles.content,
            { paddingBottom: insets.bottom + theme.spacing.md },
            contentStyle,
          ]}
        >
          <View style={styles.header}>
            <Text style={styles.title}>
              {editing ? i18n.t('restaurants.collections.renameTitle') : i18n.t('restaurants.collections.createTitle')}
            </Text>
            <Pressable onPress={close} hitSlop={8} style={styles.headerBtn} accessibilityRole="button" accessibilityLabel={i18n.t('common.close')}>
              <MaterialCommunityIcons name="close" size={20} color={theme.colors.textSecondary} />
            </Pressable>
          </View>
          <ScrollView keyboardShouldPersistTaps="handled" bounces={false}>
            <CreateListForm
              active={visible}
              initialName={editing?.name ?? ''}
              initialEmoji={editing?.emoji ?? null}
              submitLabel={editing ? i18n.t('common.save') : i18n.t('restaurants.collections.create')}
              onSubmit={onSubmit}
              onDelete={editing ? onDelete : undefined}
              extraSection={editing && userId ? <MapVisibilityToggle userId={userId} collectionId={editing.id} /> : undefined}
            />
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const makeStyles = (theme: AppTheme) => StyleSheet.create({
  container: { flex: 1, justifyContent: 'flex-end' },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: theme.colors.overlay },
  content: {
    backgroundColor: theme.colors.detailSurface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.sm,
  },
  headerBtn: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, fontSize: 17, fontWeight: '700', color: theme.colors.textPrimary },
});
