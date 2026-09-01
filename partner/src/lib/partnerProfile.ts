'use client';

// Il profilo partner: l'entità "ristoratore", distinta dal profilo utente
// dell'app. Vive nella tabella partner_accounts (migration 700).
//
// È il cancello VERO del portale, non più di percorso: tutte le tabelle
// partner hanno la chiave esterna verso partner_accounts, quindi senza
// questa riga il database rifiuta locali e piatti — e la riga è protetta
// da RLS, quindi nessuno può fabbricarsene una per conto d'altri.
// Prima del 30/08 stava nei metadati dell'utente, che il client può
// riscriversi: andava bene finché non c'erano dati veri dietro.
import { createContext, useContext } from 'react';
import { supabase } from './supabase';

export interface PartnerProfileFields {
  firstName: string;
  lastName: string;
  marketing: boolean;
}

export interface PartnerProfile extends PartnerProfileFields {
  phone: string | null;
}

// Un solo posto in cui si decide cosa compone il profilo: lo usano sia la
// registrazione (credenziale nuova) sia la creazione su credenziale
// esistente, così i due percorsi non divergono.
export async function createPartnerProfile(
  userId: string,
  fields: PartnerProfileFields,
  language: string
): Promise<{ error: string | null }> {
  const now = new Date().toISOString();
  const { error } = await supabase.from('partner_accounts').insert({
    user_id: userId,
    first_name: fields.firstName.trim(),
    last_name: fields.lastName.trim(),
    preferred_language: language,
    terms_accepted_at: now,
    marketing_consent: fields.marketing,
    // la data del consenso ha senso solo se il consenso c'è
    marketing_consent_at: fields.marketing ? now : null,
  });

  // 23505 = riga già presente. Succede col doppio invio o rientrando su una
  // registrazione interrotta: il profilo c'è, che è quello che volevamo.
  if (error && error.code !== '23505') return { error: error.message };
  return { error: null };
}

// null = non ha un profilo partner.
//
// Il filtro sull'id è necessario, non ridondante: le RLS di partner_accounts
// hanno anche una policy per gli admin (`FOR ALL USING (is_admin())`), quindi
// un partner che è pure amministratore vedrebbe TUTTE le righe e maybeSingle
// fallirebbe appena esiste un secondo partner. Non fidarsi delle RLS per la
// FORMA di una query: quelle decidono cosa è permesso, non quante righe torni.
export async function loadPartnerProfile(userId: string): Promise<PartnerProfile | null> {
  const { data } = await supabase
    .from('partner_accounts')
    .select('first_name, last_name, phone, marketing_consent')
    .eq('user_id', userId)
    .maybeSingle();
  if (!data) return null;
  return {
    firstName: data.first_name,
    lastName: data.last_name,
    phone: data.phone,
    marketing: data.marketing_consent,
  };
}


// ------------------------------------------------------------------
// IL PROFILO A DISPOSIZIONE DELLE SCHERMATE
//
// L'AuthGuard il profilo lo legge già — è il cancello del portale — e finora
// ne teneva solo il sì/no. La home saluta per nome, e farle rifare la stessa
// interrogazione sarebbe una richiesta in più per un dato che è già in casa.
// Nessun caricamento qui dentro: chi entra è passato dal guard, quindi il
// profilo c'è per forza.
// ------------------------------------------------------------------
const PartnerProfileContext = createContext<PartnerProfile | null>(null);

export const PartnerProfileProvider = PartnerProfileContext.Provider;

export function usePartnerProfile(): PartnerProfile | null {
  return useContext(PartnerProfileContext);
}
