'use client';

// L'account del partner: chi sei, come si entra, cosa ti mandiamo.
//
// Finora era una pagina di sola lettura — l'email, la lingua, un rimando agli
// abbonamenti e il bottone per uscire — e tutto il resto non si poteva
// toccare da nessuna parte: né correggersi un refuso nel nome (che poi ti
// saluta in cima alla home ogni volta), né cambiare la password, né
// soprattutto RITIRARE il consenso marketing. L'ultimo non è una comodità:
// un consenso si revoca con la stessa facilità con cui si dà, e darlo era
// una casella nella registrazione.
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { useI18n } from '@/lib/i18n';
import { authErrorMessage, PARTNER_MIN_PASSWORD } from '@/lib/authErrors';
import {
  setMarketingConsent,
  updatePartnerProfile,
  usePartnerProfile,
  useUpdatePartnerProfile,
} from '@/lib/partnerProfile';
import LanguageSwitcher from '@/components/LanguageSwitcher';

const inputClass =
  'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none';
const labelClass = 'mb-1 block text-sm font-medium text-gray-700';
const cardClass = 'rounded-2xl border border-gray-200 bg-white p-5 shadow-sm';

export default function AccountPage() {
  const { session } = useAuth();
  const { d } = useI18n();
  const profile = usePartnerProfile();
  const aggiornaProfilo = useUpdatePartnerProfile();
  const userId = session?.user.id ?? null;

  const [firstName, setFirstName] = useState(profile?.firstName ?? '');
  const [lastName, setLastName] = useState(profile?.lastName ?? '');
  const [phone, setPhone] = useState(profile?.phone ?? '');
  const [profileSaved, setProfileSaved] = useState(false);

  const [password, setPassword] = useState('');
  const [repeat, setRepeat] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSaved, setPasswordSaved] = useState(false);
  const [changing, setChanging] = useState(false);
  // Ci si arriva col link della mail di recupero: va detto perché si è qui,
  // o si atterra su una pagina di impostazioni senza sapere cosa fare
  const [fromRecovery, setFromRecovery] = useState(false);

  // Il link del recupero password porta a /account?password=1. Il parametro
  // e non un'ancora perché Supabase si prende il FRAMMENTO dell'indirizzo per
  // il suo gettone (#access_token=…) e un nostro #password verrebbe
  // sovrascritto. Si legge l'indirizzo invece di useSearchParams, come in
  // /piatti e /menu: quello obbligherebbe a incartare la pagina in un
  // <Suspense> per la generazione statica, molto rumore per un parametro.
  const recuperoLetto = useRef(false);
  useEffect(() => {
    if (recuperoLetto.current) return;
    recuperoLetto.current = true;
    if (!new URLSearchParams(window.location.search).has('password')) return;
    // consumato subito: ricaricando la pagina non deve ricomparire l'avviso
    window.history.replaceState(null, '', '/account');
    setFromRecovery(true);
    document.getElementById('password')?.scrollIntoView({ block: 'start' });
  }, []);

  async function salvaProfilo(e: React.FormEvent) {
    e.preventDefault();
    if (!userId || !profile) return;
    setProfileSaved(false);
    // Lo stato condiviso si aggiorna subito, come ovunque nel portale: senza,
    // la home continuerebbe a salutarti col nome vecchio fino al ricaricamento
    aggiornaProfilo({ ...profile, firstName, lastName, phone: phone.trim() || null });
    await updatePartnerProfile(userId, { firstName, lastName, phone });
    setProfileSaved(true);
  }

  async function cambiaConsenso(consent: boolean) {
    if (!userId || !profile) return;
    aggiornaProfilo({ ...profile, marketing: consent });
    await setMarketingConsent(userId, consent);
  }

  async function cambiaPassword(e: React.FormEvent) {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSaved(false);
    if (password.length < PARTNER_MIN_PASSWORD) {
      setPasswordError(d.login.passwordTooShort);
      return;
    }
    // Il secondo campo esiste per questo: la password non si rilegge, e un
    // refuso qui vorrebbe dire scoprirlo al prossimo accesso, quando ormai
    // l'unica strada è il recupero via email
    if (password !== repeat) {
      setPasswordError(d.account.passwordMismatch);
      return;
    }
    setChanging(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setPasswordError(authErrorMessage(error.message, d));
    } else {
      setPassword('');
      setRepeat('');
      setPasswordSaved(true);
      setFromRecovery(false);
    }
    setChanging(false);
  }

  return (
    <div>
      <h1 className="mb-6 text-xl font-semibold md:text-2xl">{d.account.title}</h1>

      <div className="max-w-xl space-y-4">
        {/* Chi sei. L'email sta qui dentro e non in un riquadro suo: è un dato
            anagrafico come gli altri, solo che non si cambia da qui — cambiarla
            vuol dire cambiare la credenziale, che è un'altra cosa. */}
        <form onSubmit={salvaProfilo} className={cardClass}>
          <p className="mb-1 text-sm font-medium text-gray-700">{d.account.profileTitle}</p>
          <p className="mb-4 text-xs text-gray-500">{d.account.profileHint}</p>

          <div className="mb-3">
            <label className={labelClass}>{d.account.email}</label>
            <p className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-500">
              {session?.user.email}
            </p>
          </div>

          <div className="mb-3 grid gap-3 sm:grid-cols-2">
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
                onChange={(e) => {
                  setFirstName(e.target.value);
                  setProfileSaved(false);
                }}
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
                onChange={(e) => {
                  setLastName(e.target.value);
                  setProfileSaved(false);
                }}
                className={inputClass}
              />
            </div>
          </div>

          <div className="mb-4">
            <label htmlFor="phone" className={labelClass}>
              {d.account.phone}
            </label>
            <input
              id="phone"
              type="tel"
              autoComplete="tel"
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value);
                setProfileSaved(false);
              }}
              className={inputClass}
            />
            <p className="mt-1 text-xs text-gray-500">{d.account.phoneHint}</p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={firstName.trim() === '' || lastName.trim() === ''}
              className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-700 disabled:opacity-40"
            >
              {d.common.save}
            </button>
            {profileSaved && (
              <span className="text-xs text-[#2E7D32]">{d.account.profileSaved}</span>
            )}
          </div>
        </form>

        {/* La password. scroll-mt perché ci si atterra dal link del recupero,
            e finire col riquadro incollato al bordo superiore non fa capire
            dove si è arrivati. */}
        <form onSubmit={cambiaPassword} id="password" className={`scroll-mt-6 ${cardClass}`}>
          <p className="mb-1 text-sm font-medium text-gray-700">{d.account.passwordTitle}</p>
          {fromRecovery ? (
            <p className="mb-4 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
              {d.account.passwordFromRecovery}
            </p>
          ) : (
            <p className="mb-4 text-xs text-gray-500">{d.account.passwordHint}</p>
          )}

          <div className="mb-3 grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="newPassword" className={labelClass}>
                {d.account.passwordNew}
              </label>
              <input
                id="newPassword"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setPasswordSaved(false);
                  setPasswordError(null);
                }}
                className={inputClass}
              />
              <p className="mt-1 text-xs text-gray-500">{d.login.passwordHint}</p>
            </div>
            <div>
              <label htmlFor="repeatPassword" className={labelClass}>
                {d.account.passwordRepeat}
              </label>
              <input
                id="repeatPassword"
                type="password"
                autoComplete="new-password"
                value={repeat}
                onChange={(e) => {
                  setRepeat(e.target.value);
                  setPasswordSaved(false);
                  setPasswordError(null);
                }}
                className={inputClass}
              />
            </div>
          </div>

          {passwordError && <p className="mb-3 text-sm text-red-600">{passwordError}</p>}

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={changing || password === '' || repeat === ''}
              className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-700 disabled:opacity-40"
            >
              {d.account.passwordChange}
            </button>
            {passwordSaved && (
              <span className="text-xs text-[#2E7D32]">{d.account.passwordChanged}</span>
            )}
          </div>
        </form>

        <div className={cardClass}>
          <p className="mb-3 text-sm font-medium text-gray-700">{d.account.language}</p>
          <LanguageSwitcher />
        </div>

        {/* Il consenso marketing. Un interruttore che scrive subito, non un
            modulo da confermare: darlo è costato una casella spuntata, e
            toglierlo non può costare di più. */}
        <div className={cardClass}>
          <p className="mb-3 text-sm font-medium text-gray-700">{d.account.marketingTitle}</p>
          <label className="flex gap-2.5 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={profile?.marketing ?? false}
              onChange={(e) => void cambiaConsenso(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 accent-gray-900"
            />
            <span>{d.account.marketingLabel}</span>
          </label>
          <p className="mt-2 text-xs text-gray-500">{d.account.marketingHint}</p>
        </div>

        {/* Gli abbonamenti stanno qui dentro finché sono un tappo: una voce
            nella barra laterale prometteva una sezione, e dietro c'è una
            pagina che non fa ancora niente. */}
        <div className={cardClass}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-700">{d.account.subsTitle}</p>
              <p className="mt-0.5 text-xs text-gray-500">{d.account.subsHint}</p>
            </div>
            <Link
              href="/abbonamenti"
              className="shrink-0 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
            >
              {d.account.subsOpen}
            </Link>
          </div>
        </div>

        <button
          onClick={() => supabase.auth.signOut()}
          className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 sm:w-auto"
        >
          {d.common.signOut}
        </button>
      </div>
    </div>
  );
}
