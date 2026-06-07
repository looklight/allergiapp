import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  TouchableOpacity,
  Modal,
  ScrollView,
  TextInput,
  Alert,
  Keyboard,
  LayoutAnimation,
  UIManager,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../contexts/ThemeContext';
import type { AppTheme } from '../../constants/theme';
import { CollectionService, type CollectionWithCount } from '../../services/collectionService';
import { FavoriteNoteService } from '../../services/favoriteNoteService';
import { useAuth } from '../../contexts/AuthContext';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolate,
  runOnJS,
} from 'react-native-reanimated';
import CreateListForm from './CreateListForm';
import i18n from '../../utils/i18n';

const NOTE_MAX_LENGTH = 200;
const MIN_RATIO = 0.4;
const MAX_RATIO = 0.85;
// Stima dell'altezza "non-lista" (header + nota + conferma + paddings): serve a
// dimensionare il modal in modo adattivo a partire dall'altezza delle righe.
const CHROME = 230;
const FAV_SENTINEL = 'favorites';

// Android (old arch) richiede l'opt-in esplicito per LayoutAnimation.
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// Animazione di layout NATIVA agganciata alla curva della tastiera: la lista si
// comprime in un colpo solo (CoreAnimation/native), niente reflow per-frame in JS.
const keyboardLayout = (duration?: number) => ({
  duration: duration && duration > 0 ? duration : 250,
  update: { type: (LayoutAnimation.Types as any).keyboard ?? LayoutAnimation.Types.easeInEaseOut },
});

type Props = {
  visible: boolean;
  onClose: () => void;
  restaurantId: string;
  isFavorite: boolean;
  onSetFavorite: (value: boolean) => void;
  collections: CollectionWithCount[];
  membership: Set<string>;
  reloadCollections: () => void;
};

/**
 * Bottom sheet "Salva in…" a bozza+conferma, stile Google Maps. Altezza
 * adattiva (min..max) misurata dal contenuto della lista; l'editor laterale
 * (crea/modifica/elimina) condivide la stessa altezza, cosi' lo slide non fa
 * salti. Nota pinnata in basso sempre visibile. Niente modal-su-modal.
 */
