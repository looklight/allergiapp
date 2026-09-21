import { useMemo, useState } from 'react';
import { View, ScrollView, FlatList, Image, TouchableOpacity, StyleSheet, Linking, Modal, Pressable } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
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

type Props = {
  card: PartnerCard;
  /** Esigenze di chi guarda: riordinano il carosello e colorano i pallini. */
  needs: ViewerNeeds;
  /** Apre la schermata con tutti i piatti. */
  onSeeAll: () => void;
};

export default function PartnerCardSection({ card, needs, onSeeAll }: Props) {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  // Quando un collegamento ha piu' destinazioni (tre delivery, oppure
  // prenotazione per telefono e online insieme) la pill e' una sola e la
  // scelta si fa qui.
  const [choice, setChoice] = useState<PartnerCardLink[] | null>(null);

  const pills = useMemo(() => buildPills(card.links), [card.links]);

  const carousel = useMemo(
    () => sortByCompat(card.dishes, needs).slice(0, CAROUSEL_MAX),
    [card.dishes, needs],
  );
  const hidden = card.dishes.length - carousel.length;

  const open = (link: PartnerCardLink) => {
    const target = link.kind === 'booking' && !link.url ? `tel:${link.phone}` : link.url;
    if (target) Linking.openURL(target).catch(() => {});
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
                onPress={() => onPillPress(group)}
              >
                <MaterialCommunityIcons name={c.icon} size={14} color={fg} />
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
              <TouchableOpacity style={styles.seeAll} activeOpacity={0.7} onPress={onSeeAll}>
                <Text style={styles.seeAllText}>{i18n.t('restaurants.partnerCard.seeAll')}</Text>
                <MaterialCommunityIcons name="chevron-right" size={16} color={theme.colors.primary} />
              </TouchableOpacity>
            </View>

            {/* Stesso trattamento del disclaimer delle recensioni: piccolo,
                grigio, senza riquadro. Detto una volta, non su ogni piatto. */}
            <Text style={styles.disclaimer}>{i18n.t('restaurants.partnerCard.disclaimer')}</Text>

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
                <DishCircle dish={item} needs={needs} styles={styles} theme={theme} onPress={onSeeAll} />
              )}
              ListFooterComponent={
                hidden > 0 ? (
                  <TouchableOpacity style={styles.dish} activeOpacity={0.7} onPress={onSeeAll}>
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
        </>
      )}

      <Modal visible={choice !== null} transparent animationType="fade" onRequestClose={() => setChoice(null)} statusBarTranslucent>
        <Pressable style={styles.backdrop} onPress={() => setChoice(null)}>
          <Pressable style={styles.sheet}>
            {(choice ?? []).map((link, i) => (
              <TouchableOpacity
                key={`${link.kind}-${i}`}
                style={styles.sheetRow}
                activeOpacity={0.7}
                onPress={() => { setChoice(null); open(link); }}
              >
                <Text style={styles.sheetLabel}>{choiceLabel(link)}</Text>
                <MaterialCommunityIcons name="open-in-new" size={16} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            ))}
          </Pressable>
        </Pressable>
      </Modal>
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
    if (kind === 'menu' && group.length > 1) {
      const mine = group.find((l) => l.language === i18n.locale) ?? group.find((l) => l.language === '');
      group = [mine ?? group[0]];
    }
    out.push({ kind, group });
  }
  return out;
}

/** Cosa si legge nella finestra di scelta: il servizio, o come si prenota. */
function choiceLabel(link: PartnerCardLink): string {
  if (link.label) return link.label;
  if (link.provider) return link.provider;
  if (link.kind === 'booking') {
    return link.url
      ? i18n.t('restaurants.partnerCard.bookOnline')
      : i18n.t('restaurants.partnerCard.bookByPhone');
  }
  return i18n.t(`restaurants.partnerCard.link_${link.kind}`);
}

const makeStyles = (theme: AppTheme) => StyleSheet.create({
  wrap: { backgroundColor: theme.colors.detailSurface },
  pillRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    paddingHorizontal: 16,
    paddingVertical: theme.spacing.xs,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 5,
    paddingHorizontal: 11,
    borderRadius: 14,
  },
  pillLabel: { fontSize: 12, fontWeight: '500' },

  separator: { height: 8, backgroundColor: theme.colors.detailMuted },

  dishes: { paddingTop: 12, paddingBottom: 16 },
  titleRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16 },
  title: { flex: 1, fontSize: 16, fontWeight: '600', color: theme.colors.textPrimary },
  seeAll: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  seeAllText: { fontSize: 13, fontWeight: '500', color: theme.colors.primary },
  disclaimer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    fontSize: 11,
    lineHeight: 15,
    color: theme.colors.textDisabled,
  },

  carousel: { gap: 8, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 },
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

  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingVertical: 8,
    paddingBottom: 28,
  },
  sheetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  sheetLabel: { fontSize: 15, color: theme.colors.textPrimary },
});
