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
import { useSubscriptions, vale } from '@/lib/subscriptions';
import { updateCompany, useCompanies, vatConfirmed, type Company } from '@/lib/association';
import { countries, countryName } from '@/lib/countries';
import { useVenues } from '@/lib/venues';
import ProTag from '@/components/ProTag';
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
import { PageTitle } from '@/components/PageHeading';

const inputClass =
  'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none';
const labelClass = 'mb-1 block text-sm font-medium text-gray-700';
const cardClass = 'rounded-2xl border border-gray-200 bg-white p-5 shadow-sm';

export default function AccountPage() {
  const { session } = useAuth();
  const { d } = useI18n();
  const { subs } = useSubscriptions();
  const { companies, reload: rileggiAziende } = useCompanies();
  // Una modifica della P.IVA rimanda in verifica le associazioni (726): i
  // locali vanno riletti, o la home direbbe ancora «attiva».
  const { reload: rileggiLocali } = useVenues();
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
      <PageTitle className="mb-8 md:mb-10">{d.account.title}</PageTitle>

      <div className="max-w-xl space-y-4">
        {/* Chi sei. L'email sta qui dentro e non in un riquadro suo: è un dato
            anagrafico come gli altri, solo che non si cambia da qui — cambiarla
            vuol dire cambiare la credenziale, che è un'altra cosa. */}
        <form onSubmit={salvaProfilo} className={cardClass}>
          <p className="mb-1 text-sm font-medium text-gray-900">{d.account.profileTitle}</p>
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
          <p className="mb-1 text-sm font-medium text-gray-900">{d.account.passwordTitle}</p>
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
          <p className="mb-3 text-sm font-medium text-gray-900">{d.account.language}</p>
          <LanguageSwitcher />
        </div>

        {/* Il consenso marketing. Un interruttore che scrive subito, non un
            modulo da confermare: darlo è costato una casella spuntata, e
            toglierlo non può costare di più. */}
        <div className={cardClass}>
          <p className="mb-3 text-sm font-medium text-gray-900">{d.account.marketingTitle}</p>
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

        {/* LE AZIENDE (19/09): arrivano dal pagamento o si scrivono associando
            un locale, e qui si ritrovano e si correggono. La modifica
            ripassa dal controllo sul server (il ristoratore non scrive
            questa tabella, 721). */}
        <div className={cardClass}>
          <p className="mb-1 text-sm font-medium text-gray-900">{d.account.companiesTitle}</p>
          {companies && companies.length > 0 ? (
            <>
              <p className="mb-4 text-xs text-gray-500">{d.account.companiesHint}</p>
              <ul className="space-y-3">
                {companies.map((c) => (
                  <AziendaRiga
                    key={c.id}
                    c={c}
                    onSaved={() => {
                      rileggiAziende();
                      rileggiLocali();
                    }}
                  />
                ))}
              </ul>
            </>
          ) : (
            <p className="text-xs text-gray-500">{d.account.companiesEmpty}</p>
          )}
        </div>

        {/* Gli abbonamenti stanno qui dentro finché sono un tappo: una voce
            nella barra laterale prometteva una sezione, e dietro c'è una
            pagina che non fa ancora niente. */}
        <div className={cardClass}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="flex items-center gap-2 text-sm font-medium text-gray-900">
                {d.account.subsTitle}
                {/* Il distintivo ambra compare se ALMENO UN locale ha il piano:
                    qui si parla dell'account, non di un locale in particolare
                    — quale sia lo dice la pagina che si apre premendo. */}
                {(subs ?? []).some(vale) && <ProTag variant="active" />}
              </p>
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

// UN'AZIENDA, e la sua modifica sul posto (19/09). Ragione sociale, paese e
// P.IVA: gli stessi campi dell'associazione, e lo stesso controllo sul
// server. Se cambiano P.IVA o paese si dice PRIMA di salvare cosa succede
// (726): le associazioni di quell'azienda tornano in verifica.
function AziendaRiga({ c, onSaved }: { c: Company; onSaved: () => void }) {
  const { d, locale } = useI18n();
  const [aperta, setAperta] = useState(false);
  const [ragione, setRagione] = useState(c.legalName);
  const [paese, setPaese] = useState(c.countryCode);
  const [piva, setPiva] = useState(c.vatNumber);
  const [inCorso, setInCorso] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);

  // Confronto largo, come fa il server: spazi e maiuscole non contano
  const pulita = (v: string) => v.toUpperCase().replace(/[^A-Z0-9]/g, '');
  const identitaCambiata = paese !== c.countryCode || pulita(piva) !== c.vatNumber;

  function apri() {
    setRagione(c.legalName);
    setPaese(c.countryCode);
    setPiva(c.vatNumber);
    setErrore(null);
    setAperta(true);
  }

  async function salva(e: React.FormEvent) {
    e.preventDefault();
    setInCorso(true);
    setErrore(null);
    const esito = await updateCompany(c.id, paese, ragione.trim(), piva.trim());
    setInCorso(false);
    if ('error' in esito) {
      setErrore(esito.error);
      return;
    }
    setAperta(false);
    onSaved();
  }

  const messaggioErrore = (k: string) =>
    k === 'vat_invalid'
      ? d.link.errVat
      : k === 'name_invalid'
        ? d.link.errName
        : k === 'duplicate'
          ? d.account.companyErrDuplicate
          : d.link.errGeneric;

  if (!aperta) {
    return (
      <li className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
        <div className="min-w-0">
          <p className="text-sm text-gray-900">{c.legalName}</p>
          <p className="text-xs text-gray-500">
            {countryName(c.countryCode, locale)} · {c.vatNumber}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <span className="text-xs text-gray-500">
            {vatConfirmed(c.vatStatus) ? d.account.vatConfirmed : d.account.vatPending}
          </span>
          <button type="button" onClick={apri} className="text-xs font-medium text-gray-700 underline hover:text-gray-900">
            {d.account.companyEdit}
          </button>
        </div>
      </li>
    );
  }

  return (
    <li>
      <form onSubmit={salva} className="space-y-3 rounded-xl border border-gray-200 p-3">
        <div>
          <label className={labelClass}>{d.link.legalName}</label>
          <input value={ragione} onChange={(e) => setRagione(e.target.value)} maxLength={200} className={inputClass} />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className={labelClass}>{d.link.country}</label>
            <select value={paese} onChange={(e) => setPaese(e.target.value)} className={inputClass}>
              {countries(locale).map((p) => (
                <option key={p.code} value={p.code}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>{d.link.vatNumber}</label>
            <input value={piva} onChange={(e) => setPiva(e.target.value)} maxLength={30} className={inputClass} />
          </div>
        </div>
        {identitaCambiata && (
          <p className="rounded-lg bg-[#FDF3E3] px-3 py-2 text-xs text-[#7A5418]">{d.account.companyVatWarning}</p>
        )}
        {errore && <p className="text-sm text-[#C0392B]">{messaggioErrore(errore)}</p>}
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setAperta(false)}
            className="rounded-lg px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-900"
          >
            {d.common.cancel}
          </button>
          <button
            type="submit"
            disabled={inCorso || ragione.trim().length < 2 || piva.trim().length < 4}
            className="rounded-lg bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-40"
          >
            {inCorso ? d.link.submitting : d.account.companySave}
          </button>
        </div>
      </form>
    </li>
  );
}
