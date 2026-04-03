import { useEffect, useRef } from 'react';
import { View, StyleSheet, Image } from 'react-native';
import { Stack, ErrorBoundary, usePathname } from 'expo-router';
import * as Updates from 'expo-updates';
import { PaperProvider, Text, Button } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { theme } from '../constants/theme';
import { AppProvider, useAppContext } from '../contexts/AppContext';
import { Analytics } from '../services/analytics';
import { Crashlytics } from '../services/crashlytics';
import { RemoteConfig } from '../services/remoteConfig';
import i18n from '../utils/i18n';
import ConsentModal from './consent';
import AnnouncementPopup from './components/AnnouncementPopup';

const splashLogo = require('../assets/splash-icon.png');

// Mantieni lo splash screen visibile finché non siamo pronti
SplashScreen.preventAutoHideAsync().catch(() => {});

export { ErrorBoundary };

function AppErrorFallback({ error, retry }: { error: Error; retry: () => void }) {
  return (
    <View style={errorStyles.container}>
      <Text style={errorStyles.icon}>⚠️</Text>
      <Text style={errorStyles.title}>{i18n.t('app.errorTitle')}</Text>
      <Text style={errorStyles.message}>{error.message}</Text>
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
  icon: { fontSize: 48, marginBottom: 16 },
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 8, color: theme.colors.error },
  message: { fontSize: 14, color: theme.colors.textSecondary, textAlign: 'center', marginBottom: 24 },
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


function AppContent() {
  const { isReady, needsLegalConsent, hasAcceptedLegalTerms, trackingConsent, selectedAllergens, selectedOtherFoods, activeDietModes, vegetarianLevel, selectedRestrictions, settings } = useAppContext();
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
          headerStyle: {
            backgroundColor: theme.colors.primary,
          },
          headerTintColor: theme.colors.onPrimary,
          headerTitleStyle: {
            fontWeight: 'bold',
          },
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
    <SafeAreaProvider>
      <PaperProvider theme={theme}>
        <AppProvider>
          <AppContent />
        </AppProvider>
      </PaperProvider>
    </SafeAreaProvider>
  );
}
