import { MD3LightTheme } from 'react-native-paper';

export const theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,

    // Primary palette
    primary: '#4CAF50',
    primaryContainer: '#C8E6C9',
    primaryLight: '#E8F5E9',

    // Secondary palette
    secondary: '#FF5722',
    secondaryContainer: '#FFCCBC',

    // Surfaces & backgrounds
    surface: '#FFFFFF',
    background: '#F5F5F5',
    backgroundAlt: '#FAFAFA',

    // Text
    textPrimary: '#333333',
    textSecondary: '#666666',
    textDisabled: '#999999',
    textHint: '#888888',
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

    // Amber tones (cards, highlights)
    amberLight: '#FFF8E1',
    amber: '#FFC107',
    amberDark: '#E6A700',
    amberText: '#8D6E00',
    amberBorder: '#FFE082',
    orangeLight: '#FFF3E0',
    orangeBorder: '#FFE0B2',

    // Accent (selection highlight)
    accent: '#FFD600',
    accentLight: '#FFFDE7',

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
    scrim: 'rgba(255,255,255,0.1)',

    // UI elements
    switchThumbInactive: '#F4F3F4',
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

    // Inferred state (compatibility chips)
    inferredBg: '#F3F4F6',
    inferredBorder: '#D1D5DB',
  },

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
