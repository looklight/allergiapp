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
 * - Unsaved dots are static PNG icons (`image` prop, assets/map/dots — see
 *   scripts/generate-map-dots.js): no view bitmap capture at all. Saved dots
 *   (list badge) remain custom views.
 * - Without `restaurant` (detailed fetch cap), BOTH dots and close-zoom pins
 *   render complete from the pin payload: coverage computed client-side from
 *   supportedAllergens/supportedDiets + userAllergens/userDiets via
 *   getExpandedCoverage (implication-aware, same logic del server), rating from
 *   pinRating (mig 073). When detail arrives, hasRest flips → one-frame
 *   recapture (color may correct itself if client/server coverage diverge).
 */
import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { Platform, StyleSheet, View, Text as RNText } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Marker } from 'react-native-maps';
import { useTheme, useThemePreference } from '../../contexts/ThemeContext';
import type { AppTheme } from '../../constants/theme';
import { isValidCoord, coverageColor } from './mapConstants';
import { resolveBadge, badgeGlyph } from './mapBadge';
import { getExpandedCoverage } from '../../constants/restrictionImplications';
import { venueIconName } from '../../constants/restaurantCategories';
import type { Restaurant } from '../../services/restaurantService';

// PNG statici dei pallini non salvati (generati da scripts/generate-map-dots.js).
// La prop `image` usa il percorso icona nativa di react-native-maps: niente
// cattura bitmap della view → niente spicchi/settling/flicker, e nessun costo
// tracksViewChanges per i marker più numerosi della mappa.
// Due taglie (rampa): `sm` a zoom largo, `lg` nella fascia vicino alla soglia
// pin (DOT_LARGE_THRESHOLD) — il salto pallino→pin risulta più morbido.
const DOT_IMAGES = {
  light: {
    sm: {
      green: require('../../assets/map/dots/dot-green-light.png'),
      amber: require('../../assets/map/dots/dot-amber-light.png'),
      gray: require('../../assets/map/dots/dot-gray-light.png'),
      primary: require('../../assets/map/dots/dot-primary-light.png'),
      muted: require('../../assets/map/dots/dot-muted-light.png'),
    },
    lg: {
      green: require('../../assets/map/dots/dot-green-light-lg.png'),
      amber: require('../../assets/map/dots/dot-amber-light-lg.png'),
      gray: require('../../assets/map/dots/dot-gray-light-lg.png'),
      primary: require('../../assets/map/dots/dot-primary-light-lg.png'),
      muted: require('../../assets/map/dots/dot-muted-light-lg.png'),
    },
  },
  dark: {
    sm: {
      green: require('../../assets/map/dots/dot-green-dark.png'),
      amber: require('../../assets/map/dots/dot-amber-dark.png'),
      gray: require('../../assets/map/dots/dot-gray-dark.png'),
      primary: require('../../assets/map/dots/dot-primary-dark.png'),
      muted: require('../../assets/map/dots/dot-muted-dark.png'),
    },
    lg: {
      green: require('../../assets/map/dots/dot-green-dark-lg.png'),
      amber: require('../../assets/map/dots/dot-amber-dark-lg.png'),
      gray: require('../../assets/map/dots/dot-gray-dark-lg.png'),
      primary: require('../../assets/map/dots/dot-primary-dark-lg.png'),
      muted: require('../../assets/map/dots/dot-muted-dark-lg.png'),
    },
  },
} as const;

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
  /** Voto medio dal payload pin (mig 073) — fallback quando manca `restaurant` */
  pinRating?: number;
  /** offers_lodging dal payload pin — icona corretta sui pin senza dettaglio */
  pinOffersLodging?: boolean;
  /** Taglia del pallino PNG (rampa per fascia zoom, v. DOT_LARGE_THRESHOLD) */
  dotSize?: 'sm' | 'lg';
};

/** Match client-side esigenze↔coperture del locale, implication-aware: stessa
 *  semantica della proiezione server (CTE implications). Usato da dot e pin
 *  quando il dettaglio non è (ancora) in cache. */
