/**
 * MapPin — Pure visual marker component.
 *
 * Rules:
 * - No context, no state (except tracksViewChanges one-frame flip).
 * - The selected state is rendered exclusively by SelectedMarkerOverlay;
 *   regular MapPins never render as "selected". This eliminates 1000+
 *   re-renders on selection change.
 * - Dot vs pin is controlled by the `asDot` prop. On threshold crossing,
 *   tracksViewChanges flips true for one frame so iOS recaptures a clean bitmap.
 * - When `restaurant` is null at close zoom, a placeholder pin (same 32px
 *   container) is rendered so iOS can recapture the bitmap when data arrives.
 * - At dot zoom without restaurant data, coverage is computed from
 *   supportedAllergens/supportedDiets + userAllergens/userDiets using
 *   getExpandedCoverage (implication-aware, same logic del server).
 */
import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { Platform, StyleSheet, View, Text as RNText } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Marker } from 'react-native-maps';
import { useTheme } from '../../contexts/ThemeContext';
import type { AppTheme } from '../../constants/theme';
import { isValidCoord, coverageColor } from './mapConstants';
import { resolveBadge, badgeGlyph } from './mapBadge';
import { getExpandedCoverage } from '../../constants/restrictionImplications';
import { venueIconName } from '../../constants/restaurantCategories';
import type { Restaurant } from '../../services/restaurantService';

export type MapPinProps = {
  id: string;
  latitude: number;
  longitude: number;
  restaurant?: Restaurant;
  asDot: boolean;
  isFavorite: boolean;
  /** Simbolo della lista custom: emoji (string) | null (bookmark) | undefined (non in lista custom). */
  customSymbol?: string | null;
  showMatchInfo?: boolean;
  onPress?: (id: string) => void;
  /** Allergens aggregated from all reviews of this restaurant */
  supportedAllergens?: string[];
  /** Dietary preferences aggregated from all reviews of this restaurant */
  supportedDiets?: string[];
  /** Active allergen filters of the current user */
  userAllergens?: string[];
  /** Active dietary filters of the current user */
  userDiets?: string[];
};

