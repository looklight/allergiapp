import { useState, useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Button } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { useTheme } from '../../contexts/ThemeContext';
import type { AppTheme } from '../../constants/theme';
import { SupabaseAnalytics } from '../../services/supabaseAnalytics';
import i18n from '../../utils/i18n';

/**
 * Ultimo step dell'onboarding (raggiunto sia da "Inizia" che da "Salta" del
 * tutorial). Schermata di priming che spiega il valore della posizione e porta
 * direttamente al menu nativo del sistema: nessun "più tardi" morbido (riduce la
 * caduta da scetticismo), la scelta avviene nel dialog OS. La mappa funziona
 * comunque senza posizione, quindi un diniego non blocca nulla.
 */
export default function OnboardingLocationScreen() {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [requesting, setRequesting] = useState(false);

  const handleEnable = async () => {
    setRequesting(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      SupabaseAnalytics.track('location_permission_prompted', {
        granted: status === 'granted',
      });
    } catch {
      // Il prompt può fallire (es. servizi non disponibili): procediamo comunque,
      // l'utente potrà attivare la posizione dal pulsante "centra su di me".
    } finally {
      setRequesting(false);
      router.replace('/(tabs)/restaurants');
    }
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false, gestureEnabled: false }} />

      <View style={styles.content}>
        <View style={styles.iconBadge}>
          <MaterialCommunityIcons
            name="map-marker-radius"
            size={48}
            color={theme.colors.primary}
          />
        </View>
        <Text style={styles.title}>{i18n.t('onboardingLocation.title')}</Text>
        <Text style={styles.description}>{i18n.t('onboardingLocation.description')}</Text>
      </View>

      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 16 }]}>
        <Button
          mode="contained"
          onPress={handleEnable}
          loading={requesting}
          disabled={requesting}
          style={styles.button}
          labelStyle={styles.buttonLabel}
          icon="crosshairs-gps"
        >
          {i18n.t('onboardingLocation.button')}
        </Button>
      </View>
    </View>
  );
}

const makeStyles = (theme: AppTheme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.surface,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  iconBadge: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: theme.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    textAlign: 'center',
    marginBottom: 12,
  },
  description: {
    fontSize: 15,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  bottomBar: {
    paddingHorizontal: 24,
    paddingTop: 12,
    backgroundColor: theme.colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.border,
  },
  button: {
    borderRadius: 10,
  },
  buttonLabel: {
    fontSize: 16,
    paddingVertical: 4,
  },
});
