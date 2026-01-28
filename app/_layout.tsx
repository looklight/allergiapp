import { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { Stack, ErrorBoundary } from 'expo-router';
import { PaperProvider, Text, Button } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { theme } from '../constants/theme';
import { AppProvider, useAppContext } from '../utils/AppContext';
import { Analytics } from '../utils/analytics';

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

function AppContent() {
  const { isReady } = useAppContext();

  useEffect(() => {
    if (isReady) {
      Analytics.logAppOpened();
    }
  }, [isReady]);

  if (!isReady) {
    return null;
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