export default memo(function MapPin({
  id,
  latitude,
  longitude,
  restaurant,
  asDot,
  isFavorite,
  customSymbol,
  showMatchInfo,
  onPress,
  supportedAllergens,
  supportedDiets,
  userAllergens,
  userDiets,
}: MapPinProps) {
  const theme = useTheme();
  // Cache di stili per-tema (non useMemo per-istanza): MapPin ha molte istanze,
  // così lo StyleSheet si crea una volta sola per tema invece che per pin.
  const styles = getStyles(theme);
  // --- tracksViewChanges: true for ONE frame after visual change, then false ---
  // asDot è incluso qui (invece di usare key change nel parent) per evitare il
  // flash del pin rosso Apple Maps che si vede durante l'unmount/remount.
  const hasRest = !!restaurant;
  const prevAsDot = useRef(asDot);
  const prevFavorite = useRef(isFavorite);
  const prevCustomSymbol = useRef(customSymbol);
  const prevShowMatch = useRef(showMatchInfo);
  const prevHasRest = useRef(hasRest);
  const prevSupportedAllergens = useRef(supportedAllergens);
  const prevSupportedDiets = useRef(supportedDiets);

  // Android-only: estende la finestra tracksViewChanges=true a ~100ms dopo
  // mount e dopo ogni cambio prop rilevante. react-native-maps su Android
  // usa la drawing cache nativa per il bitmap del marker; la cattura è
  // asincrona e dipende dal timing del layout. Single-frame tracksViewChanges
  // a volte non basta → bitmap stale (pin invisibile al remount post-selezione,
  // colori non aggiornati al toggle filtro). iOS usa CALayer snapshot affidabile
  // in un frame, niente da fare.
  //
  // Su iOS: useState inizializza a false e useEffect ha early return → nessun
  // setTimeout schedulato, nessun setState, justChanged inalterato. iOS è
  // comportamentalmente identico al codice precedente.
  const [androidSettling, setAndroidSettling] = useState(
    () => Platform.OS === 'android',
  );
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    setAndroidSettling(true);
    const timer = setTimeout(() => setAndroidSettling(false), 100);
    return () => clearTimeout(timer);
  }, [asDot, isFavorite, customSymbol, showMatchInfo, hasRest, supportedAllergens, supportedDiets]);

  const justChanged =
    androidSettling ||
    asDot !== prevAsDot.current ||
    isFavorite !== prevFavorite.current ||
    customSymbol !== prevCustomSymbol.current ||
    showMatchInfo !== prevShowMatch.current ||
    hasRest !== prevHasRest.current ||
    supportedAllergens !== prevSupportedAllergens.current ||
    supportedDiets !== prevSupportedDiets.current;

  useEffect(() => {
    prevAsDot.current = asDot;
    prevFavorite.current = isFavorite;
    prevCustomSymbol.current = customSymbol;
    prevShowMatch.current = showMatchInfo;
    prevHasRest.current = hasRest;
    prevSupportedAllergens.current = supportedAllergens;
    prevSupportedDiets.current = supportedDiets;
  }, [asDot, isFavorite, customSymbol, showMatchInfo, hasRest, supportedAllergens, supportedDiets]);

  const handlePress = useCallback(() => onPress?.(id), [onPress, id]);

  if (!isValidCoord(latitude, longitude)) return null;

  // Badge salvato (emoji > cuore > bookmark). `isSaved` generalizza il vecchio
  // `isFavorite` per visibilità/zIndex: vale per qualsiasi lista, non solo Preferiti.
  const badge = resolveBadge(isFavorite, customSymbol);
  const isSaved = badge !== null;

  // ---- Dot (far zoom) ----
  if (asDot) {
    // Coverage: prefer server-computed data from Restaurant object (accurate),
    // fall back to client-computed from pin's aggregated review data.
    let dotCovered = 0;
    let dotTotal = 0;

    if (showMatchInfo) {
      if (restaurant) {
        dotCovered = (restaurant.covered_allergen_count ?? 0) + (restaurant.covered_dietary_count ?? 0);
        dotTotal = (restaurant.total_allergen_filters ?? 0) + (restaurant.total_dietary_filters ?? 0);
      } else {
        dotTotal = (userAllergens?.length ?? 0) + (userDiets?.length ?? 0);
        if (dotTotal > 0 && (supportedAllergens?.length || supportedDiets?.length)) {
          const expanded = getExpandedCoverage([
            ...(supportedAllergens ?? []),
            ...(supportedDiets ?? []),
          ]);
          for (const a of (userAllergens ?? [])) if (expanded.has(a)) dotCovered++;
          for (const d of (userDiets ?? [])) if (expanded.has(d)) dotCovered++;
        }
      }
    }

    // I locali a zero match restano sulla mappa come pallino grigio "recesso",
    // non nascosti. Una mappa vuota all'avvio (utente con esigenze prive di dati
    // nel viewport) erode la fiducia; un pallino grigio attenuato comunica invece
    // onestamente "il locale c'\u00e8, nessuna info per le tue esigenze". I match
    // colorati restano dominanti per dimensione + zIndex; i salvati non sono mai
    // attenuati (restano a piena visibilit\u00e0 con il badge della lista).
    const isMuted = showMatchInfo && dotTotal > 0 && dotCovered === 0 && !isSaved;

    const dotColor = showMatchInfo
      ? coverageColor(dotCovered, dotTotal, theme)
      : theme.colors.primary;

    // Verde/giallo emergono sopra i pallini grigi/primary (non valutati).
    const dotZ = isSaved ? 3
      : dotCovered > 0 && dotTotal > 0
        ? (dotCovered >= dotTotal ? 3 : 2)
        : 0;

    return (
      <Marker
        identifier={id}
        coordinate={{ latitude, longitude }}
        tracksViewChanges={justChanged}
        onPress={handlePress}
        {...(Platform.OS === 'android' && { zIndex: dotZ })}
      >
        <View style={[styles.dotWrap, isSaved ? styles.dotWrapSaved : styles.dotWrapUnsaved]}>
          <View style={[
            styles.dotMarker,
            isSaved && styles.dotFavorite,
            isMuted && styles.dotMuted,
            { backgroundColor: dotColor },
          ]} />
          <View style={[styles.dotHeartBadge, { opacity: isSaved ? 1 : 0 }]}>
            {badge && badgeGlyph(badge, styles.dotHeartText, 6, theme)}
          </View>
        </View>
      </Marker>
    );
  }

  // ---- Placeholder pin (close zoom, data loading) ----
  // Same 32px container as full pin so iOS bitmap recapture works
  // when data arrives (hasRest flips → tracksViewChanges=true for one frame).
  if (!restaurant) {
    return (
      <Marker
        identifier={id}
        coordinate={{ latitude, longitude }}
        tracksViewChanges={justChanged}
        onPress={handlePress}
        {...(Platform.OS === 'android' && { zIndex: isSaved ? 2 : 1 })}
      >
        <View style={styles.markerWrap}>
          <View style={[styles.markerContainer, { borderColor: theme.colors.textDisabled }]}>
            <View style={[styles.markerDot, { backgroundColor: theme.colors.textDisabled }]} />
          </View>
          <View style={styles.markerArrow}>
            <View style={[styles.markerArrowInner, { borderTopColor: theme.colors.textDisabled }]} />
          </View>
          <View style={[styles.heartBadge, { opacity: isSaved ? 1 : 0 }]} pointerEvents="none">
            {badge && badgeGlyph(badge, styles.heartText, 9, theme)}
          </View>
        </View>
      </Marker>
    );
  }

  // ---- Full pin ----
  const rating = restaurant.average_rating ?? 0;
  const hasRating = rating > 0;
  const coveredTotal = (restaurant.covered_allergen_count ?? 0) + (restaurant.covered_dietary_count ?? 0);
  const filtersTotal = (restaurant.total_allergen_filters ?? 0) + (restaurant.total_dietary_filters ?? 0);

  const markerColor = showMatchInfo
    ? coverageColor(coveredTotal, filtersTotal, theme)
    : theme.colors.primary;

  return (
    <Marker
      identifier={id}
      coordinate={{ latitude, longitude }}
      tracksViewChanges={justChanged}
      onPress={handlePress}
      {...(Platform.OS === 'android' && { zIndex: isSaved ? 2 : 1 })}
    >
      <View style={styles.markerWrap}>
        <View style={[styles.markerContainer, { borderColor: markerColor }]}>
          {hasRating ? (
            <RNText style={[styles.markerText, { color: markerColor }]}>
              {rating.toFixed(1)}
            </RNText>
          ) : (
            <MaterialCommunityIcons name={venueIconName(restaurant.offers_lodging)} size={13} color={markerColor} />
          )}
        </View>
        <View style={styles.markerArrow}>
          <View style={[styles.markerArrowInner, { borderTopColor: markerColor }]} />
        </View>
        <View style={[styles.heartBadge, { opacity: isSaved ? 1 : 0 }]} pointerEvents="none">
          {badge && badgeGlyph(badge, styles.heartText, 9, theme)}
        </View>
      </View>
    </Marker>
  );
});

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const makeStyles = (theme: AppTheme) => StyleSheet.create({
  dotWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  // Android: padding SIMMETRICO per i pallini senza badge. Il marker custom è
  // ancorato al centro della propria bitmap; con padding simmetrico il pallino
  // resta esattamente al centro → posizione precisa sulla mappa anche a forte
  // zoom out (un'asimmetria di pochi px diventa km a scala continentale, ed è ciò
  // che faceva "finire in mare" i pin costieri su Android). Lo spazio evita anche
  // il clipping dell'ombra. iOS: nessun padding (Platform.select android-only) →
  // rendering invariato, nessuna regressione.
  dotWrapUnsaved: {
    ...Platform.select({ android: { padding: 5 } }),
  },
  // Android: i pallini salvati hanno il badge sporgente in alto a destra; il
  // padding asimmetrico serve a includerlo nella bitmap. Identico al comportamento
  // storico (cambiarlo è il "Pezzo B", da affrontare con anchor esplicito). iOS
  // invariato.
  dotWrapSaved: {
    ...Platform.select({ android: { paddingTop: 8, paddingRight: 10 } }),
  },
  dotMarker: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: theme.colors.onPrimary,
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 0, height: 0.5 },
    shadowOpacity: 0.2,
    shadowRadius: 1,
    elevation: 2,
  },
  dotFavorite: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  // Pallino "recesso" per i locali a zero match: più piccolo, semitrasparente e
  // senza ombra, così resta leggibile come "esiste un locale" ma cede la scena
  // ai match verde/ambra. Il bordo onPrimary di dotMarker (ridotto) garantisce
  // la separazione dallo sfondo mappa in entrambi i temi.
  dotMuted: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    borderWidth: 1,
    opacity: 0.7,
    shadowOpacity: 0,
    elevation: 1,
  },
  dotHeartBadge: {
    position: 'absolute',
    ...Platform.select({
      android: { top: 7, right: 7, width: 8, height: 8, borderRadius: 4 },
      ios: { top: -3, right: -5, width: 10, height: 10, borderRadius: 5 },
    }),
    backgroundColor: theme.colors.onPrimary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotHeartText: {
    ...Platform.select({
      android: { fontSize: 5, lineHeight: 8, includeFontPadding: false, textAlignVertical: 'center' as const },
      ios: { fontSize: 7, lineHeight: 9 },
    }),
    textAlign: 'center',
    color: theme.colors.favoriteRed,
  },

  markerWrap: {
    alignItems: 'center',
    overflow: 'visible',
    // Android: estende il bounding rect del custom marker così
    // il heartBadge sporgente (top/right negativi) entra nella bitmap
    ...Platform.select({ android: { paddingTop: 10, paddingRight: 14 } }),
  },
  markerContainer: {
    backgroundColor: theme.colors.onPrimary,
    borderRadius: 16,
    borderWidth: 2,
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
  markerText: {
    fontSize: 12,
    fontWeight: '700',
  },
  markerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  markerArrow: {
    alignItems: 'center',
    marginTop: -1,
  },
  markerArrowInner: {
    width: 0,
    height: 0,
    borderLeftWidth: 5,
    borderRightWidth: 5,
    borderTopWidth: 6,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  heartBadge: {
    position: 'absolute',
    ...Platform.select({
      android: { top: 9, right: 11, width: 11, height: 11, borderRadius: 5.5 },
      ios: { top: -3, right: -6, width: 14, height: 14, borderRadius: 7 },
    }),
    backgroundColor: theme.colors.onPrimary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 0, height: 0.5 },
    shadowOpacity: 0.15,
    shadowRadius: 1,
    elevation: 2,
  },
  heartText: {
    ...Platform.select({
      android: { fontSize: 7, lineHeight: 11, includeFontPadding: false, textAlignVertical: 'center' as const },
      ios: { fontSize: 9, lineHeight: 13 },
    }),
    textAlign: 'center',
    color: theme.colors.favoriteRed,
  },
});

// Stili calcolati una volta per tema (light/dark) e condivisi da tutte le istanze
// di MapPin — evita N StyleSheet.create con centinaia di pin in mappa.
const stylesByTheme = new WeakMap<AppTheme, ReturnType<typeof makeStyles>>();
function getStyles(theme: AppTheme) {
  let s = stylesByTheme.get(theme);
  if (!s) {
    s = makeStyles(theme);
    stylesByTheme.set(theme, s);
  }
  return s;
}
