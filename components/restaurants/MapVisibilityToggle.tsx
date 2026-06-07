import { useState, useEffect, useMemo, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import type { AppTheme } from '../../constants/theme';
import { resolveBadge, badgeGlyph } from '../map/mapBadge';
import { venueIconName } from '../../constants/restaurantCategories';
import { storage } from '../../utils/storage';
import i18n from '../../utils/i18n';

type Props = {
  userId: string;
  /** Assente in creazione (la lista non ha ancora un id) → toggle bloccato. */
  collectionId?: string;
  /** In creazione lo mostriamo bloccato su "visibile": niente id su cui salvare,
   *  e una lista nasce comunque visibile. Si modifica dopo averla creata. */
  locked?: boolean;
  /** Simbolo della lista (emoji o null=bookmark): mostrato nel pin d'anteprima. */
  emoji?: string | null;
};

/**
 * Toggle "Mostra sulla mappa" per una lista, con anteprima del pin il cui badge
 * si accende/spegne così l'utente capisce a colpo d'occhio cosa fa. Preferenza
 * LOCALE per-utente: nasconde il BADGE (iconcina) di questa lista dai pin sulla
 * mappa principale per ridurre il clutter — i pin/pallini dei ristoranti restano
 * (vengono da allPins), cambia solo l'icona. Non tocca la lista né il DB. È
 * per-(utente,lista)
 * by design, così regge anche le future liste condivise. In modifica è
 * auto-salvato al cambio; in creazione è bloccato su "visibile" (default) con
 * nota esplicativa, perché la lista non ha ancora un id a cui agganciare la
 * preferenza. Vedi memory project_list_map_visibility.
 */
export default function MapVisibilityToggle({ userId, collectionId, locked, emoji }: Props) {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  // In blocco partiamo subito da "visibile" (il default delle liste nuove); in
  // modifica `null` finche' non abbiamo letto la preferenza, così non mostriamo
  // uno stato provvisorio sbagliato (lista nascosta che appare "accesa" per un frame).
  const [show, setShow] = useState<boolean | null>(locked ? true : null);

  // Anteprima: il pin del ristorante resta SEMPRE (è un ristorante sulla mappa);
  // quello che il toggle accende/spegne è il BADGE della lista sul pin. Animiamo
  // quindi solo il badge. Init coerente con `show` per non lampeggiare in modifica.
  const badgeAnim = useRef(new Animated.Value(locked ? 1 : 0)).current;

  useEffect(() => {
    if (locked || !collectionId) return;
    let active = true;
    storage.getMapHiddenCollections(userId).then((hidden) => {
      if (active) setShow(!hidden.includes(collectionId));
    });
    return () => { active = false; };
  }, [userId, collectionId, locked]);

  useEffect(() => {
    if (show === null) return;
    Animated.timing(badgeAnim, {
      toValue: show ? 1 : 0,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [show, badgeAnim]);

  const onChange = (value: boolean) => {
    if (locked || !collectionId) return;
    setShow(value);
    storage.setMapCollectionHidden(userId, collectionId, !value);
  };

  if (show === null) return null;

  // Badge del pin d'anteprima: questa è una lista custom → emoji o bookmark
  // (mai il cuore, riservato ai Preferiti che non hanno questo toggle).
  const badge = resolveBadge(false, emoji ?? null);

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.row, locked && styles.dimmed]}
        onPress={() => onChange(!show)}
        activeOpacity={locked ? 1 : 0.7}
        disabled={locked}
      >
        <View style={styles.textGroup}>
          <View style={styles.labelRow}>
            <MaterialCommunityIcons name="map-marker-outline" size={18} color={theme.colors.textPrimary} />
            <Text style={styles.label}>{i18n.t('restaurants.collections.showOnMap')}</Text>
          </View>
          <Text style={styles.hint}>
            {locked
              ? i18n.t('restaurants.collections.showOnMapLockedHint')
              : i18n.t('restaurants.collections.showOnMapHint')}
          </Text>
        </View>
        {/* Switch custom identico a quello del menu filtri (track+thumb in View). */}
        <View style={[styles.switchTrack, show && styles.switchTrackActive]}>
          <View style={[styles.switchThumb, show && styles.switchThumbActive]} />
        </View>
      </TouchableOpacity>

      {/* Anteprima "mappa": il pin del ristorante resta fisso, è il BADGE della
          lista che appare/scompare col toggle — così è chiaro cosa cambia
          davvero. Solo illustrativa (non interattiva). */}
      <View style={[styles.mapPreview, locked && styles.dimmed]} pointerEvents="none">
        <View style={styles.road} />
        <View style={styles.roadVertical} />
        <View style={styles.pinWrap}>
          <View style={styles.pinContainer}>
            <MaterialCommunityIcons name={venueIconName(false)} size={13} color={theme.colors.primary} />
          </View>
          <View style={styles.pinArrow} />
          {badge && (
            <Animated.View
              style={[
                styles.pinBadge,
                { opacity: badgeAnim, transform: [{ scale: badgeAnim }] },
              ]}
            >
              {badgeGlyph(badge, styles.pinBadgeText, 9, theme)}
            </Animated.View>
          )}
        </View>
      </View>
    </View>
  );
}

const makeStyles = (theme: AppTheme) => StyleSheet.create({
  container: { gap: theme.spacing.sm },
  dimmed: { opacity: 0.55 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
  },
  textGroup: { flex: 1, gap: 2 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  label: { fontSize: 15, fontWeight: '600', color: theme.colors.textPrimary },
  hint: { fontSize: 12, color: theme.colors.textSecondary, lineHeight: 16 },
  switchTrack: {
    width: 40,
    height: 22,
    borderRadius: 11,
    backgroundColor: theme.colors.border,
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  switchTrackActive: {
    backgroundColor: theme.colors.primary,
  },
  switchThumb: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: theme.colors.surface,
  },
  switchThumbActive: {
    alignSelf: 'flex-end',
    backgroundColor: theme.colors.surface,
  },

  // --- Anteprima mappa ---
  mapPreview: {
    height: 96,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.surfaceMuted,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  // "Strade" decorative per evocare una mappa senza asset.
  road: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '38%',
    height: 6,
    backgroundColor: theme.colors.border,
    opacity: 0.5,
    transform: [{ rotate: '-8deg' }],
  },
  roadVertical: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: '64%',
    width: 6,
    backgroundColor: theme.colors.border,
    opacity: 0.5,
    transform: [{ rotate: '6deg' }],
  },
  pinWrap: { alignItems: 'center' },
  pinContainer: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: theme.colors.primary,
    paddingHorizontal: 6,
    paddingVertical: 3,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 32,
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  pinArrow: {
    width: 0,
    height: 0,
    borderLeftWidth: 5,
    borderRightWidth: 5,
    borderTopWidth: 6,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: theme.colors.primary,
    marginTop: -1,
  },
  pinBadge: {
    position: 'absolute',
    top: -3,
    right: -6,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 0, height: 0.5 },
    shadowOpacity: 0.15,
    shadowRadius: 1,
    elevation: 2,
  },
  pinBadgeText: {
    fontSize: 9,
    lineHeight: 13,
    textAlign: 'center',
    color: theme.colors.favoriteRed,
  },
});
