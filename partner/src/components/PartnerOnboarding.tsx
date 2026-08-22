'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useI18n } from '@/lib/i18n';
import type { Session } from '@supabase/supabase-js';

// Creazione del profilo partner per chi è già autenticato: serve a chi ha
// una credenziale AllergiApp (stessa email, un solo auth.users) e non può
// quindi passare dalla registrazione. È l'atto deliberato che rende partner
// una persona — nessuno lo diventa per il fatto di avere un account.
//
// Finché la 700 non è applicata i dati stanno nei metadati dell'utente:
// vero server-side, ma è un cancello di percorso, NON di sicurezza (i
// metadati sono modificabili dal client). Il cancello vero sarà la riga in
// partner_accounts. V. MONETIZATION.md, sezione utenti/partner.
export function hasPartnerProfile(session: Session | null): boolean {
  const meta = session?.user?.user_metadata;
  return Boolean(meta?.first_name && meta?.last_name);
}

const inputClass =
  'w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-gray-900 focus:outline-none';
const labelClass = 'mb-1 block text-sm font-medium text-gray-700';

export default function PartnerOnboarding({ session }: { session: Session }) {
  const { d } = useI18n();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [terms, setTerms] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!terms) {
      setError(d.login.termsRequired);
      return;
    }

    setSubmitting(true);
    const { error } = await supabase.auth.updateUser({
      data: {
        account_type: 'partner',
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        terms_accepted_at: new Date().toISOString(),
        marketing_consent: marketing,
      },
    });
    // updateUser emette USER_UPDATED: la sessione si aggiorna da sola e il
    // guard lascia passare, senza ricaricare la pagina.
    if (error) setError(error.message);
    setSubmitting(false);
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold text-gray-900">{d.onboarding.title}</h1>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-4">
            <p className="text-sm text-gray-500">{d.onboarding.intro}</p>
            <p className="text-sm text-gray-500">
              {d.onboarding.signedInAs}{' '}
              <span className="font-medium text-gray-900">{session.user.email}</span>
            </p>

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

            {/* TODO: link a condizioni e informativa quando le pagine esisteranno */}
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

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-gray-700 disabled:opacity-50"
            >
              {submitting ? d.onboarding.submitting : d.onboarding.submit}
            </button>
          </form>
        </div>

        <p className="mt-4 text-center text-sm text-gray-500">
          {d.onboarding.wrongAccount}{' '}
          <button
            onClick={() => supabase.auth.signOut()}
            className="font-medium text-gray-900 underline"
          >
            {d.common.signOut}
          </button>
        </p>
      </div>
    </div>
  );
}
