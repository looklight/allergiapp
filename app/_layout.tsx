import { useEffect, useRef } from 'react';
import { View, StyleSheet, Image, ScrollView } from 'react-native';
import { Stack, usePathname, useRouter } from 'expo-router';
import * as Updates from 'expo-updates';
import { PaperProvider, Text, Button } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { theme } from '../constants/theme';
import { AppProvider, useAppContext } from '../contexts/AppContext';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import { Analytics } from '../services/analytics';
import { Crashlytics } from '../services/crashlytics';
import { RemoteConfig } from '../services/remoteConfig';
import i18n from '../utils/i18n';
import { useDietarySync } from '../hooks/useDietarySync';
import ConsentModal from './consent';
import AnnouncementPopup from './components/AnnouncementPopup';

const splashLogo = require('../assets/splash-icon.png');

// Mantieni lo splash screen visibile finché non siamo pronti
SplashScreen.preventAutoHideAsync().catch(() => {});

// --- Global error handler: cattura errori JS e promise rejection non gestite ---
if (__DEV__) {
  const originalHandler = ErrorUtils.getGlobalHandler();
  ErrorUtils.setGlobalHandler((error, isFatal) => {
    console.error(
      `\n[GlobalError] ${isFatal ? 'FATAL' : 'NON-FATAL'}:\n${error?.message}\n${error?.stack?.split('\n').slice(0, 8).join('\n')}`
    );
    originalHandler?.(error, isFatal);
  });
}

// --- ErrorBoundary custom per expo-router ---
export function ErrorBoundary({ error, retry }: { error: Error; retry: () => void }) {
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
    backgroundColor: theme.colors.background,
  },
  icon: { fontSize: 48, marginBottom: 16, color: theme.colors.error, fontWeight: 'bold' },
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 8, color: theme.colors.error },
  message: { fontSize: 14, color: theme.colors.textSecondary, textAlign: 'center', marginBottom: 16 },
  stackContainer: { maxHeight: 200, width: '100%', marginBottom: 16 },
  stack: { fontSize: 11, fontFamily: 'monospace', color: '#666', lineHeight: 16 },
  button: { minWidth: 120 },
});

const splashStyles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
  },
  logo: {
    width: 150,
    height: 150,
    borderRadius: 24,
  },
});


const ONBOARDING_PATHS = ['/auth/onboarding-nickname', '/auth/onboarding-dietary', '/auth/onboarding-tutorial', '/legal'];

function AppContent() {
  const { isReady, needsLegalConsent, hasAcceptedLegalTerms, trackingConsent, selectedAllergens, selectedOtherFoods, activeDietModes, vegetarianLevel, selectedRestrictions, settings } = useAppContext();
  const { needsOnboarding, isLoading: authLoading } = useAuth();
  useDietarySync();
  const router = useRouter();
  const pathname = usePathname();
  const prevPathname = useRef<string | null>(null);

  useEffect(() => {
    if (isReady) {
      // Inizializzazione con splash visibile:
      // 1) Controlla OTA → se disponibile, scarica e ricarica subito
      // 2) Fetch Remote Config (max 3s) → splash si nasconde con valori già pronti
      (async () => {
        if (!__DEV__) {
          try {
            const update = await Updates.checkForUpdateAsync();
            if (update.isAvailable) {
              await Updates.fetchUpdateAsync();
              await Updates.reloadAsync();
              return;
            }
          } catch {}
        }

        // Fetch Remote Config con timeout di 3s — garantisce valori corretti al primo render
        await Promise.race([
          RemoteConfig.initialize(),
          new Promise<void>(resolve => setTimeout(resolve, 3000)),
        ]);

        SplashScreen.hideAsync();
      })();

      // Initialize analytics tracking based on stored consent
      if (hasAcceptedLegalTerms) {
        Analytics.setTrackingConsent(trackingConsent);
        Crashlytics.setCollectionEnabled(trackingConsent.status === 'authorized');
        Analytics.logAppOpened();
        Analytics.updateUserProperties({
          allergenCount: selectedAllergens.length + selectedOtherFoods.length,
          allergenIds: selectedAllergens,
          otherFoodIds: selectedOtherFoods,
          dietModes: activeDietModes,
          cardLanguage: settings.cardLanguage,
          vegetarianLevel: activeDietModes.includes('vegetarian') ? vegetarianLevel : undefined,
          restrictionCount: selectedRestrictions.length,
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
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          animation: 'slide_from_right',
          gestureEnabled: true,
          headerShown: false,
        }}
      />
      {/* Consent modal overlay - shown on top of the app */}
      <ConsentModal visible={needsLegalConsent} />
      {/* Announcement popup - shown once per popup_id after consent */}
      {hasAcceptedLegalTerms && <AnnouncementPopup />}
    </>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <PaperProvider theme={theme}>
          <AppProvider>
            <AuthProvider>
              <AppContent />
            </AuthProvider>
          </AppProvider>
        </PaperProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