export default function SaveToCollectionSheet({
  visible,
  onClose,
  restaurantId,
  isFavorite,
  onSetFavorite,
  collections,
  membership,
  reloadCollections,
}: Props) {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const hideOffset = height;
  const minH = height * MIN_RATIO;
  const maxH = height * MAX_RATIO;
  const { user } = useAuth();
  const userId = user?.uid;

  // ─── Bozza locale ──────────────────────────────────────────────────────────
  const [favSelected, setFavSelected] = useState(false);
  const [selectedCustom, setSelectedCustom] = useState<Set<string>>(new Set());
  const [localCollections, setLocalCollections] = useState<CollectionWithCount[]>([]);
  const [note, setNote] = useState('');
  const initialNoteRef = useRef('');

  const [mode, setMode] = useState<'list' | 'editor'>('list');
  const [editing, setEditing] = useState<CollectionWithCount | null>(null);
  const [contentHeight, setContentHeight] = useState(height * 0.5);
  const [kbInset, setKbInset] = useState(0);

  const progress = useSharedValue(0);
  const panelX = useSharedValue(0);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const finishClose = useCallback(() => onCloseRef.current(), []);

  // Apertura/chiusura del foglio e slide tra i pannelli: solo transform
  // (compositati, fluidi). La tastiera NON è gestita qui ma via LayoutAnimation
  // nativa (vedi effetto sotto) per evitare reflow per-frame.
  const overlayStyle = useAnimatedStyle(() => ({ opacity: progress.value }));
  const contentStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(progress.value, [0, 1], [hideOffset, 0]) }],
  }));
  const panelsStyle = useAnimatedStyle(() => ({ transform: [{ translateX: panelX.value }] }));

  // Quando appare la tastiera comprimi il foglio con un'unica animazione di
  // layout nativa agganciata alla durata reale dell'evento: la lista (flex:1)
  // si restringe, testata in alto, nota/conferma agganciate sopra la tastiera.
  // SOLO iOS: su Android la finestra del Modal è già ridimensionata dal sistema
  // (softInput=resize), quindi useWindowDimensions().height si riduce da solo e
  // un inset manuale raddoppierebbe l'offset (foglio "sparato" troppo in alto).
  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    const onShow = (e: { duration?: number; endCoordinates?: { height: number } }) => {
      LayoutAnimation.configureNext(keyboardLayout(e.duration));
      setKbInset(e.endCoordinates?.height ?? 0);
    };
    const onHide = (e: { duration?: number }) => {
      LayoutAnimation.configureNext(keyboardLayout(e?.duration));
      setKbInset(0);
    };
    const s = Keyboard.addListener('keyboardWillShow', onShow);
    const h = Keyboard.addListener('keyboardWillHide', onHide);
    return () => { s.remove(); h.remove(); };
  }, []);

  const sheetHeight = Math.min(contentHeight, height - insets.top - kbInset);

  // Inizializza la bozza a ogni apertura.
  useEffect(() => {
    if (!visible) return;
    progress.value = 0;
    panelX.value = 0;
    setMode('list');
    setEditing(null);
    progress.value = withTiming(1, { duration: 280 });

    setLocalCollections(collections);
    setFavSelected(isFavorite);
    setSelectedCustom(new Set(membership));

    let cancelled = false;
    (async () => {
      const existing = userId ? await FavoriteNoteService.getFavoriteNote(userId, restaurantId) : null;
      if (cancelled) return;
      initialNoteRef.current = existing ?? '';
      setNote(existing ?? '');
      if (!isFavorite && membership.size === 0) {
        const last = await CollectionService.getLastUsedCollectionId();
        if (cancelled) return;
        if (last && last !== FAV_SENTINEL && collections.some((c) => c.id === last)) {
          setSelectedCustom(new Set([last]));
        } else {
          setFavSelected(true);
        }
      }
    })();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- init solo all'apertura
  }, [visible]);

  const close = useCallback(() => {
    progress.value = withTiming(0, { duration: 200 }, (finished) => {
      if (finished) runOnJS(finishClose)();
    });
  }, [progress, finishClose]);

  // Altezza adattiva dalle righe della lista (min..max). L'editor condivide.
  const onRowsSize = useCallback((_: number, h: number) => {
    const next = Math.min(maxH, Math.max(minH, h + CHROME + insets.bottom));
    setContentHeight((prev) => (Math.abs(prev - next) > 1 ? next : prev));
  }, [minH, maxH, insets.bottom]);

  const openEditor = (list: CollectionWithCount | null) => {
    setEditing(list);
    setMode('editor');
    panelX.value = withTiming(-width, { duration: 280 });
  };
  const closeEditor = useCallback(() => {
    Keyboard.dismiss();
    panelX.value = withTiming(0, { duration: 280 });
    setMode('list');
    setEditing(null);
  }, [panelX]);

  const handleFormSubmit = async (name: string, emoji: string | null) => {
    if (!userId) return;
    if (editing) {
      await CollectionService.updateCollection(editing.id, { name, emoji });
      setLocalCollections((prev) => prev.map((c) => (c.id === editing.id ? { ...c, name, emoji } : c)));
      closeEditor();
    } else {
      const created = await CollectionService.createCollection(userId, name, emoji);
      if (!created) return;
      setLocalCollections((prev) => [...prev, { ...created, item_count: 0 }]);
      setSelectedCustom((prev) => new Set(prev).add(created.id));
      closeEditor();
    }
  };

  const handleDelete = () => {
    if (!editing) return;
    const target = editing;
    Alert.alert(
      i18n.t('restaurants.collections.deleteTitle'),
      i18n.t('restaurants.collections.deleteConfirm', { name: target.name }),
      [
        { text: i18n.t('common.cancel'), style: 'cancel' },
        {
          text: i18n.t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            await CollectionService.deleteCollection(target.id);
            setLocalCollections((prev) => prev.filter((c) => c.id !== target.id));
            setSelectedCustom((prev) => { const n = new Set(prev); n.delete(target.id); return n; });
            closeEditor();
          },
        },
      ],
    );
  };

  const savedCount = (favSelected ? 1 : 0) + selectedCustom.size;

  const commit = useCallback(async () => {
    const finalSaved = favSelected || selectedCustom.size > 0;
    if (favSelected !== isFavorite) onSetFavorite(favSelected);

    await Promise.all(localCollections.map((c) => {
      const wasIn = membership.has(c.id);
      const nowIn = selectedCustom.has(c.id);
      if (nowIn && !wasIn) return CollectionService.addToCollection(c.id, restaurantId);
      if (!nowIn && wasIn) return CollectionService.removeFromCollection(c.id, restaurantId);
      return Promise.resolve();
    }));

    if (userId) {
      if (finalSaved) {
        if (note.trim() !== initialNoteRef.current.trim()) {
          await FavoriteNoteService.saveFavoriteNote(userId, restaurantId, note);
        }
      } else if (initialNoteRef.current.trim()) {
        await FavoriteNoteService.saveFavoriteNote(userId, restaurantId, '');
      }
    }

    const lastUsed = selectedCustom.size > 0 ? [...selectedCustom][selectedCustom.size - 1]
      : favSelected ? FAV_SENTINEL : null;
    if (lastUsed) CollectionService.setLastUsedCollectionId(lastUsed);

    reloadCollections();
    close();
  }, [favSelected, isFavorite, onSetFavorite, localCollections, membership, selectedCustom, restaurantId, userId, note, reloadCollections, close]);

  const handleConfirm = () => {
    const finalSaved = favSelected || selectedCustom.size > 0;
    if (!finalSaved && initialNoteRef.current.trim()) {
      Alert.alert(
        i18n.t('restaurants.collections.removeNoteTitle'),
        i18n.t('restaurants.collections.removeNoteMessage'),
        [
          { text: i18n.t('common.cancel'), style: 'cancel' },
          { text: i18n.t('common.delete'), style: 'destructive', onPress: () => { commit(); } },
        ],
      );
      return;
    }
    commit();
  };

  return (
    <Modal visible={visible} animationType="none" transparent statusBarTranslucent onRequestClose={close}>
      <View style={styles.container}>
        <Animated.View style={[styles.overlay, overlayStyle]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={close} />
        </Animated.View>

        <Animated.View
          style={[
            styles.content,
            {
              height: sheetHeight,
              marginBottom: kbInset,
              paddingBottom: (kbInset > 0 ? 0 : insets.bottom) + theme.spacing.sm,
            },
            contentStyle,
          ]}
        >
          <Animated.View style={[styles.panels, { width: width * 2 }, panelsStyle]}>
            {/* ─── PANNELLO ELENCO ─── */}
            <View style={[styles.panel, { width }]}>
              <View style={styles.header}>
                <Text style={styles.title}>{i18n.t('restaurants.collections.saveTo')}</Text>
                <Pressable onPress={close} hitSlop={8} style={styles.headerBtn} accessibilityRole="button" accessibilityLabel={i18n.t('common.close')}>
                  <MaterialCommunityIcons name="close" size={20} color={theme.colors.textSecondary} />
                </Pressable>
              </View>

              <ScrollView style={styles.scroll} keyboardShouldPersistTaps="handled" bounces={false} onContentSizeChange={onRowsSize}>
                <Row
                  checked={favSelected}
                  onToggle={() => setFavSelected((v) => !v)}
                  symbol={<MaterialCommunityIcons name={favSelected ? 'heart' : 'heart-outline'} size={22} color={favSelected ? theme.colors.error : theme.colors.textSecondary} />}
                  label={i18n.t('restaurants.myRestaurants.filterFavorites')}
                  theme={theme}
                />
                {localCollections.map((c) => (
                  <Row
                    key={c.id}
                    checked={selectedCustom.has(c.id)}
                    onToggle={() => setSelectedCustom((prev) => { const n = new Set(prev); if (n.has(c.id)) n.delete(c.id); else n.add(c.id); return n; })}
                    symbol={c.emoji ? <Text style={styles.rowEmoji}>{c.emoji}</Text> : <MaterialCommunityIcons name="format-list-bulleted" size={22} color={theme.colors.textSecondary} />}
                    label={c.name}
                    count={c.item_count}
                    onEdit={() => openEditor(c)}
                    theme={theme}
                  />
                ))}
                <TouchableOpacity style={styles.createRow} onPress={() => openEditor(null)} activeOpacity={0.6}>
                  <MaterialCommunityIcons name="playlist-plus" size={22} color={theme.colors.primary} />
                  <Text style={styles.createLabel}>{i18n.t('restaurants.collections.newList')}</Text>
                </TouchableOpacity>
              </ScrollView>

              {/* Nota: sezione etichettata, separata dalla lista, sempre visibile. */}
              <View style={styles.noteSection}>
                <View style={styles.noteHeader}>
                  <MaterialCommunityIcons name="note-edit-outline" size={15} color={theme.colors.textSecondary} />
                  <Text style={styles.noteLabel}>{i18n.t('restaurants.collections.noteLabel')}</Text>
                </View>
                <View style={styles.noteBox}>
                  <TextInput
                    style={styles.noteInput}
                    value={note}
                    onChangeText={setNote}
                    placeholder={i18n.t('restaurants.detail.notes.placeholder')}
                    placeholderTextColor={theme.colors.textSecondary}
                    multiline
                    maxLength={NOTE_MAX_LENGTH}
                    textAlignVertical="top"
                  />
                </View>
              </View>

              <TouchableOpacity style={styles.confirmButton} onPress={handleConfirm} activeOpacity={0.8}>
                <Text style={styles.confirmText}>
                  {savedCount === 0 ? i18n.t('restaurants.collections.remove') : i18n.t('common.confirm')}
                </Text>
              </TouchableOpacity>
            </View>

            {/* ─── PANNELLO EDITOR ─── */}
            <View style={[styles.panel, { width }]}>
              <View style={styles.header}>
                <Pressable onPress={closeEditor} hitSlop={8} style={styles.headerBtn} accessibilityRole="button" accessibilityLabel={i18n.t('common.cancel')}>
                  <MaterialCommunityIcons name="chevron-left" size={24} color={theme.colors.textPrimary} />
                </Pressable>
                <Text style={styles.title}>
                  {editing ? i18n.t('restaurants.collections.renameTitle') : i18n.t('restaurants.collections.createTitle')}
                </Text>
                <View style={styles.headerBtn} />
              </View>
              <ScrollView keyboardShouldPersistTaps="handled" bounces={false}>
                <CreateListForm
                  active={mode === 'editor'}
                  initialName={editing?.name ?? ''}
                  initialEmoji={editing?.emoji ?? null}
                  submitLabel={editing ? i18n.t('common.save') : i18n.t('restaurants.collections.create')}
                  onSubmit={handleFormSubmit}
                  onDelete={editing ? handleDelete : undefined}
                />
              </ScrollView>
            </View>
          </Animated.View>
        </Animated.View>
      </View>
    </Modal>
  );
}

