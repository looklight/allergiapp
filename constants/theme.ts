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

    // Amber tones (cards, highlights)
    amberLight: '#FFF8E1',
    amber: '#FFC107',
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

    // UI elements
    switchThumbInactive: '#F4F3F4',
    restrictionRowBg: '#F9F5FF',
    restrictionRowBgPressed: '#F0EAFC',

    // Brand colors
    brandInstagram: '#E1306C',
    brandYoutube: '#FF0000',
    brandWebsite: '#FFDD00',
  },
};
