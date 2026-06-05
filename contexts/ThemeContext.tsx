import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useColorScheme } from 'react-native';
import { lightTheme, darkTheme, type AppTheme } from '../constants/theme';
import { storage, type ThemeMode } from '../utils/storage';

// Master switch. The dark palette (Fase 2) and the settings toggle (Fase 3) are
// in place, so dark mode is active: with mode 'system' the app follows the OS,
// otherwise it honours the user's choice.
const DARK_MODE_ENABLED = true;

interface ThemeContextValue {
  /** Resolved theme object (light/dark) to feed components and PaperProvider. */
  theme: AppTheme;
  /** User preference: 'system' follows the OS, otherwise forced. */
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  /** Whether the dark theme is actually active right now. */
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme(); // 'light' | 'dark' | null
  const [mode, setModeState] = useState<ThemeMode>('system');
  const [loaded, setLoaded] = useState(false);

  // Load the persisted preference once on mount.
  useEffect(() => {
    let active = true;
    storage.getThemeMode().then((m) => {
      if (active) {
        setModeState(m);
        setLoaded(true);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next);
    storage.setThemeMode(next);
  }, []);

  const resolvedScheme = mode === 'system' ? systemScheme ?? 'light' : mode;
  const isDark = DARK_MODE_ENABLED && resolvedScheme === 'dark';
  const theme = isDark ? darkTheme : lightTheme;

  const value = useMemo<ThemeContextValue>(
    () => ({ theme, mode, setMode, isDark }),
    [theme, mode, setMode, isDark]
  );

  // Block render until the saved preference is loaded, so we never flash the
  // wrong theme on cold start. The native splash screen stays up meanwhile.
  if (!loaded) return null;

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

/** Returns the active theme object. Drop-in replacement for the old static
 *  `import { theme }`: usage `const theme = useTheme()` then `theme.colors.X`. */
export function useTheme(): AppTheme {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider');
  return ctx.theme;
}

/** For the settings UI: the chosen mode + setter + whether dark is active. */
export function useThemePreference() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useThemePreference must be used within a ThemeProvider');
  return { mode: ctx.mode, setMode: ctx.setMode, isDark: ctx.isDark };
}
