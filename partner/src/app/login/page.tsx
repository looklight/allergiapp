'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { useI18n } from '@/lib/i18n';
import { authErrorMessage, PARTNER_MIN_PASSWORD } from '@/lib/authErrors';
import { createPartnerProfile } from '@/lib/partnerProfile';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import Image from 'next/image';
import LoginPitch from '@/components/LoginPitch';

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
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-gray-50 px-4 sm:px-6 lg:px-8">
      {/* Il colore della pagina: due aloni sfumati, il verde del marchio in
          alto a sinistra e il beige del piattino in basso a destra. Sono
          decorazione pura — nessun testo ci sta sopra, quindi non tolgono
          contrasto a niente — e servono a non far sembrare la porta del
          portale un modulo sospeso nel grigio. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(55rem_38rem_at_10%_-15%,rgba(76,175,80,0.13),transparent_65%),radial-gradient(48rem_34rem_at_105%_115%,rgba(240,214,178,0.5),transparent_65%)]"
      />

      {/* Il marchio sta in cima alla PAGINA, non sopra la colonna di sinistra:
          è la testata del sito, e il suo posto è l'angolo in alto, allineato
          al bordo del contenuto. Prima viaggiava insieme alle due colonne, che
          sono centrate in verticale, e finiva sospeso a mezz'aria.
          Sta fuori dalle colonne anche per un'altra ragione: da telefono la
          pagina comincia col modulo, e senza questa riga si aprirebbe con un
          "Entra nel portale" che non dice di chi. */}
      <header className="relative mx-auto flex w-full max-w-6xl items-center justify-between gap-3 py-5 sm:py-6">
        <div className="flex items-center gap-3">
          <Image
            src="/icons/icon-192.png"
            alt=""
            width={44}
            height={44}
            priority
            className="h-11 w-11 rounded-2xl shadow-sm ring-1 ring-black/5"
          />
          <span className="text-base font-semibold tracking-tight text-gray-900">
            {d.common.appName}
          </span>
        </div>
        {/* La lingua sta qui, in un angolo: la si cambia una volta sola, e in
            fondo alla pagina chi arriva in inglese doveva prima scorrere tutto
            un modulo che non capiva */}
        <LanguageSwitcher compact />
      </header>
      {/* Il contenuto prende quello che resta dell'altezza e ci si centra: la
          testata resta in alto, il blocco al centro ottico della pagina.

          I due margini NON sono uguali fra loro, ed è apposta. Chi guarda non
          misura dal bordo invisibile della testata: misura dal logo in giù. Lo
          spazio che vede sopra è quindi il margine inferiore della testata PIÙ
          quello superiore di qui, mentre sotto c'è solo il margine inferiore.
          Perché i due vuoti si somiglino serve che valga
              margine-sotto-testata + pt = pb
          (20+20=40 da telefono, 24+24=48 da tablet in su). L'uguaglianza non
          dipende da quanto è alto il contenuto, quindi regge anche quando il
          modulo si allunga per l'iscrizione. */}
      <main className="relative mx-auto flex w-full max-w-6xl flex-1 items-center pt-5 pb-10 sm:pt-6 sm:pb-12">
        {/* Due colonne sullo schermo largo, una sola sul telefono — e le due
            disposizioni vogliono ordini opposti, per questo c'è
            flex-row-reverse e non semplicemente due blocchi scritti nell'altro
            verso.
            Sul largo: prima la presentazione, poi il modulo. Si legge da
            sinistra, e il perché entrare viene prima del come.
            Sul telefono: prima il modulo. Al portale si torna per accedere,
            una volta al mese, e chi torna non deve scorrersi la presentazione
            ogni volta per arrivare alle due caselle.
            Le due colonne sono centrate una sull'altra, non appese in alto:
            hanno altezze diverse (e la differenza cambia fra accesso e
            iscrizione), e allineate in cima quella più corta lascia sotto di
            sé un vuoto che sembra un errore di impaginazione. */}
        <div className="flex w-full flex-col items-center gap-10 lg:flex-row-reverse lg:items-center lg:gap-12">
          <div className="w-full max-w-sm">
            <div className="mb-5 text-center lg:text-left">
              <h1 className="text-xl font-semibold tracking-tight text-gray-900">
                {isSignUp ? d.login.signUpSubtitle : d.login.signInTitle}
              </h1>
              {/* In iscrizione questa riga sparisce: sotto, il riquadro apre
                  già dicendo cos'è il profilo partner, e due spiegazioni una
                  sull'altra allungano il modulo senza aggiungere niente */}
              {!isSignUp && <p className="mt-1 text-sm text-gray-500">{d.login.subtitle}</p>}
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-lg shadow-gray-900/5">
              {checkEmail ? (
                <p className="text-sm text-gray-700">{d.login.checkEmail}</p>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-3.5">
                  {isSignUp && (
                    <>
                      <p className="text-sm text-gray-500">{d.login.signUpIntro}</p>
                      {/* Nome e cognome sulla stessa riga: sono due parole
                          corte, stanno larghe anche sul telefono, e uno sotto
                          l'altro costavano una schermata di scorrimento a un
                          modulo che ne ha già abbastanza */}
                      <div className="grid grid-cols-2 gap-3">
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
                    {/* La regola sta NELL'etichetta e non sotto il campo: si
                        legge prima di scrivere invece che dopo, e non si porta
                        via una riga */}
                    <label htmlFor="password" className={labelClass}>
                      {existingAccount ? d.login.existingPassword : d.login.password}
                      {isSignUp && !existingAccount && (
                        <span className="font-normal text-gray-400"> · {d.login.passwordRule}</span>
                      )}
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
                    //
                    // In corpo minore: sono le condizioni, non il modulo. La
                    // casella resta della misura di prima, che quella è il
                    // bersaglio del dito.
                    <div className="space-y-2.5 pt-1">
                      <label className="flex gap-2.5 text-xs leading-relaxed text-gray-600">
                        <input
                          type="checkbox"
                          checked={terms}
                          onChange={(e) => setTerms(e.target.checked)}
                          className="mt-0.5 h-4 w-4 shrink-0 accent-gray-900"
                        />
                        <span>{d.login.terms}</span>
                      </label>
                      <label className="flex gap-2.5 text-xs leading-relaxed text-gray-600">
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
          </div>

          {/* Sul telefono è il blocco sotto, staccato da una riga; sul largo è
              la colonna di sinistra, e il filetto passa dall'alto al suo
              fianco destro — cioè sempre fra le due cose, dovunque siano
              finite. Il filetto sta in mezzo al corridoio davvero: 48px di
              respiro di qua (pr-12) e 48 di là (gap-12). */}
          <div className="w-full max-w-sm border-t border-gray-200 pt-10 lg:max-w-2xl lg:flex-1 lg:border-r lg:border-t-0 lg:pr-12 lg:pt-0">
            <LoginPitch />
          </div>
        </div>
      </main>
    </div>
  );
}
