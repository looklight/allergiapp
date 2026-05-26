import { Platform } from 'react-native';
import {
  GoogleSignin,
  isSuccessResponse,
} from '@react-native-google-signin/google-signin';
import * as AppleAuthentication from 'expo-apple-authentication';
import { supabase } from './supabase';
import { SupabaseAnalytics } from './supabaseAnalytics';
import { AuthService, type AppUser } from './auth';

// I 3 Google OAuth Client IDs sono pubblici per design (vivono nei binari mobile).
// Vedi memoria progetto `project_social_auth.md` per il setup completo.
const GOOGLE_WEB_CLIENT_ID =
  '232304005477-va7odgel0n3p4lke2ouv6vp66donla1n.apps.googleusercontent.com';
const GOOGLE_IOS_CLIENT_ID =
  '232304005477-kvrlncr7oihtc2137b1u9i1hcvv2dcet.apps.googleusercontent.com';

let googleConfigured = false;
function ensureGoogleConfigured() {
  if (googleConfigured) return;
  GoogleSignin.configure({
    webClientId: GOOGLE_WEB_CLIENT_ID,
    iosClientId: GOOGLE_IOS_CLIENT_ID,
  });
  googleConfigured = true;
}

// Errore esplicito per "l'utente ha annullato il flow". I caller decidono se
// silenziarlo (di solito sì: niente alert se l'utente ha scelto di chiudere).
export class SocialAuthCancelledError extends Error {
  constructor(provider: 'google' | 'apple') {
    super(`User cancelled ${provider} sign-in`);
    this.name = 'SocialAuthCancelledError';
  }
}

async function signInWithGoogle(): Promise<AppUser> {
  ensureGoogleConfigured();

  if (Platform.OS === 'android') {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  }

  const result = await GoogleSignin.signIn();
  if (!isSuccessResponse(result)) {
    // type === 'cancelled' (v16 non lancia, restituisce un oggetto tipizzato)
    throw new SocialAuthCancelledError('google');
  }
  const idToken = result.data.idToken;
  if (!idToken) {
    throw new Error('Google non ha restituito un idToken');
  }

  const { data, error } = await supabase.auth.signInWithIdToken({
    provider: 'google',
    token: idToken,
  });
  if (error) throw error;
  if (!data.user) throw new Error('Sign in con Google fallito');

  // Lazy creation del profilo (stessa logica di AuthService.signUp). Il trigger
  // DB assegna automaticamente username `user_xxxxxx` se assente.
  await AuthService.ensureProfile(data.user.id);

  SupabaseAnalytics.track('sign_in', { provider: 'google', is_signup: isFirstSignIn(data.user) });
  return { uid: data.user.id, email: data.user.email ?? null };
}

async function signInWithApple(): Promise<AppUser> {
  if (Platform.OS !== 'ios') {
    throw new Error('Sign In with Apple disponibile solo su iOS');
  }

  let identityToken: string | null = null;
  try {
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });
    identityToken = credential.identityToken;
  } catch (err: any) {
    if (err?.code === 'ERR_REQUEST_CANCELED') {
      throw new SocialAuthCancelledError('apple');
    }
    throw err;
  }

  if (!identityToken) {
    throw new Error('Apple non ha restituito un identityToken');
  }

  const { data, error } = await supabase.auth.signInWithIdToken({
    provider: 'apple',
    token: identityToken,
  });
  if (error) throw error;
  if (!data.user) throw new Error('Sign in con Apple fallito');

  await AuthService.ensureProfile(data.user.id);

  SupabaseAnalytics.track('sign_in', { provider: 'apple', is_signup: isFirstSignIn(data.user) });
  return { uid: data.user.id, email: data.user.email ?? null };
}

// Considera "signup" il primo sign-in: Supabase imposta last_sign_in_at uguale
// a created_at al primo accesso, e lo aggiorna nei successivi.
function isFirstSignIn(user: { created_at?: string; last_sign_in_at?: string | null }): boolean {
  if (!user.created_at || !user.last_sign_in_at) return false;
  return user.created_at === user.last_sign_in_at;
}

async function isAppleAuthAvailable(): Promise<boolean> {
  if (Platform.OS !== 'ios') return false;
  return AppleAuthentication.isAvailableAsync();
}

export const SocialAuthService = {
  signInWithGoogle,
  signInWithApple,
  isAppleAuthAvailable,
};
