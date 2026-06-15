import { useEffect, useRef } from 'react';
import { View, StyleSheet, Image, ScrollView } from 'react-native';
import { Stack, usePathname, useRouter } from 'expo-router';
import { PaperProvider, Text, Button } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import Constants from 'expo-constants';
import { theme } from '../constants/theme';
import { ThemeProvider, useTheme, useThemePreference } from '../contexts/ThemeContext';
import { AppProvider, useAppContext } from '../contexts/AppContext';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import { UnlockedAvatarsProvider } from '../contexts/UnlockedAvatarsContext';
import { Analytics } from '../services/analytics';
import { SupabaseAnalytics } from '../services/supabaseAnalytics';
import { Crashlytics } from '../services/crashlytics';
import i18n from '../utils/i18n';
import ConsentModal from './consent';
import AnnouncementPopup from './components/AnnouncementPopup';
import UnlockedAvatarsPopup from './components/UnlockedAvatarsPopup';

const splashLogo = require('../assets/splash-icon.png');

// Mantieni lo splash screen visibile finché non siamo pronti
SplashScreen.preventAutoHideAsync().catch(() => {});

// --- Global error handler: cattura errori JS e promise rejection non gestite ---
// L'handler originale (RN default) viene salvato sul globalThis al primo
// load, così gli hot-reload non accatastano wrapper su wrapper (causava
// stack overflow ricorsivo che nascondeva l'errore vero).
// In dev usa console.warn (no LogBox red-box). In prod inoltra a Crashlytics
// come non-fatal e poi delega al default handler (che gestisce il crash).
{
  const g = globalThis as unknown as { __appOriginalErrorHandler?: (e: unknown, f?: boolean) => void };
  if (!g.__appOriginalErrorHandler) {
    g.__appOriginalErrorHandler = ErrorUtils.getGlobalHandler();
  }
  const originalHandler = g.__appOriginalErrorHandler;
  let isHandling = false;
  ErrorUtils.setGlobalHandler((error, isFatal) => {
    if (!isHandling) {
      isHandling = true;
      try {
        if (__DEV__) {
          console.warn(
            `\n[GlobalError] ${isFatal ? 'FATAL' : 'NON-FATAL'}:\n${error?.message}\n${error?.stack?.split('\n').slice(0, 8).join('\n')}`
          );
        } else if (error instanceof Error) {
          Crashlytics.recordError(error, isFatal ? 'GlobalJSFatal' : 'GlobalJSNonFatal');
        }
      } finally {
        isHandling = false;
      }
    }
    originalHandler?.(error, isFatal);
  });
}

// --- ErrorBoundary custom per expo-router ---
export function ErrorBoundary({ error, retry }: { error: Error; retry: () => void }) {
  // Reporta a Crashlytics il primo render (no-op in __DEV__/Expo Go).
  // Dipendiamo dall'identita' dell'oggetto error: se cambia, e' un nuovo errore.
  useEffect(() => {
    Crashlytics.recordError(error, 'ReactRenderError');
  }, [error]);

  return (
    <View style={errorStyles.container}>
      <Text style={errorStyles.icon}>!</Text>
      <Text style={errorStyles.title}>{i18n.t('app.errorTitle')}</Text>
      <Text style={errorStyles.message}>{error.message}</Text>
      {__DEV__ && error.stack && (
        <ScrollView style={errorStyles.stackContainer}>
          <Text style={errorStyles.stack} selectable>
            {error.stack.split('\n').slice(0, 12).join('\n')}
          </Text>
        </ScrollView>
      )}
      <Button mode="contained" onPress={retry} style={errorStyles.button}>
        {i18n.t('app.errorRetry')}
      </Button>
    </View>
  );
}

const errorStyles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: theme.colors.surface,
  },
  icon: { fontSize: 48, marginBottom: 16, color: theme.colors.error, fontWeight: 'bold' },
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 8, color: theme.colors.error },
  message: { fontSize: 14, color: theme.colors.textSecondary, textAlign: 'center', marginBottom: 16 },
  stackContainer: { maxHeight: 200, width: '100%', marginBottom: 16 },
  stack: { fontSize: 11, fontFamily: 'monospace', color: theme.colors.textSecondary, lineHeight: 16 },
  button: { minWidth: 120 },
});

const splashStyles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    // Deve combaciare con lo splash nativo (expo-splash-screen in app.config.ts:
    // backgroundColor #F7DCB3, image splash-icon.png imageWidth 200 contain).
    // Se differisce, l'utente percepisce "due splash" alla transizione nativo→JS.
    backgroundColor: '#F7DCB3',
  },
  logo: {
    width: 200,
    height: 200,
  },
});


const ONBOARDING_PATHS = ['/auth/onboarding-nickname', '/auth/onboarding-dietary', '/auth/onboarding-tutorial', '/legal'];

