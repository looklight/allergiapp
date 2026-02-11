import { useEffect } from 'react';
import { View, StyleSheet, Image } from 'react-native';
import { Stack, ErrorBoundary } from 'expo-router';
import { PaperProvider, Text, Button } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { theme } from '../constants/theme';
import { AppProvider, useAppContext } from '../utils/AppContext';
import { Analytics } from '../utils/analytics';
import { RemoteConfig } from '../utils/remoteConfig';
import ConsentModal from './consent';

const splashLogo = require('../assets/splash-icon.png');

// Mantieni lo splash screen visibile finché non siamo pronti
SplashScreen.preventAutoHideAsync().catch(() => {});

export { ErrorBoundary };

function AppErrorFallback({ error, retry }: { error: Error; retry: () => void }) {
  return (
    <View style={errorStyles.container}>
      <Text style={errorStyles.icon}>⚠️</Text>
      <Text style={errorStyles.title}>Qualcosa è andato storto</Text>
      <Text style={errorStyles.message}>{error.message}</Text>
      <Button mode="contained" onPress={retry} style={errorStyles.button}>
        Riprova
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
  message: { fontSize: 14, color: '#666666', textAlign: 'center', marginBottom: 24 },
  button: { minWidth: 120 },
});

const splashStyles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  logo: {
    width: 150,
    height: 150,
    borderRadius: 24,
  },
});


function AppContent() {
  const { isReady, needsLegalConsent, hasAcceptedLegalTerms, trackingConsent } = useAppContext();

  useEffect(() => {
    if (isReady) {
      // Nascondi lo splash screen quando l'app è pronta
      SplashScreen.hideAsync();

      // Initialize Remote Config (fetches banner configuration)
      RemoteConfig.initialize();

      // Initialize analytics tracking based on stored consent
      if (hasAcceptedLegalTerms) {
        Analytics.setTrackingConsent(trackingConsent);
        Analytics.logAppOpened();
      }
    }
  }, [isReady, hasAcceptedLegalTerms, trackingConsent]);

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
          headerTintColor: '#FFFFFF',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}
      />
      {/* Consent modal overlay - shown on top of the app */}
      <ConsentModal visible={needsLegalConsent} />
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
