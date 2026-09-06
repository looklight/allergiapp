'use client';

import { useI18n } from '@/lib/i18n';
import { URL_CONDIZIONI, URL_INFORMATIVA } from '@/lib/legal';

// La frase accanto alla casella d'accettazione, con i due link veri.
//
// Sta in un componente e non copiata due volte perché i posti che la mostrano
// sono due — la registrazione e l'onboarding di chi ha già una credenziale —
// e una casella che dice "accetto" deve dire la stessa cosa in tutt'e due.
//
// I documenti vivono sul sito (branch `landing`), non qui: si aprono in una
// scheda nuova, altrimenti chi va a leggerli perde il modulo compilato.

export default function TermsConsentText() {
  const { d } = useI18n();
  const t = d.login.terms;
  const linkClass = 'underline underline-offset-2 hover:text-gray-900';

  return (
    <span>
      {t.pre}
      <a href={URL_CONDIZIONI} target="_blank" rel="noopener noreferrer" className={linkClass}>
        {t.termsLink}
      </a>
      {t.mid}
      <a href={URL_INFORMATIVA} target="_blank" rel="noopener noreferrer" className={linkClass}>
        {t.privacyLink}
      </a>
      {t.end}
    </span>
  );
}
