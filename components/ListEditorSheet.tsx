import { useRef, useEffect, useCallback, useMemo } from 'react';
import { View, StyleSheet, Pressable, Modal, ScrollView, Animated, Easing, Keyboard, Platform, useWindowDimensions } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import type { AppTheme } from '../constants/theme';
import CreateListForm from './restaurants/CreateListForm';
import i18n from '../utils/i18n';

export type EditingList = { id: string; name: string; emoji: string | null };

type Props = {
  visible: boolean;
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
export default function ListEditorSheet({ visible, editing, onClose, onSubmit, onDelete }: Props) {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const hideOffset = height;

  const anim = useRef(new Animated.Value(0)).current;
  const keyboardOffset = useRef(new Animated.Value(0)).current;
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const onShow = (e: any) => {
      Animated.timing(keyboardOffset, {
        toValue: -Math.max(0, (e.endCoordinates?.height ?? 0) - insets.bottom),
        duration: e.duration || 220,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }).start();
    };
    const onHide = (e: any) => {
      Animated.timing(keyboardOffset, {
        toValue: 0,
        duration: e.duration || 180,
        easing: Easing.in(Easing.ease),
        useNativeDriver: true,
      }).start();
    };
    const s1 = Keyboard.addListener(showEvt, onShow);
    const s2 = Keyboard.addListener(hideEvt, onHide);
    return () => { s1.remove(); s2.remove(); };
  }, [keyboardOffset, insets.bottom]);

  useEffect(() => {
    if (!visible) return;
    anim.setValue(0);
    keyboardOffset.setValue(0);
    Animated.timing(anim, { toValue: 1, duration: 280, useNativeDriver: true }).start();
  }, [visible, anim, keyboardOffset]);

  const close = useCallback(() => {
    Keyboard.dismiss();
    Animated.timing(anim, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => {
      onCloseRef.current();
    });
  }, [anim]);

  return (
    <Modal visible={visible} animationType="none" transparent statusBarTranslucent onRequestClose={close}>
      <View style={styles.container}>
        <Animated.View style={[styles.overlay, { opacity: anim }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={close} />
        </Animated.View>

        <Animated.View
          style={[
            styles.content,
            { paddingBottom: insets.bottom + theme.spacing.md },
            { transform: [{ translateY: Animated.add(anim.interpolate({ inputRange: [0, 1], outputRange: [hideOffset, 0] }), keyboardOffset) }] },
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
