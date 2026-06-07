import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  TouchableOpacity,
  Modal,
  ScrollView,
  TextInput,
  Animated,
  PanResponder,
  Alert,
  Keyboard,
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
import TextPromptModal from '../TextPromptModal';
import i18n from '../../utils/i18n';

const NOTE_MAX_LENGTH = 200;
const SHEET_MIN_RATIO = 0.5;
const SHEET_MAX_RATIO = 0.85;
// Sentinella per "ultima lista usata = Preferiti" (la default non ha un id noto qui).
const FAV_SENTINEL = 'favorites';

type Props = {
  visible: boolean;
  onClose: () => void;
  restaurantId: string;
  /** Preferiti (lista di default), gestita da useRestaurantDetail. */
  isFavorite: boolean;
  onSetFavorite: (value: boolean) => void;
  /** Liste custom + appartenenza del ristorante. */
  collections: CollectionWithCount[];
  membership: Set<string>;
  reloadCollections: () => void;
};

/**
 * Bottom sheet "Salva in…" a bozza+conferma (stile Google Maps): l'utente spunta
 * le liste, scrive l'eventuale nota, e nulla viene scritto finche' non preme
 * Conferma. La creazione di una nuova lista avviene subito (variante A), il luogo
 * ci entra solo alla Conferma.
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
  const { height: windowHeight } = useWindowDimensions();
  const hideOffset = windowHeight;
  const { user } = useAuth();
  const userId = user?.uid;

  // ─── Bozza locale ──────────────────────────────────────────────────────────
  const [favSelected, setFavSelected] = useState(false);
  const [selectedCustom, setSelectedCustom] = useState<Set<string>>(new Set());
  const [localCollections, setLocalCollections] = useState<CollectionWithCount[]>([]);
  const [note, setNote] = useState('');
  const initialNoteRef = useRef('');
  const [promptVisible, setPromptVisible] = useState(false);

  const anim = useRef(new Animated.Value(0)).current;
  const dragY = useRef(new Animated.Value(0)).current;
  const keyboardOffset = useRef(new Animated.Value(0)).current;
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  // Lift sincronizzato alla tastiera (native driver = fluido). Su iOS usiamo gli
  // eventi "will" con la durata di sistema; su Android i "did".
  useEffect(() => {
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const onShow = (e: any) => {
      const h = e.endCoordinates?.height ?? 0;
      Animated.timing(keyboardOffset, {
        toValue: -Math.max(0, h - insets.bottom),
        duration: e.duration || 250,
        useNativeDriver: true,
      }).start();
    };
    const onHide = (e: any) => {
      Animated.timing(keyboardOffset, {
        toValue: 0,
        duration: e.duration || 200,
        useNativeDriver: true,
      }).start();
    };
    const s1 = Keyboard.addListener(showEvt, onShow);
    const s2 = Keyboard.addListener(hideEvt, onHide);
    return () => { s1.remove(); s2.remove(); };
  }, [keyboardOffset, insets.bottom]);

  // Inizializza la bozza a ogni apertura.
  useEffect(() => {
    if (!visible) return;
    anim.setValue(0);
    dragY.setValue(0);
    keyboardOffset.setValue(0);
    Animated.timing(anim, { toValue: 1, duration: 280, useNativeDriver: true }).start();

    setLocalCollections(collections);
    setFavSelected(isFavorite);
    setSelectedCustom(new Set(membership));

    let cancelled = false;
    (async () => {
      // Nota corrente (se il posto e' salvato).
      const existing = userId ? await FavoriteNoteService.getFavoriteNote(userId, restaurantId) : null;
      if (cancelled) return;
      initialNoteRef.current = existing ?? '';
      setNote(existing ?? '');

      // Pre-selezione di default se il posto non e' ancora salvato da nessuna parte.
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
    Animated.timing(anim, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => {
      dragY.setValue(0);
      onCloseRef.current();
    });
  }, [anim, dragY]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gs) => gs.dy > 10 && Math.abs(gs.dy) > Math.abs(gs.dx),
      onPanResponderMove: (_, gs) => { if (gs.dy > 0) dragY.setValue(gs.dy); },
      onPanResponderRelease: (_, gs) => {
        if (gs.dy > 100 || gs.vy > 0.5) {
          Animated.timing(dragY, { toValue: hideOffset, duration: 200, useNativeDriver: true }).start(() => {
            anim.setValue(0);
            dragY.setValue(0);
            onCloseRef.current();
          });
        } else {
          Animated.spring(dragY, { toValue: 0, useNativeDriver: true, bounciness: 8 }).start();
        }
      },
    }),
  ).current;

  const savedCount = (favSelected ? 1 : 0) + selectedCustom.size;

  const toggleCustom = (id: string) => {
    setSelectedCustom((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  // Crea lista subito (A) e selezionala nella bozza; il luogo entra alla Conferma.
  const handleCreate = async (name: string, emoji: string | null) => {
    setPromptVisible(false);
    if (!userId) return;
    const created = await CollectionService.createCollection(userId, name, emoji);
    if (!created) return;
    setLocalCollections((prev) => [...prev, { ...created, item_count: 0 }]);
    setSelectedCustom((prev) => new Set(prev).add(created.id));
  };

  const commit = useCallback(async () => {
    const finalSaved = favSelected || selectedCustom.size > 0;

    // Preferiti (lista di default).
    if (favSelected !== isFavorite) onSetFavorite(favSelected);

    // Liste custom: diff bozza vs appartenenza attuale.
    await Promise.all(localCollections.map((c) => {
      const wasIn = membership.has(c.id);
      const nowIn = selectedCustom.has(c.id);
      if (nowIn && !wasIn) return CollectionService.addToCollection(c.id, restaurantId);
      if (!nowIn && wasIn) return CollectionService.removeFromCollection(c.id, restaurantId);
      return Promise.resolve();
    }));

    // Nota: vale solo se salvato in ≥1 lista; altrimenti la rimuoviamo.
    if (userId) {
      if (finalSaved) {
        if (note.trim() !== initialNoteRef.current.trim()) {
          await FavoriteNoteService.saveFavoriteNote(userId, restaurantId, note);
        }
      } else if (initialNoteRef.current.trim()) {
        await FavoriteNoteService.saveFavoriteNote(userId, restaurantId, '');
      }
    }

    // Ricorda l'ultima lista usata per la pre-selezione futura.
    const lastUsed = selectedCustom.size > 0 ? [...selectedCustom][selectedCustom.size - 1]
      : favSelected ? FAV_SENTINEL : null;
    if (lastUsed) CollectionService.setLastUsedCollectionId(lastUsed);

    reloadCollections();
    close();
  }, [favSelected, isFavorite, onSetFavorite, localCollections, membership, selectedCustom, restaurantId, userId, note, reloadCollections, close]);

  const handleConfirm = () => {
    const finalSaved = favSelected || selectedCustom.size > 0;
    // Togliendo il posto da tutte le liste con una nota presente: conferma.
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
        <Animated.View
          style={[styles.overlay, {
            opacity: Animated.multiply(
              anim,
              dragY.interpolate({ inputRange: [0, 300], outputRange: [1, 0], extrapolate: 'clamp' }),
            ),
          }]}
        >
          <Pressable style={StyleSheet.absoluteFill} onPress={close} />
        </Animated.View>

        <Animated.View
          style={[
            styles.content,
            { minHeight: windowHeight * SHEET_MIN_RATIO, maxHeight: windowHeight * SHEET_MAX_RATIO, paddingBottom: insets.bottom + theme.spacing.sm },
            { transform: [{ translateY: Animated.add(Animated.add(anim.interpolate({ inputRange: [0, 1], outputRange: [hideOffset, 0] }), dragY), keyboardOffset) }] },
          ]}
        >
          <View {...panResponder.panHandlers}>
            <View style={styles.handle} />
            <View style={styles.header}>
              <Text style={styles.title}>{i18n.t('restaurants.collections.saveTo')}</Text>
              <Pressable onPress={close} hitSlop={8} style={styles.closeButton} accessibilityRole="button" accessibilityLabel={i18n.t('common.close')}>
                <MaterialCommunityIcons name="close" size={20} color={theme.colors.textSecondary} />
              </Pressable>
            </View>
          </View>

          <ScrollView style={styles.scroll} keyboardShouldPersistTaps="handled" bounces={false}>
            {/* Preferiti (lista di default) */}
            <CollectionRow
              symbol={<MaterialCommunityIcons name={favSelected ? 'heart' : 'heart-outline'} size={22} color={favSelected ? theme.colors.error : theme.colors.textSecondary} />}
              label={i18n.t('restaurants.myRestaurants.filterFavorites')}
              checked={favSelected}
              onPress={() => setFavSelected((v) => !v)}
              theme={theme}
            />

            {/* Liste custom */}
            {localCollections.map((c) => (
              <CollectionRow
                key={c.id}
                symbol={c.emoji
                  ? <Text style={styles.rowEmoji}>{c.emoji}</Text>
                  : <MaterialCommunityIcons name="format-list-bulleted" size={22} color={theme.colors.textSecondary} />}
                label={c.name}
                count={c.item_count}
                checked={selectedCustom.has(c.id)}
                onPress={() => toggleCustom(c.id)}
                theme={theme}
              />
            ))}

            {/* Crea nuova lista */}
            <TouchableOpacity style={styles.createRow} onPress={() => setPromptVisible(true)} activeOpacity={0.6}>
              <MaterialCommunityIcons name="playlist-plus" size={22} color={theme.colors.primary} />
              <Text style={styles.createLabel}>{i18n.t('restaurants.collections.newList')}</Text>
            </TouchableOpacity>

            {/* Nota (solo se salvato in ≥1 lista) */}
            <View style={styles.noteSection}>
              {savedCount > 0 ? (
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
              ) : (
                <Text style={styles.noteHint}>{i18n.t('restaurants.collections.noteHint')}</Text>
              )}
            </View>
          </ScrollView>

          <TouchableOpacity style={styles.confirmButton} onPress={handleConfirm} activeOpacity={0.8}>
            <Text style={styles.confirmText}>{i18n.t('common.confirm')}</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>

      <TextPromptModal
        visible={promptVisible}
        title={i18n.t('restaurants.collections.createTitle')}
        placeholder={i18n.t('restaurants.collections.namePlaceholder')}
        confirmLabel={i18n.t('restaurants.collections.create')}
        showEmoji
        onCancel={() => setPromptVisible(false)}
        onConfirm={handleCreate}
      />
    </Modal>
  );
}