function AppContent() {
  const activeTheme = useTheme();
  const { isDark } = useThemePreference();
  const { isReady, needsLegalConsent, hasAcceptedLegalTerms, trackingConsent, profileAllergens, profileOtherFoods, profileActiveDietModes, profileVegetarianLevel, profileRestrictions, settings } = useAppContext();
  const { needsOnboarding, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const prevPathname = useRef<string | null>(null);
  const didInitialTabRedirect = useRef(false);

  useEffect(() => {
    if (isReady) {
      // Default-tab: se l'utente ha scelto "Ristoranti" come schermata
      // iniziale, facciamo il replace PRIMA di nascondere lo splash nativo,
      // così la tab corretta è già attiva quando lo splash sparisce (no flash).
      // Una sola volta al cold-start (ref guard); non interferisce con
      // l'onboarding (chi è in onboarding ha defaultTab di default = 'card').
      if (!didInitialTabRedirect.current) {
        didInitialTabRedirect.current = true;
        if (settings.defaultTab === 'restaurants' && pathname === '/') {
          router.replace('/restaurants');
        }
      }

      // Gli OTA vengono check/scaricati/applicati dal side nativo di
      // expo-updates al cold-start (config in app.config.ts: updates.url).
      // Niente reload mid-init per evitare race coi provider in mount.
      SplashScreen.hideAsync();

      // Initialize analytics tracking based on stored consent
      if (hasAcceptedLegalTerms) {
        Analytics.setTrackingConsent(trackingConsent);
        SupabaseAnalytics.setTrackingConsent(trackingConsent);
        Crashlytics.setCollectionEnabled(trackingConsent.status === 'authorized');
        Crashlytics.setAttributes({
          app_version: Constants.expoConfig?.version,
          card_language: settings.cardLanguage,
          app_language: settings.appLanguage,
          allergen_count: profileAllergens.length + profileOtherFoods.length,
          restriction_count: profileRestrictions.length,
          diet_modes: profileActiveDietModes.join(',') || 'none',
        });
        Analytics.logAppOpened();
        Analytics.updateUserProperties({
          allergenCount: profileAllergens.length + profileOtherFoods.length,
          allergenIds: profileAllergens,
          otherFoodIds: profileOtherFoods,
          dietModes: profileActiveDietModes,
          cardLanguage: settings.cardLanguage,
          vegetarianLevel: profileActiveDietModes.includes('vegetarian') ? profileVegetarianLevel : undefined,
          restrictionCount: profileRestrictions.length,
        });
      }
    }
  }, [isReady, hasAcceptedLegalTerms, trackingConsent]);

  // Redirect onboarding incompleto
  useEffect(() => {
    if (!isReady || authLoading) return;
    if (needsOnboarding && !ONBOARDING_PATHS.includes(pathname)) {
      router.replace('/auth/onboarding-nickname');
    }
  }, [isReady, authLoading, needsOnboarding, pathname]);

  // Track screen views on route changes
  useEffect(() => {
    if (isReady && hasAcceptedLegalTerms && pathname && pathname !== prevPathname.current) {
      prevPathname.current = pathname;
      const screenName = pathname === '/' ? 'Home' : pathname.replace(/^\//, '');
      Analytics.logScreenView(screenName);
      Crashlytics.log(`screen: ${screenName}`);
      Crashlytics.setAttribute('last_screen', screenName);
    }
  }, [pathname, isReady, hasAcceptedLegalTerms]);

  if (!isReady) {
    // Mostra il nostro splash personalizzato mentre l'app carica
    return (
      <View style={splashStyles.container}>
        <Image source={splashLogo} style={splashStyles.logo} resizeMode="contain" />
      </View>
    );
  }

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          animation: 'ios_from_right',
          gestureEnabled: true,
          headerShown: false,
          contentStyle: { backgroundColor: activeTheme.colors.surface },
        }}
      />
      {/* Consent modal overlay - shown on top of the app */}
      <ConsentModal visible={needsLegalConsent} />
      {/* Announcement popup - shown once per popup_id after consent */}
      {hasAcceptedLegalTerms && <AnnouncementPopup />}
      {/* Avatar unlock popup - shown when user unlocks new avatars */}
      <UnlockedAvatarsPopup />
    </>
  );
}

// Feeds Paper its theme from the ThemeContext, so Paper components (Button,
// TextInput, Dialog…) switch light/dark together with our own styled views.
function ThemedPaperProvider({ children }: { children: React.ReactNode }) {
  const activeTheme = useTheme();
  return <PaperProvider theme={activeTheme}>{children}</PaperProvider>;
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <ThemedPaperProvider>
            <AppProvider>
              <AuthProvider>
                <UnlockedAvatarsProvider>
                  <AppContent />
                </UnlockedAvatarsProvider>
              </AuthProvider>
            </AppProvider>
          </ThemedPaperProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
