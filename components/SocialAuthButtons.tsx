import { useEffect, useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { Text } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { GoogleSigninButton } from '@react-native-google-signin/google-signin';
import * as AppleAuthentication from 'expo-apple-authentication';
import { theme } from '../constants/theme';
import {
  SocialAuthService,
  SocialAuthCancelledError,
} from '../services/socialAuth';
import i18n from '../utils/i18n';

type Provider = 'google' | 'apple';

export default function SocialAuthButtons() {
  const router = useRouter();
  const [appleAvailable, setAppleAvailable] = useState(false);
  const [loading, setLoading] = useState<Provider | null>(null);

  useEffect(() => {
    let active = true;
    SocialAuthService.isAppleAuthAvailable().then((available) => {
      if (active) setAppleAvailable(available);
    });
    return () => {
      active = false;
    };
  }, []);

  const runSignIn = async (provider: Provider) => {
    setLoading(provider);
    try {
      if (provider === 'google') {
        await SocialAuthService.signInWithGoogle();
      } else {
        await SocialAuthService.signInWithApple();
      }
      // L'utente nuovo viene redirezionato a onboarding-nickname dal
      // useEffect globale in app/_layout.tsx (needsOnboarding === true).
      // L'utente esistente torna allo screen precedente.
      router.back();
    } catch (err: any) {
      if (err instanceof SocialAuthCancelledError) return;
      console.warn(`[SocialAuthButtons] ${provider} error:`, err?.message);
      Alert.alert(i18n.t('common.error'), i18n.t('login.alerts.errors.generic'));
    } finally {
      setLoading(null);
    }
  };

  return (
    <View style={styles.container}>
      <GoogleSigninButton
        size={GoogleSigninButton.Size.Wide}
        color={GoogleSigninButton.Color.Dark}
        disabled={loading !== null}
        onPress={() => runSignIn('google')}
        style={styles.googleButton}
      />
      {appleAvailable && (
        <AppleAuthentication.AppleAuthenticationButton
          buttonType={
            AppleAuthentication.AppleAuthenticationButtonType.CONTINUE
          }
          buttonStyle={
            AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
          }
          cornerRadius={6}
          style={styles.appleButton}
          onPress={() => runSignIn('apple')}
        />
      )}
      <View style={styles.dividerRow}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>{i18n.t('common.or')}</Text>
        <View style={styles.dividerLine} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  googleButton: {
    width: 230,
    height: 48,
  },
  appleButton: {
    width: '100%',
    height: 48,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 4,
    alignSelf: 'stretch',
  },
  dividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: theme.colors.border,
  },
  dividerText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