function CollectionRow({
  symbol,
  label,
  count,
  checked,
  onPress,
  theme,
}: {
  symbol: React.ReactNode;
  label: string;
  count?: number;
  checked: boolean;
  onPress: () => void;
  theme: AppTheme;
}) {
  const styles = useMemo(() => makeStyles(theme), [theme]);
  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.6}>
      <View style={styles.rowSymbol}>{symbol}</View>
      <View style={styles.rowLabelWrap}>
        <Text style={styles.rowLabel} numberOfLines={1}>{label}</Text>
        {count != null && <Text style={styles.rowCount}>{count}</Text>}
      </View>
      <MaterialCommunityIcons
        name={checked ? 'checkbox-marked' : 'checkbox-blank-outline'}
        size={22}
        color={checked ? theme.colors.primary : theme.colors.textDisabled}
      />
    </TouchableOpacity>
  );
}

const makeStyles = (theme: AppTheme) => StyleSheet.create({
  container: { flex: 1, justifyContent: 'flex-end' },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: theme.colors.overlay },
  content: {
    backgroundColor: theme.colors.detailSurface,
    borderTopLeftRadius: theme.radius.xl,
    borderTopRightRadius: theme.radius.xl,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.border,
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.xs,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
  },
  title: { fontSize: 17, fontWeight: '700', color: theme.colors.textPrimary },
  closeButton: { padding: 2 },
  // flex:1 fa riempire l'altezza minima del modal alla lista: il box nota che
  // compare/scompare resta dentro quest'area e non cambia l'altezza del modal.
  scroll: { flex: 1 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
  },
  rowSymbol: { width: 24, alignItems: 'center' },
  rowEmoji: { fontSize: 20 },
  rowLabelWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  rowLabel: { flexShrink: 1, fontSize: 15, color: theme.colors.textPrimary },
  rowCount: { fontSize: 13, color: theme.colors.textSecondary },
  createRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.divider,
  },
  createLabel: { fontSize: 15, fontWeight: '600', color: theme.colors.primary },
  noteSection: {
    // Altezza stabile: input e hint occupano lo stesso spazio, cosi' il
    // comparire/scomparire della nota non sposta nulla.
    minHeight: 96,
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.divider,
  },
  noteInput: {
    fontSize: 14,
    color: theme.colors.textPrimary,
    lineHeight: 20,
    minHeight: 44,
    padding: theme.spacing.sm,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.detailMuted,
  },
  noteHint: { fontSize: 13, color: theme.colors.textSecondary },
  confirmButton: {
    marginHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.sm,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
  },
  confirmText: { fontSize: 15, fontWeight: '700', color: theme.colors.onPrimary },
});