function clientCoverage(
  supportedAllergens: string[] | undefined,
  supportedDiets: string[] | undefined,
  userAllergens: string[] | undefined,
  userDiets: string[] | undefined,
): { covered: number; total: number } {
  const total = (userAllergens?.length ?? 0) + (userDiets?.length ?? 0);
  let covered = 0;
  if (total > 0 && (supportedAllergens?.length || supportedDiets?.length)) {
    const expanded = getExpandedCoverage([
      ...(supportedAllergens ?? []),
      ...(supportedDiets ?? []),
    ]);
    for (const a of (userAllergens ?? [])) if (expanded.has(a)) covered++;
    for (const d of (userDiets ?? [])) if (expanded.has(d)) covered++;
  }
  return { covered, total };
}

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
  pinRating,
  pinOffersLodging,
  dotSize = 'sm',
}: MapPinProps) {
  const theme = useTheme();
  const { isDark } = useThemePreference();
  // Cache di stili per-tema (non useMemo per-istanza): MapPin ha molte istanze,
  // così lo StyleSheet si crea una volta sola per tema invece che per pin.
  const styles = getStyles(theme);

  // Badge salvato (emoji > cuore > bookmark). `isSaved` generalizza il vecchio
  // `isFavorite` per visibilità/zIndex: vale per qualsiasi lista, non solo Preferiti.
  const badge = resolveBadge(isFavorite, customSymbol);
  const isSaved = badge !== null;
  // Pallino semplice → icona statica: nessuna cattura bitmap, quindi niente
  // finestra di settling Android né one-frame recapture.
  const isImageDot = asDot && !isSaved;
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
  // Cambio esigenze (filtro/profilo): il colore client-side di dot e pin dipende
  // da user*; senza ricattura il bitmap resterebbe stale al cambio filtri.
  // Confronto per CONTENUTO (join), non per riferimento: il parent può ricreare
  // gli array a ogni render. Costo: ricattura di massa one-frame al cambio
  // esigenze — accettabile ora che i dot (la maggioranza dei marker) sono icone
  // statiche senza cattura; da tenere d'occhio su device (churn iOS).
  const userKey = `${userAllergens?.join('|') ?? ''}§${userDiets?.join('|') ?? ''}`;
  const prevUserKey = useRef(userKey);

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
    // I pallini-immagine non hanno bitmap da catturare: niente timer (con
    // centinaia di dot i setTimeout per-marker erano un costo reale). Il flag
    // va comunque azzerato: al flip verso view-marker (zoom-in) l'effect
    // riparte da qui con la finestra piena.
    if (isImageDot) {
      setAndroidSettling(false);
      return;
    }
    setAndroidSettling(true);
    const timer = setTimeout(() => setAndroidSettling(false), 100);
    return () => clearTimeout(timer);
  }, [isImageDot, asDot, isFavorite, customSymbol, showMatchInfo, hasRest, supportedAllergens, supportedDiets, userKey]);

  const justChanged =
    androidSettling ||
    asDot !== prevAsDot.current ||
    isFavorite !== prevFavorite.current ||
    customSymbol !== prevCustomSymbol.current ||
    showMatchInfo !== prevShowMatch.current ||
    hasRest !== prevHasRest.current ||
    supportedAllergens !== prevSupportedAllergens.current ||
    supportedDiets !== prevSupportedDiets.current ||
    userKey !== prevUserKey.current;

  useEffect(() => {
    prevAsDot.current = asDot;
    prevFavorite.current = isFavorite;
    prevCustomSymbol.current = customSymbol;
    prevShowMatch.current = showMatchInfo;
    prevHasRest.current = hasRest;
    prevSupportedAllergens.current = supportedAllergens;
    prevSupportedDiets.current = supportedDiets;
    prevUserKey.current = userKey;
  }, [asDot, isFavorite, customSymbol, showMatchInfo, hasRest, supportedAllergens, supportedDiets, userKey]);

  const handlePress = useCallback(() => onPress?.(id), [onPress, id]);

  if (!isValidCoord(latitude, longitude)) return null;

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
        ({ covered: dotCovered, total: dotTotal } = clientCoverage(supportedAllergens, supportedDiets, userAllergens, userDiets));
      }
    }

    // I locali a zero match restano sulla mappa come pallino grigio "recesso",
    // non nascosti. Una mappa vuota all'avvio (utente con esigenze prive di dati
    // nel viewport) erode la fiducia; un pallino grigio attenuato comunica invece
    // onestamente "il locale c'\u00e8, nessuna info per le tue esigenze". I match
    // colorati restano dominanti per dimensione + zIndex; i salvati non sono mai
    // attenuati (restano a piena visibilit\u00e0 con il badge della lista).
    const isMuted = showMatchInfo && dotTotal > 0 && dotCovered === 0 && !isSaved;

    // Verde/giallo emergono sopra i pallini grigi/primary (non valutati).
    // Su iOS lo zIndex mappa su zPosition del layer (stesso meccanismo del
    // SelectedMarkerOverlay a 9999): senza, l'ordine di sovrapposizione è
    // casuale e un grigio può coprire un verde.
    const dotZ = isSaved ? 3
      : dotCovered > 0 && dotTotal > 0
        ? (dotCovered >= dotTotal ? 3 : 2)
        : 0;

    // Pallini non salvati: PNG statico via `image`. Variante = stessa semantica
    // di coverageColor (muted assorbe il caso covered=0 con filtri attivi).
    if (!isSaved) {
      const variant = !showMatchInfo ? 'primary'
        : isMuted ? 'muted'
        : dotTotal === 0 || dotCovered === 0 ? 'gray'
        : dotCovered >= dotTotal ? 'green'
        : 'amber';
      return (
        <Marker
          identifier={id}
          coordinate={{ latitude, longitude }}
          image={DOT_IMAGES[isDark ? 'dark' : 'light'][dotSize][variant]}
          tracksViewChanges={false}
          onPress={handlePress}
          zIndex={dotZ}
          // Android: anchor esplicito al CENTRO (le icone statiche hanno default
          // bottom-center come i pin) → il canvas simmetrico del PNG tiene la
          // coordinata esattamente sotto il pallino a ogni zoom. iOS centra di
          // default (centerOffset 0,0).
          {...(Platform.OS === 'android' && { anchor: { x: 0.5, y: 0.5 } })}
        />
      );
    }

    const dotColor = showMatchInfo
      ? coverageColor(dotCovered, dotTotal, theme)
      : theme.colors.primary;

    return (
      <Marker
        identifier={id}
        coordinate={{ latitude, longitude }}
        tracksViewChanges={justChanged}
        onPress={handlePress}
        zIndex={dotZ}
        // Android: anchor esplicito al CENTRO. Senza, react-native-maps ancora il
        // marker custom in basso-centro (default tipo punta-di-pin) → la coordinata
        // cade sotto il pallino → a zoom largo l'offset in px = km → "pin in mare".
        {...(Platform.OS === 'android' && { anchor: { x: 0.5, y: 0.5 } })}
      >
        <View style={[styles.dotWrap, styles.dotWrapSaved]}>
          <View style={[
            styles.dotMarker,
            styles.dotFavorite,
            { backgroundColor: dotColor },
          ]} />
          <View style={styles.dotHeartBadge}>
            {badge && badgeGlyph(badge, styles.dotHeartText, 6, theme)}
          </View>
        </View>
      </Marker>
    );
  }

  // ---- Full pin (close zoom) ----
  // Valori dal fetch dettagliato quando presente; altrimenti fallback dal
  // payload pin: colore = match client-side, voto = pinRating (mig 073). Così
  // ogni pin del viewport nasce completo, senza dipendere dal cap 200 del
  // fetch dettagliato. All'arrivo del dettaglio hasRest flippa →
  // tracksViewChanges=true per un frame (stesso container, ricattura pulita).
  let coveredTotal = 0;
  let filtersTotal = 0;
  if (showMatchInfo) {
    if (restaurant) {
      coveredTotal = (restaurant.covered_allergen_count ?? 0) + (restaurant.covered_dietary_count ?? 0);
      filtersTotal = (restaurant.total_allergen_filters ?? 0) + (restaurant.total_dietary_filters ?? 0);
    } else {
      ({ covered: coveredTotal, total: filtersTotal } = clientCoverage(supportedAllergens, supportedDiets, userAllergens, userDiets));
    }
  }
  const rating = restaurant ? (restaurant.average_rating ?? 0) : (pinRating ?? 0);
  const hasRating = rating > 0;
  const offersLodging = restaurant ? restaurant.offers_lodging : pinOffersLodging;

  const markerColor = showMatchInfo
    ? coverageColor(coveredTotal, filtersTotal, theme)
    : theme.colors.primary;

  // Con filtri attivi, il pin a zero match è recesso come il pallino muted:
  // opacità ridotta ma MAI nascosto (stessa filosofia dei pallini — "il locale
  // c'è, nessuna info per le tue esigenze"). 0.55 ben sopra lo zero: opacità 0
  // rompe la cattura bitmap dei marker iOS (v. project_map_pins_ios).
  const isMutedPin = showMatchInfo && filtersTotal > 0 && coveredTotal === 0 && !isSaved;

  // Gerarchia identica ai pallini: salvati/verdi sopra, ambra in mezzo, grigi
  // sotto — nelle zone affollate i compatibili restano leggibili.
  const pinZ = isSaved ? 3
    : coveredTotal > 0 && filtersTotal > 0
      ? (coveredTotal >= filtersTotal ? 3 : 2)
      : 0;

  return (
    <Marker
      identifier={id}
      coordinate={{ latitude, longitude }}
      tracksViewChanges={justChanged}
      onPress={handlePress}
      zIndex={pinZ}
    >
      <View style={[styles.markerWrap, isMutedPin && styles.markerWrapMuted]}>
        <View style={[styles.markerContainer, { borderColor: markerColor }]}>
          {hasRating ? (
            <RNText style={[styles.markerText, { color: markerColor }]}>
              {rating.toFixed(1)}
            </RNText>
          ) : (
            <MaterialCommunityIcons name={venueIconName(offersLodging)} size={13} color={markerColor} />
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
  // Android: padding SIMMETRICO anche per i salvati (era asimmetrico, il "Pezzo
  // B"): il badge sta DENTRO il padding invece di sporgere → niente clipping
  // nella bitmap, e il pallino resta esattamente al centro del canvas → anchor
  // {0.5,0.5} preciso a ogni zoom. iOS invariato (offset negativi + CALayer).
  dotWrapSaved: {
    ...Platform.select({ android: { padding: 8 } }),
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
    // Android: niente elevation. L'ombra da elevation rende la bitmap asimmetrica
    // (sporge in basso) → residuo di offset anche con anchor centro. Il bordo bianco
    // basta a staccare il pallino. iOS usa shadow* (catturati nel CALayer), invariato.
    elevation: 0,
  },
  dotFavorite: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  dotHeartBadge: {
    position: 'absolute',
    ...Platform.select({
      // Sovrappone l'angolo alto-destro del pallino (12px a 8..20) restando a
      // 2px dai bordi del wrap 28×28 → mai tagliato, sempre sopra il pallino.
      android: { top: 2, right: 2, width: 10, height: 10, borderRadius: 5 },
      ios: { top: -3, right: -5, width: 10, height: 10, borderRadius: 5 },
    }),
    backgroundColor: theme.colors.onPrimary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotHeartText: {
    ...Platform.select({
      android: { fontSize: 6, lineHeight: 9, includeFontPadding: false, textAlignVertical: 'center' as const },
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
  // Pin a zero match con filtri attivi (v. isMutedPin). L'alpha va sul wrap
  // intero così la bitmap catturata la include su entrambe le piattaforme.
  markerWrapMuted: {
    opacity: 0.55,
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
