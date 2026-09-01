'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { useI18n } from '@/lib/i18n';
import { authErrorMessage, PARTNER_MIN_PASSWORD } from '@/lib/authErrors';
import { createPartnerProfile } from '@/lib/partnerProfile';
import LanguageSwitcher from '@/components/LanguageSwitcher';

const inputClass =
  'w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-gray-900 focus:outline-none';
const labelClass = 'mb-1 block text-sm font-medium text-gray-700';

export default function LoginPage() {
  const { session, loading } = useAuth();
  const { d, locale } = useI18n();
  const router = useRouter();

  const [mode, setMode] = useState<'signIn' | 'signUp'>('signIn');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [terms, setTerms] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkEmail, setCheckEmail] = useState(false);
  const [existingAccount, setExistingAccount] = useState(false);
  // Recupero password: quello che si dice dopo averlo chiesto
  const [recovery, setRecovery] = useState<string | null>(null);

  const isSignUp = mode === 'signUp';

  // Password dimenticata. Al portale si entra una volta al mese, quindi
  // dimenticarla è il caso normale e non l'eccezione: senza questa via
  // l'unica uscita era scriverci.
  //
  // Il link della mail porta a /account?password=1, cioè al riquadro della
  // password dell'account, che è LO STESSO da cui la si cambia stando già
  // dentro. Una pagina sola con due ingressi, invece di due moduli identici
  // da tenere allineati.
  //
  // Non si dice MAI se quell'email esiste: risponderebbe a chi prova indirizzi
  // per sapere chi è iscritto. Il messaggio è lo stesso in tutti i casi, e per
  // la stessa ragione un rifiuto del server non si mostra.
  async function handleForgot() {
    setError(null);
    if (email.trim() === '') {
      setRecovery(d.login.forgotNeedsEmail);
      return;
    }
    setSubmitting(true);
    await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/account?password=1`,
    });
    setRecovery(d.login.forgotSent);
    setSubmitting(false);
  }

  useEffect(() => {
    if (!loading && session) {
      router.replace('/');
    }
  }, [loading, session, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setRecovery(null);

    if (!isSignUp) {
      setSubmitting(true);
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError(authErrorMessage(error.message, d));
      setSubmitting(false);
      return;
    }

    if (!terms) {
      setError(d.login.termsRequired);
      return;
    }

    // Credenziale già esistente (tipicamente un utente dell'app): non si
    // ricomincia da capo, si prosegue lo stesso percorso autenticandosi e
    // creando il profilo partner sulla credenziale che c'è già.
    if (existingAccount) {
      setSubmitting(true);
      const { data: accesso, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (signInError) {
        setError(authErrorMessage(signInError.message, d));
      } else if (accesso.user) {
        // l'utente arriva già nella risposta dell'accesso: non serve richiederlo
        const { error: profileError } = await createPartnerProfile(
          accesso.user.id,
          { firstName, lastName, marketing },
          locale
        );
        if (profileError) setError(authErrorMessage(profileError, d));
      }
      setSubmitting(false);
      return;
    }

    if (password.length < PARTNER_MIN_PASSWORD) {
      setError(d.login.passwordTooShort);
      return;
    }

    setSubmitting(true);
    // La credenziale e il profilo partner sono due cose diverse: qui nasce
    // la prima, la riga in partner_accounts subito dopo. È quella riga il
    // cancello del portale, protetta da RLS.
    const { data, error } = await supabase.auth.signUp({ email, password });

    if (error) {
      const m = error.message.toLowerCase();
      if (m.includes('already registered') || m.includes('already exists')) {
        // Niente vicolo cieco: il modulo si trasforma e chiede la password
        // dell'account esistente, tenendo nome, cognome e consensi.
        setExistingAccount(true);
        setPassword('');
      }
      setError(authErrorMessage(error.message, d));
    } else if (!data.session) {
      // Nessuna sessione = il progetto richiede la conferma via email. Il
      // profilo lo creerà PartnerOnboarding al primo accesso: senza sessione
      // le RLS rifiuterebbero comunque la scrittura.
      setCheckEmail(true);
    } else if (data.user) {
      const { error: profileError } = await createPartnerProfile(
        data.user.id,
        { firstName, lastName, marketing },
        locale
      );
      if (profileError) setError(authErrorMessage(profileError, d));
    }
    setSubmitting(false);
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold text-gray-900">{d.login.title}</h1>
          <p className="mt-1 text-sm text-gray-500">
            {isSignUp ? d.login.signUpSubtitle : d.login.subtitle}
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          {checkEmail ? (
            <p className="text-sm text-gray-700">{d.login.checkEmail}</p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {isSignUp && (
                <>
                  <p className="text-sm text-gray-500">{d.login.signUpIntro}</p>
                  <div>
                    <label htmlFor="firstName" className={labelClass}>
                      {d.login.firstName}
                    </label>
                    <input
                      id="firstName"
                      type="text"
                      required
                      autoComplete="given-name"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label htmlFor="lastName" className={labelClass}>
                      {d.login.lastName}
                    </label>
                    <input
                      id="lastName"
                      type="text"
                      required
                      autoComplete="family-name"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                </>
              )}

              <div>
                <label htmlFor="email" className={labelClass}>
                  {d.login.email}
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  disabled={existingAccount}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`${inputClass} disabled:bg-gray-50 disabled:text-gray-500`}
                />
              </div>
              <div>
                <label htmlFor="password" className={labelClass}>
                  {existingAccount ? d.login.existingPassword : d.login.password}
                </label>
                <input
                  id="password"
                  type="password"
                  required
                  autoComplete={isSignUp && !existingAccount ? 'new-password' : 'current-password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={inputClass}
                />
                {isSignUp && !existingAccount && (
                  <p className="mt-1 text-xs text-gray-500">{d.login.passwordHint}</p>
                )}
                {/* Anche nel percorso "questa email ce l'ha già": lì si chiede
                    la password di un account AllergiApp che si può benissimo
                    non ricordare, ed era l'unico punto del portale senza
                    nessuna via d'uscita. */}
                {(!isSignUp || existingAccount) && (
                  <button
                    type="button"
                    onClick={handleForgot}
                    disabled={submitting}
                    className="mt-1.5 text-xs font-medium text-gray-500 underline underline-offset-2 transition-colors hover:text-gray-900 disabled:opacity-50"
                  >
                    {d.login.forgot}
                  </button>
                )}
              </div>

              {isSignUp && (
                // TODO: condizioni e informativa diventano link quando le
                // pagine esisteranno (lavoro legale prima del lancio vero).
                <div className="space-y-3 pt-1">
                  <label className="flex gap-2.5 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={terms}
                      onChange={(e) => setTerms(e.target.checked)}
                      className="mt-0.5 h-4 w-4 shrink-0 accent-gray-900"
                    />
                    <span>{d.login.terms}</span>
                  </label>
                  <label className="flex gap-2.5 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={marketing}
                      onChange={(e) => setMarketing(e.target.checked)}
                      className="mt-0.5 h-4 w-4 shrink-0 accent-gray-900"
                    />
                    <span>{d.login.marketing}</span>
                  </label>
                </div>
              )}

              {recovery && (
                <p className="rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-600">{recovery}</p>
              )}
              {error && <p className="text-sm text-red-600">{error}</p>}

              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-gray-700 disabled:opacity-50"
              >
                {!isSignUp
                  ? d.login.signIn
                  : existingAccount
                  ? d.login.continueExisting
                  : d.login.signUp}
              </button>
            </form>
          )}
        </div>

        {!checkEmail && (
          <p className="mt-4 text-center text-sm text-gray-500">
            {isSignUp ? d.login.haveAccount : d.login.noAccount}{' '}
            <button
              onClick={() => {
                setMode(isSignUp ? 'signIn' : 'signUp');
                setError(null);
                setRecovery(null);
                setExistingAccount(false);
              }}
              className="font-medium text-gray-900 underline"
            >
              {isSignUp ? d.login.signInCta : d.login.signUpCta}
            </button>
          </p>
        )}

        <div className="mt-8 flex justify-center">
          <LanguageSwitcher />
        </div>
      </div>
    </div>
  );
}
