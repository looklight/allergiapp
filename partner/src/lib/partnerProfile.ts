import type { Session } from '@supabase/supabase-js';

// Il profilo partner: cosa lo compone e come si riconosce.
//
// Oggi vive nei metadati dell'utente Supabase, perché le tabelle partner_*
// non esistono ancora. Con la migration 700 diventerà una riga in
// partner_accounts e cambieranno le due funzioni qui sotto, non i punti che
// le usano. V. MONETIZATION.md, sezione utenti/partner.

export interface PartnerProfileFields {
  firstName: string;
  lastName: string;
  marketing: boolean;
}

// Un solo posto in cui si decide cosa compone il profilo partner: lo usano
// sia la registrazione (credenziale nuova) sia la creazione del profilo su
// credenziale esistente, così i due percorsi non divergono.
export function partnerMetadata(fields: PartnerProfileFields) {
  return {
    account_type: 'partner',
    first_name: fields.firstName.trim(),
    last_name: fields.lastName.trim(),
    terms_accepted_at: new Date().toISOString(),
    marketing_consent: fields.marketing,
  };
}

// ATTENZIONE: è un cancello di PERCORSO, non di sicurezza — i metadati sono
// modificabili dal client. Il cancello vero sarà la riga in partner_accounts,
// protetta da RLS. Finché il portale non scrive dati veri la differenza non
// espone nulla, ma non costruirci sopra controlli di sicurezza.
export function hasPartnerProfile(session: Session | null): boolean {
  const meta = session?.user?.user_metadata;
  return Boolean(meta?.first_name && meta?.last_name);
}
