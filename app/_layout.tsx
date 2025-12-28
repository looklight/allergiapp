import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { theme } from '../constants/theme';
import { storage } from '../utils/storage';
import { setAppLanguage } from '../utils/i18n';

export default function RootLayout() {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const loadSettings = async () => {
      const settings = await storage.getSettings();
      setAppLanguage(settings.appLanguage);
      setIsReady(true);
    };
    loadSettings();
  }, []);

  if (!isReady) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <PaperProvider theme={theme}>
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerStyle: {
              backgroundColor: theme.colors.primary,
            },
            headerTintColor: '#FFFFFF',
            headerTitleStyle: {
              fontWeight: 'bold',
            },
          }}
        />
      </PaperProvider>
    </SafeAreaProvider>
  );
}
