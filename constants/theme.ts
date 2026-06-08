import { MD3LightTheme, MD3DarkTheme } from 'react-native-paper';
import type { ViewStyle } from 'react-native';

// ---------------------------------------------------------------------------
// Color palettes — light & dark share the SAME keys so `theme.colors.X` works
// identically in both. The dark palette is currently a stub (clone of light):
// it becomes reachable only once the runtime theme switch is wired and the dark
// values are designed. Until then the app resolves to `lightTheme` everywhere,
// so behaviour is unchanged.
// ---------------------------------------------------------------------------

const lightColors = {
  // Primary palette
  primary: '#4CAF50',
  primaryContainer: '#C8E6C9',
  primaryLight: '#E8F5E9',

  // Secondary palette
  secondary: '#FF5722',
  secondaryContainer: '#FFCCBC',

  // Surfaces & backgrounds
  surface: '#FFFFFF',
  backgroundAlt: '#FAFAFA',
  // Riquadro grigio "a piccole dosi" appoggiato su superficie bianca
  // (banner, campi input, segmented control, badge, separatori, placeholder).
  // E' l'unico grigio d'accento: la base dell'app e bianca (surface).
  surfaceMuted: '#F5F5F5',
  // Superficie "detail ristorante" (sheet + full-screen): bianca in light,
  // scura in dark per staccarsi dallo schermo come Google Maps (tono al posto
  // dell'ombra). Frame del sheet + sezioni del detail. Dedicata e isolata.
  detailSurface: '#FFFFFF',
  // Tono "muted" DENTRO il detail (gap tra sezioni, chip, placeholder, badge):
  // grigio in light; in dark piu CHIARO del detail (#26282B) cosi sezioni ed
  // elementi restano staccati e non si perde la "forma" grouped-list al buio.
  detailMuted: '#F5F5F5',
  // Sfondo banner home: gradiente sage desaturato. Dedicato e isolato (solo
  // BannerCarousel), cosi e modificabile senza toccare altri colori.
  bannerGradient: ['#F7FBF8', '#E1EEE5'] as [string, string],
  // Variante "in evidenza" per la slide con CTA: ambra calda chiara (arancio
  // leggero), risalta dal sage delle altre slide ma resta tenue e col testo leggibile.
  bannerGradientFeatured: ['#FFF6E9', '#FFD9A0'] as [string, string],

  // Text
  textPrimary: '#333333',
  textSecondary: '#666666',
  textDisabled: '#999999',
  textHint: '#6E6E6E',
  textMuted: '#616161',
  onPrimary: '#FFFFFF',

  // Error / danger
  error: '#D32F2F',
  errorDark: '#C62828',
  errorDarker: '#B71C1C',
  errorContainer: '#FFCDD2',
  errorLight: '#FFEBEE',

  // Success
  success: '#2E7D32',
  successDark: '#1B5E20',

  // Warning / caution
  warning: '#E65100',
  warningDark: '#D84315',

  // Info (blue — distance, links, neutral highlights)
  linkBlue: '#1976D2',

  // Amber tones (cards, highlights)
  amberLight: '#FFF8E1',
  amber: '#FFC107',
  amberDark: '#E6A700',
  amberText: '#8D6E00',
  amberBorder: '#FFE082',
  amberSubtle: '#FFF8E126',

  // Notice surfaces (warning message containers in card env)
  noticeBg: '#FFF3E0',
  noticeBorder: '#FFE0B2',

  // Coverage / match indicators (map pins, badges)
  coverageMedium: '#F9A825',
  intoleranceAccent: '#FFB700',
  primarySubtle: '#E8F5E926',

  // Selection highlight (card landscape selected border/shadow)
  selectionHighlight: '#FFD600',
  selectionHighlightBg: '#FFFDE7',

  // Card description text
  cardDescriptionText: '#5D4037',

  // Borders & dividers
  divider: '#E5E5E5',
  border: '#E0E0E0',
  separator: '#CCCCCC',
  shadow: '#000000',

  // Overlays
  overlay: 'rgba(0,0,0,0.5)',
  overlayDark: 'rgba(0,0,0,0.8)',
  overlayLight: 'rgba(255,255,255,0.85)',

  // UI elements
  switchThumbInactive: '#F4F3F4',
  neutralBg: '#EEEEEE',
  restrictionRowBg: '#F9F5FF',
  restrictionRowBgPressed: '#F0EAFC',

  // Brand colors
  brandInstagram: '#E1306C',
  brandYoutube: '#FF0000',
  brandWebsite: '#FFDD00',
  brandGoogleMaps: '#EA4335',

  // UI components
  favoriteRed: '#E53935',
  starFilled: '#F5A623',
  starEmpty: '#D0D0D0',

  // Simbolo "bookmark" delle liste custom senza emoji (badge pin, righe sheet,
  // cella default emoji picker). Arancio per distinguersi dal verde primary.
  bookmark: '#FB8C00',
};

// Dark palette — ispirata al dark mode di Google Maps: carbone bluastro (non nero
// puro), superfici leggermente più chiare del fondo, testo bianco-sporco, link blu
// "Google" #8AB4F8. I semantici (success/amber/star/error) restano saturi per
// spiccare a colpo d'occhio. Le chiavi sono le stesse di lightColors.
// Ereditati da lightColors (intrinseci, validi in entrambi i temi): amber, amberDark,
// amberSubtle, coverageMedium, intoleranceAccent, selectionHighlight, starFilled, bookmark,
// onPrimary, shadow, overlay/overlayDark, brand*.
// Scala dei grigi del dark — UNICO posto dei toni superficie scuri. I token
// sotto vi puntano: cambi qui e si propaga a tutto il dark.
const darkSurfaces = {
  deep: '#1B1C1F', // piu scuro: detail/sheet recessed, surfaceMuted
  base: '#26282B', // standard: schermo, card, accenti nel detail, banner
  alt: '#212327',  // variante (backgroundAlt)
  line: '#3C4043', // bordi, divider, neutralBg
};

