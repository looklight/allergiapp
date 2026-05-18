import { useEffect, useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { Text } from 'react-native-paper';
import { useRouter } from 'expo-router';
import Constants from 'expo-constants';
import { theme } from '../constants/theme';
import i18n from '../utils/i18n';

// I moduli @react-native-google-signin e expo-apple-authentication richiedono
// native binary, non presenti in Expo Go. Carico tutto via require condizionale
// per evitare il crash `TurboModuleRegistry.getEnforcing('RNGoogleSignin')`.
// In Expo Go il componente renderizza null (UI senza social, ma app navigabile).
const isExpoGo = Constants.appOwnership === 'expo';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let GoogleSigninButton: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let AppleAuthentication: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let SocialAuthService: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let SocialAuthCancelledError: any = null;

if (!isExpoGo) {
  GoogleSigninButton =
    require('@react-native-google-signin/google-signin').GoogleSigninButton;
  AppleAuthentication = require('expo-apple-authentication');
  const socialAuth = require('../services/socialAuth');
  SocialAuthService = socialAuth.SocialAuthService;
  SocialAuthCancelledError = socialAuth.SocialAuthCancelledError;
}

type Provider = 'google' | 'apple';

function SocialAuthButtonsImpl() {
  const router = useRouter();
  const [appleAvailable, setAppleAvailable] = useState(false);
  const [loading, setLoading] = useState<Provider | null>(null);

  useEffect(() => {
    let active = true;
    SocialAuthService.isAppleAuthAvailable().then((available: boolean) => {
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
    } catch (err: unknown) {
      if (err instanceof SocialAuthCancelledError) return;
      const message = err instanceof Error ? err.message : String(err);
      console.warn(`[SocialAuthButtons] ${provider} error:`, message);
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

export default function SocialAuthButtons() {
  if (isExpoGo) return null;
  return <SocialAuthButtonsImpl />;
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
