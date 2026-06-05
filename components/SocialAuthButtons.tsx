import { useEffect, useState, useMemo } from 'react';
import { View, StyleSheet, Alert, TouchableOpacity, Text } from 'react-native';
import { useRouter } from 'expo-router';
import Constants from 'expo-constants';
import Svg, { Path } from 'react-native-svg';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import type { AppTheme } from '../constants/theme';
import i18n from '../utils/i18n';

// I moduli @react-native-google-signin e expo-apple-authentication richiedono
// native binary, non presenti in Expo Go. Carico tutto via require condizionale
// per evitare il crash TurboModuleRegistry.getEnforcing('RNGoogleSignin').
// In Expo Go il componente renderizza null (UI senza social, ma app navigabile).
const isExpoGo = Constants.appOwnership === 'expo';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let AppleAuthentication: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let SocialAuthService: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let SocialAuthCancelledError: any = null;

if (!isExpoGo) {
  AppleAuthentication = require('expo-apple-authentication');
  const socialAuth = require('../services/socialAuth');
  SocialAuthService = socialAuth.SocialAuthService;
  SocialAuthCancelledError = socialAuth.SocialAuthCancelledError;
}

type Provider = 'google' | 'apple';

// Logo Google ufficiale a 4 colori (SVG inline, no asset esterno).
// Path standard pubblicato da Google su developers.google.com/identity/branding-guidelines.
function GoogleGIcon({ size = 20 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <Path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <Path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <Path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </Svg>
  );
}

function SocialAuthButtonsImpl() {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
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

  const anyLoading = loading !== null;

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.button, styles.googleButton, anyLoading && styles.buttonDisabled]}
        onPress={() => runSignIn('google')}
        disabled={anyLoading}
        activeOpacity={0.7}
      >
        <GoogleGIcon size={20} />
        <Text style={[styles.buttonText, styles.googleText]}>
          {i18n.t('common.continueWithGoogle')}
        </Text>
      </TouchableOpacity>

      {appleAvailable && (
        <TouchableOpacity
          style={[styles.button, styles.appleButton, anyLoading && styles.buttonDisabled]}
          onPress={() => runSignIn('apple')}
          disabled={anyLoading}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons name="apple" size={22} color="#FFFFFF" />
          <Text style={[styles.buttonText, styles.appleText]}>
            {i18n.t('common.continueWithApple')}
          </Text>
        </TouchableOpacity>
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

const makeStyles = (theme: AppTheme) => StyleSheet.create({
  container: {
    gap: 10,
    marginBottom: 20,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: 52,
    borderRadius: 10,
    gap: 12,
    paddingHorizontal: 16,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  googleButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DADCE0',
  },
  googleText: {
    color: '#3C4043',
  },
  appleButton: {
    backgroundColor: '#000000',
  },
  appleText: {
    color: '#FFFFFF',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 6,
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