const darkColors: typeof lightColors = {
  ...lightColors,

  // Primary palette (verde brand, schiarito per il fondo scuro)
  primary: '#66BB6A',
  primaryContainer: '#2E4630',
  primaryLight: '#22301F',
  primarySubtle: '#66BB6A26',

  // Secondary
  secondary: '#FF7043',
  secondaryContainer: '#5A2418',

  // Surfaces & backgrounds — vedi darkSurfaces (charcoal stile Google Maps)
  surface: darkSurfaces.base,
  backgroundAlt: darkSurfaces.alt,
  surfaceMuted: darkSurfaces.deep,   // accento recessed su schermo
  detailSurface: darkSurfaces.deep,  // detail/sheet recessed (= surfaceMuted)
  detailMuted: darkSurfaces.base,    // accenti nel detail, piu chiari (= surface)
  // Banner home: = surface, si fonde col fondo schermo
  bannerGradient: [darkSurfaces.base, darkSurfaces.base] as [string, string],
  // In dark NIENTE gradienti: il featured usa lo stesso fondo piatto degli altri
  // banner (= surface). La distinzione resta affidata a immagine + chip arancione.
  bannerGradientFeatured: [darkSurfaces.base, darkSurfaces.base] as [string, string],

  // Text (bianco-sporco / grigi Google)
  textPrimary: '#E8EAED',
  textSecondary: '#9AA0A6',
  textDisabled: '#5F6368',
  textHint: '#9AA0A6',
  textMuted: '#BDC1C6',

  // Error / danger (rosso saturo, schiarito per leggibilità su scuro)
  error: '#EF5350',
  errorDark: '#E53935',
  errorDarker: '#C62828',
  errorContainer: '#4A1D1D',
  errorLight: '#33201F',

  // Success (verde saturo che spicca)
  success: '#66BB6A',
  successDark: '#43A047',

  // Warning / caution (ambra-arancio saturo)
  warning: '#FFA726',
  warningDark: '#FB8C00',

  // Info (blu link "Google" su dark)
  linkBlue: '#8AB4F8',

  // Amber tones — la famiglia notice era chiaro-su-chiaro: invertita.
  amberLight: '#33291A',
  amberText: '#FFD54F',
  amberBorder: '#5A4A1F',

  // Notice surfaces (warning container)
  noticeBg: '#332819',
  noticeBorder: '#574627',

  // Selection highlight (giallo saturo + fondo scuro caldo)
  selectionHighlightBg: '#332F18',

  // Card description text (la card resta chiara: valore di sicurezza)
  cardDescriptionText: '#BDC1C6',

  // Borders & dividers
  divider: darkSurfaces.line,
  border: darkSurfaces.line,
  separator: '#5F6368',

  // Overlays — overlayLight era una "pillola" chiara: su dark diventa scura
  // (così il testo chiaro vi resta leggibile).
  overlayLight: 'rgba(32,33,36,0.88)',

  // UI elements
  switchThumbInactive: '#9AA0A6',
  neutralBg: darkSurfaces.line,
  restrictionRowBg: '#2A2630',
  restrictionRowBgPressed: '#332B3D',

  // UI components
  favoriteRed: '#FF5252',
  starEmpty: '#5F6368',
};

// ---------------------------------------------------------------------------
// Shared (non-color) design tokens — identical across themes.
// ---------------------------------------------------------------------------

const sharedTokens = {
  // Layout constants
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
    xxxl: 32,
  },

  radius: {
    sm: 8,
    md: 10,
    lg: 12,
    xl: 14,
    xxl: 16,
    round: 20,
    pill: 24,
  },

  typography: {
    headerTitle: 22,
    title: 20,
    subtitle: 18,
    body: 16,
    bodySmall: 15,
    caption: 14,
    captionSmall: 13,
    label: 12,
  },

  shadows: {
    sm: '0px 1px 3px rgba(0, 0, 0, 0.08)',
    md: '0px 2px 6px rgba(0, 0, 0, 0.15)',
    lg: '0px 3px 8px rgba(0, 0, 0, 0.18)',
  },

  // Common interaction values
  hitSlop: 8,
  activeOpacity: 0.6,
  activeOpacityLight: 0.7,

  // Icon sizes
  iconSize: {
    sm: 16,
    md: 20,
    lg: 24,
    xl: 36,
    xxl: 48,
  },
};

// ---------------------------------------------------------------------------
// Themes.
// ---------------------------------------------------------------------------

export const lightTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    ...lightColors,
  },
  ...sharedTokens,
};

export const darkTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    ...darkColors,
  },
  ...sharedTokens,
};

export type AppTheme = typeof lightTheme;

// Backward-compatible alias used by files not yet migrated to `useTheme()`.
// Always points to the light theme (the historical default).
export const theme = lightTheme;

// Ombra "card" centralizzata: presente in light, ASSENTE in dark — al buio le
// ombre non si vedono e non servono (la definizione la da il bordo). Unico
// punto in cui vivono i parametri ombra, niente piu '#000' sparsi per i file.
export function cardShadow(
  theme: AppTheme,
  opts: { opacity?: number; radius?: number; height?: number } = {}
): ViewStyle {
  if (theme.dark) return {};
  const { opacity = 0.05, radius = 3, height = 1 } = opts;
  return {
    shadowColor: theme.colors.shadow,
    shadowOpacity: opacity,
    shadowRadius: radius,
    shadowOffset: { width: 0, height },
    elevation: 1,
  };
}