function Row({
  checked,
  onToggle,
  symbol,
  label,
  count,
  onEdit,
  theme,
}: {
  checked: boolean;
  onToggle: () => void;
  symbol: React.ReactNode;
  label: string;
  count?: number;
  onEdit?: () => void;
  theme: AppTheme;
}) {
  const styles = useMemo(() => makeStyles(theme), [theme]);
  return (
    <View style={styles.row}>
      <TouchableOpacity style={styles.rowMain} onPress={onToggle} activeOpacity={0.6}>
        <MaterialCommunityIcons
          name={checked ? 'checkbox-marked-circle' : 'checkbox-blank-circle-outline'}
          size={22}
          color={checked ? theme.colors.primary : theme.colors.textDisabled}
        />
        <View style={styles.rowSymbol}>{symbol}</View>
        <View style={styles.rowLabelWrap}>
          <Text style={styles.rowLabel} numberOfLines={1}>{label}</Text>
          {count != null && <Text style={styles.rowCount}>({count})</Text>}
        </View>
      </TouchableOpacity>
      {onEdit && (
        <TouchableOpacity onPress={onEdit} hitSlop={10} style={styles.editBtn} accessibilityRole="button" accessibilityLabel={i18n.t('common.edit')}>
          <MaterialCommunityIcons name="pencil-outline" size={20} color={theme.colors.textSecondary} />
        </TouchableOpacity>
      )}
    </View>
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
  panels: { flex: 1, flexDirection: 'row' },
  panel: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
  },
  headerBtn: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '700', color: theme.colors.textPrimary },
  scroll: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: theme.spacing.lg },
  rowMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md, paddingVertical: theme.spacing.md },
  rowSymbol: { width: 24, alignItems: 'center' },
  rowEmoji: { fontSize: 20 },
  rowLabelWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs },
  rowLabel: { flexShrink: 1, fontSize: 15, color: theme.colors.textPrimary },
  rowCount: { fontSize: 13, color: theme.colors.textSecondary },
  editBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  createRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
  },
  createLabel: { fontSize: 15, fontWeight: '600', color: theme.colors.primary },
  noteSection: {
    paddingTop: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.divider,
    gap: theme.spacing.sm,
  },
  noteHeader: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs },
  noteLabel: { fontSize: 13, fontWeight: '600', color: theme.colors.textSecondary },
  noteBox: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.detailMuted,
  },
  noteInput: { fontSize: 14, color: theme.colors.textPrimary, lineHeight: 20, minHeight: 40, padding: 0 },
  confirmButton: {
    marginHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.xl,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
  },
  confirmText: { fontSize: 15, fontWeight: '700', color: theme.colors.onPrimary },
});
