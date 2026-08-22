import type { Dictionary } from './i18n';

// Supabase risponde con messaggi in inglese pensati per gli sviluppatori
// ("Invalid login credentials"): qui diventano frasi del dizionario, così
// il portale parla la lingua dell'utente anche quando qualcosa va storto.
// Il confronto è sul testo perché Supabase non espone codici stabili per
// questi casi: match generosi, e fallback su un messaggio generico.
export function authErrorMessage(message: string, d: Dictionary): string {
  const m = message.toLowerCase();

  if (m.includes('already registered') || m.includes('already exists')) {
    return d.authErrors.alreadyRegistered;
  }
  if (m.includes('invalid login credentials')) {
    return d.authErrors.invalidCredentials;
  }
  if (m.includes('email not confirmed')) {
    return d.authErrors.emailNotConfirmed;
  }
  if (m.includes('password should be') || m.includes('at least')) {
    return d.authErrors.weakPassword;
  }
  if (m.includes('unable to validate email') || m.includes('invalid email')) {
    return d.authErrors.invalidEmail;
  }
  if (m.includes('rate limit') || m.includes('too many requests')) {
    return d.authErrors.tooManyAttempts;
  }
  if (m.includes('fetch') || m.includes('network') || m.includes('connection')) {
    return d.authErrors.network;
  }

  return d.authErrors.generic;
}

// Requisito del portale, non del progetto Supabase: qui si creano le
// credenziali di chi gestirà un abbonamento. Il minimo del progetto resta 6
// perché è condiviso con l'app in store, che non si può adeguare senza una
// build nuova (OTA bloccate) — v. MONETIZATION.md.
export const PARTNER_MIN_PASSWORD = 8;
