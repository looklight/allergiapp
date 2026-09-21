import { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { View, ScrollView, FlatList, Image, TouchableOpacity, StyleSheet, Linking, Modal, Pressable } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, interpolate, runOnJS } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../contexts/ThemeContext';
import { useAppContext } from '../../contexts/AppContext';
import type { AppTheme } from '../../constants/theme';
import i18n from '../../utils/i18n';
import { categoryName } from '../../constants/dishCategories';
import { dishCompat, sortByCompat, CAROUSEL_MAX, type CompatLevel, type ViewerNeeds } from '../../utils/partnerDish';
import type { PartnerCard, PartnerCardDish, PartnerCardLink, PartnerLinkKind } from '../../services/partnerCardService';

const DISH_SIZE = 110;

// ─── La scheda del ristoratore, dentro la scheda del ristorante ──────────────
// Disegno preso dall'anteprima del portale (partner/src/components/preview/
// SchedaPreview.tsx), che e' la replica fedele di questa sezione: pill dei
// collegamenti sotto il banner della compatibilita', poi i piatti in cerchi.
//
// I PIATTI SONO TONDI e le foto della community sono quadrate: due linguaggi
// visivi distinti per due cose che non si devono confondere — quello che
// dichiara il ristorante e quello che raccontano le persone.
//
// LE FOTO: qui si usa solo la miniatura (240px). La grande (900px) esiste ma
// non arriva in questa lista nemmeno per sbaglio — il database le tiene
// separate apposta (migration 731) — e si scarica solo aprendo il piatto.
// Nessun caricamento anticipato: la lista scorre e le immagini arrivano.

// I quattro colori dei collegamenti (luglio 2026). Stanno qui e non nel tema
// dell'app perche' sono di questa sezione soltanto; le varianti scure sono la
// stessa tinta portata su fondo profondo, come fa il tema con l'ambra.
const LINK_STYLES: Record<PartnerLinkKind, { bg: string; fg: string; bgDark: string; fgDark: string; icon: keyof typeof MaterialCommunityIcons.glyphMap }> = {
  booking: { bg: '#E3F2FD', fg: '#1976D2', bgDark: '#1B2A38', fgDark: '#82B1FF', icon: 'calendar-check' },
  delivery: { bg: '#FFF3E0', fg: '#E65100', bgDark: '#33261A', fgDark: '#FFB74D', icon: 'moped' },
  menu: { bg: '#E8F5E9', fg: '#2E7D32', bgDark: '#22301F', fgDark: '#81C784', icon: 'silverware-fork-knife' },
  website: { bg: '#F3E5F5', fg: '#7B1FA2', bgDark: '#2B1F33', fgDark: '#CE93D8', icon: 'web' },
};

const LINK_ORDER: PartnerLinkKind[] = ['booking', 'delivery', 'menu', 'website'];

// I servizi di delivery si chiamano col loro nome (copia di
// partner/src/lib/providers.ts): sono nomi propri, non si traducono.
const DELIVERY_NAMES: Record<string, string> = {
  glovo: 'Glovo',
  deliveroo: 'Deliveroo',
  justeat: 'Just Eat',
  ubereats: 'Uber Eats',
};

type Props = {
  card: PartnerCard;
  /** Esigenze di chi guarda: riordinano il carosello e colorano i pallini. */
  needs: ViewerNeeds;
  /** Apre la schermata con tutti i piatti; con un piatto, lo apre gia' aperto. */
  onSeeAll: (dishId?: string) => void;
};

export default function PartnerCardSection({ card, needs, onSeeAll }: Props) {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  // Quando un collegamento ha piu' destinazioni (tre delivery, oppure
  // prenotazione per telefono e online insieme) la pill e' una sola e la
  // scelta si fa qui.
  const [choice, setChoice] = useState<PartnerCardLink[] | null>(null);

  // L'avviso si comporta come quello delle recensioni: la ⓘ accanto al titolo
  // lo apre e lo chiude, «Nascondi» lo mette via per sempre. Chi l'ha gia'
  // letto una volta non se lo ritrova addosso a ogni ristorante — e nella
  // schermata «Vedi tutto», dove i piatti si leggono davvero uno per uno,
  // resta scritto comunque.
  const { settings, dismissMenuDisclaimer } = useAppContext();
  const [noticeOpen, setNoticeOpen] = useState(!(settings.menuDisclaimerDismissed ?? false));

  const pills = useMemo(() => buildPills(card.links), [card.links]);

  const carousel = useMemo(
    () => sortByCompat(card.dishes, needs).slice(0, CAROUSEL_MAX),
    [card.dishes, needs],
  );
  const hidden = card.dishes.length - carousel.length;

  const open = (link: PartnerCardLink) => {
    // Il numero come lo ha scritto il ristoratore puo' avere spazi e
    // parentesi: `tel:` non li digerisce su Android.
    if (link.kind === 'booking' && !link.url) {
      const numero = link.phone.replace(/[^\d+]/g, '');
      if (numero) Linking.openURL(`tel:${numero}`).catch(() => {});
      return;
    }
    if (!link.url) return;
    // Un indirizzo salvato senza «https://» non si apre e il tocco sembra
    // rotto: il portale normalizza, ma qui non costa niente assicurarsene.
    const url = /^[a-z][a-z0-9+.-]*:/i.test(link.url) ? link.url : `https://${link.url}`;
    Linking.openURL(url).catch(() => {});
  };

  const onPillPress = (group: PartnerCardLink[]) => {
    if (group.length === 1) open(group[0]);
    else setChoice(group);
  };

  return (
    <View style={styles.wrap}>
      {pills.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillRow}>
          {pills.map(({ kind, group }) => {
            const c = LINK_STYLES[kind];
            const bg = theme.dark ? c.bgDark : c.bg;
            const fg = theme.dark ? c.fgDark : c.fg;
            return (
              <TouchableOpacity
                key={kind}
                style={[styles.pill, { backgroundColor: bg }]}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={i18n.t(`restaurants.partnerCard.link_${kind}`)}
                onPress={() => onPillPress(group)}
              >
                <MaterialCommunityIcons name={c.icon} size={16} color={fg} />
                <Text style={[styles.pillLabel, { color: fg }]}>
                  {i18n.t(`restaurants.partnerCard.link_${kind}`)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {card.dishes.length > 0 && (
        <>
          <View style={styles.separator} />
          <View style={styles.dishes}>
            <View style={styles.titleRow}>
              <Text style={styles.title}>
                {i18n.t('restaurants.partnerCard.title')} ({card.dishes.length})
              </Text>
              <TouchableOpacity
                onPress={() => setNoticeOpen((v) => !v)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <MaterialCommunityIcons
                  name="information-outline"
                  size={16}
                  color={noticeOpen ? theme.colors.primary : theme.colors.textDisabled}
                />
              </TouchableOpacity>
              <View style={styles.titleSpacer} />
              <TouchableOpacity style={styles.seeAll} activeOpacity={0.7} onPress={() => onSeeAll()}>
                <Text style={styles.seeAllText}>{i18n.t('restaurants.partnerCard.seeAll')}</Text>
                <MaterialCommunityIcons name="chevron-right" size={16} color={theme.colors.primary} />
              </TouchableOpacity>
            </View>

            {noticeOpen && (
              <TouchableOpacity
                style={styles.disclaimerBox}
                activeOpacity={0.7}
                accessibilityRole="button"
                onPress={() => { setNoticeOpen(false); void dismissMenuDisclaimer(); }}
              >
                <Text style={styles.disclaimer}>
                  {i18n.t('restaurants.partnerCard.disclaimer')}{' '}
                  <Text style={styles.disclaimerHide}>{i18n.t('restaurants.partnerCard.hide')}</Text>
                </Text>
              </TouchableOpacity>
            )}

            <FlatList
              data={carousel}
              keyExtractor={(d) => d.id}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.carousel}
              // Le miniature entrano in scena scorrendo: mai tutte insieme.
              initialNumToRender={4}
              windowSize={3}
              renderItem={({ item }) => (
                <DishCircle
                  dish={item}
                  needs={needs}
                  styles={styles}
                  theme={theme}
                  onPress={() => onSeeAll(item.id)}
                />
              )}
              ListFooterComponent={
                hidden > 0 ? (
                  <TouchableOpacity style={styles.dish} activeOpacity={0.7} onPress={() => onSeeAll()}>
                    <View style={[styles.photo, styles.morePhoto]}>
                      <Text style={styles.moreCount}>+{hidden}</Text>
                    </View>
                    <View style={styles.moreRow}>
                      <Text style={styles.moreLabel}>{i18n.t('restaurants.partnerCard.seeAll')}</Text>
                      <MaterialCommunityIcons name="chevron-right" size={14} color={theme.colors.primary} />
                    </View>
                  </TouchableOpacity>
                ) : null
              }
            />
          </View>
          {/* Chiusa anche sotto: i piatti sono una sezione a se', come «La tua
              opinione» e «Recensioni», non un pezzo appeso alle foto. */}
          <View style={styles.separator} />
        </>
      )}

      <ChoiceSheet
        choice={choice}
        onPick={(link) => open(link)}
        onClose={() => setChoice(null)}
      />
    </View>
  );
}

const BADGE_ICON: Record<CompatLevel, keyof typeof MaterialCommunityIcons.glyphMap> = {
  green: 'shield-check',
  gray: 'shield-outline',
  amber: 'shield-alert',
};

function DishCircle({
  dish, needs, styles, theme, onPress,
}: {
  dish: PartnerCardDish;
  needs: ViewerNeeds;
  styles: ReturnType<typeof makeStyles>;
  theme: AppTheme;
  onPress: () => void;
}) {
  const compat = dishCompat(dish, needs);
  const badgeColor = compat
    ? { green: theme.colors.success, gray: theme.colors.textDisabled, amber: theme.colors.amberDark }[compat.level]
    : undefined;

  return (
    <TouchableOpacity style={styles.dish} activeOpacity={0.8} onPress={onPress}>
      <View>
        {dish.thumbUrl ? (
          <Image
            source={{ uri: dish.thumbUrl }}
            style={[styles.photo, compat?.level === 'amber' && styles.photoDimmed]}
          />
        ) : (
          <View style={[styles.photo, styles.photoEmpty]}>
            <MaterialCommunityIcons name="silverware-fork-knife" size={26} color={theme.colors.textDisabled} />
          </View>
        )}
        {compat && (
          <View style={styles.badge}>
            <MaterialCommunityIcons name={BADGE_ICON[compat.level]} size={12} color={badgeColor} />
          </View>
        )}
      </View>
      <Text style={styles.dishName} numberOfLines={1}>{dish.name}</Text>
      {dish.category !== '' && (
        <Text style={styles.dishCategory} numberOfLines={1}>
          {categoryName(dish.category, i18n.locale)}
        </Text>
      )}
    </TouchableOpacity>
  );
}

/**
 * Da righe sparse a quattro pill al massimo. Un collegamento con piu'
 * destinazioni resta UNA pill (tre delivery non sono tre bottoni): la scelta
 * si fa dopo il tocco.
 *
 * Il menu' esterno fa eccezione: di quelli si sceglie SUBITO quello nella
 * lingua di chi guarda, e non si chiede niente a nessuno.
 */
function buildPills(links: PartnerCardLink[]): { kind: PartnerLinkKind; group: PartnerCardLink[] }[] {
  const out: { kind: PartnerLinkKind; group: PartnerCardLink[] }[] = [];
  for (const kind of LINK_ORDER) {
    let group = links.filter((l) => l.kind === kind && (l.url !== '' || l.phone !== ''));
    if (group.length === 0) continue;
    // LA PRENOTAZIONE ARRIVA IN UNA RIGA SOLA anche quando il ristoratore ha
    // dato tutti e due i modi (sito e telefono): il database la tiene cosi'.
    // Qui diventa due scelte, o il telefono non lo chiamerebbe mai nessuno.
    if (kind === 'booking') {
      group = group.flatMap((l) =>
        l.url !== '' && l.phone !== ''
          ? [{ ...l, phone: '' }, { ...l, url: '' }]
          : [l],
      );
    }
    if (kind === 'menu' && group.length > 1) {
      const mine = group.find((l) => l.language === i18n.locale) ?? group.find((l) => l.language === '');
      group = [mine ?? group[0]];
    }
    out.push({ kind, group });
  }
  return out;
}

/**
 * Cosa si legge, e con che icona, in ogni riga della scelta. Come
 * nell'anteprima del portale: il delivery col nome del servizio, la
 * prenotazione al telefono col NUMERO — che e' l'informazione utile, non
 * «chiama il ristorante».
 */
function choiceRow(link: PartnerCardLink): {
  label: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
} {
  if (link.kind === 'booking' && link.url === '') {
    return { label: link.phone, icon: 'phone-outline' };
  }
  if (link.kind === 'booking') {
    return { label: i18n.t('restaurants.partnerCard.bookOnline'), icon: LINK_STYLES.booking.icon };
  }
  if (link.kind === 'delivery') {
    const nome =
      (link.provider !== 'other' ? DELIVERY_NAMES[link.provider] : '') ||
      link.label ||
      i18n.t('restaurants.partnerCard.link_delivery');
    return { label: nome, icon: LINK_STYLES.delivery.icon };
  }
  return {
    label: link.label || i18n.t(`restaurants.partnerCard.link_${link.kind}`),
    icon: LINK_STYLES[link.kind].icon,
  };
}

/**
 * LA SCELTA, quando una pill porta a piu' posti: tre servizi di delivery, o
 * una prenotazione che si puo' fare online e al telefono.
 *
 * Stesso stampo degli altri fogli dell'app (ShareProfileSheet,
 * ListEditorSheet, SaveToCollectionSheet): la finestra nativa non anima
 * niente, sale il solo pannello mentre il velo sfuma. L'animazione nativa di
 * iOS portava su anche la sua ombra, e si vedeva.
 */
function ChoiceSheet({
  choice, onPick, onClose,
}: {
  choice: PartnerCardLink[] | null;
  onPick: (link: PartnerCardLink) => void;
  onClose: () => void;
}) {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const insets = useSafeAreaInsets();
  const visible = choice !== null;

  const progress = useSharedValue(0);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const finishClose = useCallback(() => onCloseRef.current(), []);

  const overlayStyle = useAnimatedStyle(() => ({ opacity: progress.value }));
  const contentStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(progress.value, [0, 1], [400, 0]) }],
  }));

  useEffect(() => {
    if (!visible) return;
    progress.value = 0;
    progress.value = withTiming(1, { duration: 280 });
  }, [visible, progress]);

  const close = useCallback(() => {
    progress.value = withTiming(0, { duration: 200 }, (finished) => {
      if (finished) runOnJS(finishClose)();
    });
  }, [progress, finishClose]);

  return (
    <Modal visible={visible} animationType="none" transparent statusBarTranslucent onRequestClose={close}>
      <View style={styles.sheetContainer}>
        <Animated.View style={[styles.sheetOverlay, overlayStyle]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={close} />
        </Animated.View>

        <Animated.View
          style={[styles.sheetContent, { paddingBottom: insets.bottom + theme.spacing.md }, contentStyle]}
        >
          {/* La maniglia dice «questo foglio e' salito dal basso», come
              nell'anteprima del portale. Niente titolo: si arriva qui da una
              pill che dice gia' cosa stai facendo, e le righe si leggono da
              sole (il nome del servizio, il numero di telefono). */}
          <View style={styles.sheetGrabber} />

          {(choice ?? []).map((link, i) => {
            const riga = choiceRow(link);
            const tinta = theme.dark ? LINK_STYLES[link.kind].fgDark : LINK_STYLES[link.kind].fg;
            return (
              <TouchableOpacity
                key={`${link.kind}-${i}`}
                style={[styles.sheetRow, i > 0 && styles.sheetRowDivided]}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={riga.label}
                onPress={() => { onPick(link); close(); }}
              >
                <MaterialCommunityIcons name={riga.icon} size={20} color={tinta} />
                <Text style={styles.sheetLabel}>{riga.label}</Text>
                <MaterialCommunityIcons name="chevron-right" size={20} color={theme.colors.textDisabled} />
              </TouchableOpacity>
            );
          })}
        </Animated.View>
      </View>
    </Modal>
  );
}

const makeStyles = (theme: AppTheme) => StyleSheet.create({
  wrap: { backgroundColor: theme.colors.detailSurface },
  pillRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.sm,
    // Sotto c'e' il filo che apre la sezione dei piatti: senza questo stacco
    // le pill gli si appoggiavano sopra.
    paddingBottom: theme.spacing.md,
  },
  // Sono BOTTONI, non etichette: portano fuori dall'app (prenoti, ordini,
  // apri il sito). Piu' alti delle pill delle liste anche perche' 26 punti
  // erano un bersaglio piccolo per un dito.
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 18,
  },
  pillLabel: { fontSize: 13, fontWeight: '600' },

  separator: { height: 8, backgroundColor: theme.colors.detailMuted },

  dishes: { paddingTop: 12, paddingBottom: 16 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: theme.spacing.lg },
  title: { fontSize: 16, fontWeight: '600', color: theme.colors.textPrimary },
  titleSpacer: { flex: 1 },
  seeAll: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  seeAllText: { fontSize: 13, fontWeight: '500', color: theme.colors.primary },
  // Le stesse misure dell'avviso delle recensioni (ReviewsSection)
  disclaimerBox: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
  },
  disclaimer: {
    fontSize: 11,
    lineHeight: 15,
    color: theme.colors.textDisabled,
  },
  disclaimerHide: {
    fontWeight: '600',
    color: theme.colors.primary,
  },

  carousel: { gap: theme.spacing.sm, paddingHorizontal: theme.spacing.lg, paddingTop: 8, paddingBottom: 4 },
  dish: { width: DISH_SIZE },
  photo: {
    width: DISH_SIZE,
    height: DISH_SIZE,
    borderRadius: DISH_SIZE / 2,
    backgroundColor: theme.colors.detailMuted,
  },
  photoDimmed: { opacity: 0.4 },
  photoEmpty: { alignItems: 'center', justifyContent: 'center' },
  badge: {
    position: 'absolute',
    bottom: 2,
    alignSelf: 'center',
    borderRadius: 10,
    paddingHorizontal: 5,
    paddingVertical: 2,
    backgroundColor: theme.colors.surface,
    opacity: 0.92,
  },
  dishName: {
    marginTop: 5,
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 15,
    textAlign: 'center',
    color: theme.colors.textPrimary,
  },
  dishCategory: { marginTop: 1, fontSize: 11, textAlign: 'center', color: theme.colors.textDisabled },
  morePhoto: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  moreCount: { fontSize: 22, fontWeight: '600', color: theme.colors.textSecondary },
  moreRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 2, marginTop: 5 },
  moreLabel: { fontSize: 12, fontWeight: '600', lineHeight: 15, color: theme.colors.primary },

  // Le stesse misure degli altri fogli dell'app
  sheetContainer: { flex: 1, justifyContent: 'flex-end' },
  sheetOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: theme.colors.overlay },
  sheetContent: {
    backgroundColor: theme.colors.detailSurface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  sheetGrabber: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.border,
    alignSelf: 'center',
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  // Righe alte: sono l'unica cosa da premere in questo foglio, e il dito non
  // deve cercarle.
  sheetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.lg,
  },
  sheetRowDivided: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.colors.border },
  sheetLabel: { flex: 1, fontSize: 16, fontWeight: '500', color: theme.colors.textPrimary },
});
