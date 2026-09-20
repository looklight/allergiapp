'use client';

// L'ASSOCIAZIONE DI UN LOCALE AL SUO RISTORANTE SU ALLERGIAPP.
//
// Design in MONETIZATION.md «Associazione locale ↔ ristorante»; le regole
// stanno nel database (migration 721 e 723), non qui. Il portale non scrive
// mai le tabelle del collegamento: chiama le funzioni che controllano
// abbonamento, proprietà, P.IVA e ristoranti già presi, e ne traduce gli
// errori.
import { supabase } from './supabase';
import { currentUserId, reportError, useRemoteList } from './storage';
import type { Venue } from './venues';
import type { Stato } from '@/components/StatusPill';

// Chi tiene il ristorante, detto senza dire chi (nodo 2):
//   free   libero
//   yours  già associato a un tuo locale
//   taken  gestito da un altro account
export type Holder = 'free' | 'yours' | 'taken';

// La pagina pubblica di un ristorante dell'app: la stessa che l'app usa per
// condividerlo (services/shareRestaurant.ts), e che sul telefono apre l'app.
export function restaurantPageUrl(slug: string): string {
  return `https://allergiapp.com/r/${slug}`;
}

export type RestaurantHit = {
  id: string;
  name: string;
  address: string;
  city: string;
  countryCode: string;
  cuisines: string[];
  latitude: number;
  longitude: number;
  holder: Holder;
};

// Quanti risultati torna al massimo la ricerca: lo stesso `limit` della 723.
// Arrivati qui il proprio ristorante potrebbe essere rimasto fuori, e la
// pagina lo dice.
export const MAX_RESULTS = 20;

/**
 * Cerca fra i ristoranti di AllergiApp (723): ogni parola del nome nel nome,
 * ogni parola della città nella città o nell'indirizzo. La città si può
 * lasciare vuota. Torna null se la ricerca non ha risposto, per non
 * confondere un errore con «nessun risultato».
 */
export async function searchRestaurants(name: string, city: string): Promise<RestaurantHit[] | null> {
  const { data, error } = await supabase.rpc('partner_search_restaurants', {
    p_name: name,
    p_city: city || null,
  });
  if (error) {
    reportError('ricerca ristorante', error);
    return null;
  }
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  return (data ?? []).map((row: any) => ({
    id: row.id,
    name: row.name ?? '',
    address: row.address ?? '',
    city: row.city ?? '',
    countryCode: row.country_code ?? '',
    cuisines: row.cuisine_types ?? [],
    latitude: row.latitude,
    longitude: row.longitude,
    holder: row.holder,
  }));
}

// ------------------------------------------------------------------
// L'AZIENDA
//
// Il portale la legge e basta (721): la scrive la funzione sul server
// `partner-company`, che pulisce la P.IVA, la controlla e chiede a VIES.

// I quattro esiti della 721. Dal 19/09 (724) non decidono se si associa:
// si associa sempre, e la scheda si vede dopo il controllo del nostro team.
// L'esito di VIES gli serve per quel controllo; al ristoratore diciamo solo
// «verificata» o «da verificare».
export type VatStatus = 'vies_valid' | 'admin_verified' | 'vies_not_found' | 'unverified';

export function vatConfirmed(status: VatStatus): boolean {
  return status === 'vies_valid' || status === 'admin_verified';
}

export type Company = {
  id: string;
  countryCode: string;
  legalName: string;
  vatNumber: string;
  vatStatus: VatStatus;
};

async function loadCompanies(): Promise<Company[]> {
  // Solo le proprie: v. currentUserId (un admin vedrebbe quelle di tutti)
  const uid = await currentUserId();
  if (!uid) return [];
  const { data, error } = await supabase
    .from('partner_companies')
    .select('id, country_code, legal_name, vat_number, vat_status')
    .eq('owner_user_id', uid)
    .order('created_at', { ascending: true });
  reportError('lettura aziende', error);
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  return (data ?? []).map((row: any) => ({
    id: row.id,
    countryCode: row.country_code,
    legalName: row.legal_name,
    vatNumber: row.vat_number,
    vatStatus: row.vat_status,
  }));
}

export function useCompanies() {
  const { list: companies, reload } = useRemoteList<Company>('aziende', loadCompanies);
  return { companies, reload };
}

// Le risposte non riuscite arrivano come chiave (v. la funzione e la 721):
// la traduce la pagina. 'error' = qualcosa che il ristoratore non può
// correggere da sé.
export type Esito<T = true> = { ok: T } | { error: string };

/* eslint-disable @typescript-eslint/no-explicit-any */
async function chiaveErrore(error: any): Promise<string> {
  // Dalla funzione sul server il motivo sta nel corpo della risposta
  try {
    const body = await error?.context?.json?.();
    if (body?.error) return String(body.error);
  } catch {
    // corpo non leggibile: vale il messaggio
  }
  return String(error?.message ?? 'error');
}
/* eslint-enable @typescript-eslint/no-explicit-any */

/** Controlla e salva l'azienda (o ritrova quella che c'è già). */
export async function saveCompany(
  countryCode: string,
  legalName: string,
  vatNumber: string
): Promise<Esito<{ companyId: string; vatStatus: VatStatus }>> {
  const { data, error } = await supabase.functions.invoke('partner-company', {
    body: { country_code: countryCode, legal_name: legalName, vat_number: vatNumber },
  });
  if (error || !data?.company_id) {
    reportError('salvataggio azienda', error);
    return { error: await chiaveErrore(error) };
  }
  return { ok: { companyId: data.company_id, vatStatus: data.vat_status } };
}

// ------------------------------------------------------------------
// COLLEGARE E CHIEDERE
//
// Le funzioni della 721 rispondono con chiavi stabili (not_owner,
// company_unverified, restaurant_taken…): il messaggio d'errore È la chiave.

export async function linkRestaurant(
  venueId: string,
  restaurantId: string,
  companyId: string
): Promise<Esito> {
  const { error } = await supabase.rpc('partner_link_restaurant', {
    p_venue_id: venueId,
    p_restaurant_id: restaurantId,
    p_company_id: companyId,
  });
  if (error) {
    reportError('associazione ristorante', error);
    return { error: error.message };
  }
  return { ok: true };
}

export async function requestRestaurant(
  venueId: string,
  restaurantId: string,
  companyId: string,
  message: string
): Promise<Esito> {
  const { error } = await supabase.rpc('partner_request_restaurant', {
    p_venue_id: venueId,
    p_restaurant_id: restaurantId,
    p_company_id: companyId,
    p_message: message,
  });
  if (error) {
    reportError('richiesta ristorante', error);
    return { error: error.message };
  }
  return { ok: true };
}

// ------------------------------------------------------------------
// LO STATO DELLA SCHEDA DI UN LOCALE, in un posto solo.
//
// Home, pagina della scheda e Abbonamenti dicono la stessa cosa con parole e
// spazi diversi: la regola che la decide sta qui, così non possono
// contraddirsi. Rispecchia partner_card_visible() nel database (721, 724):
// la scheda si vede con collegamento attivo, visto del nostro team,
// abbonamento e almeno un piatto. L'ordine conta — si dice la cosa che
// blocca per prima, e quella che chiede un gesto al ristoratore prima di
// quelle che aspettano noi:
//   none       non associato
//   requested  richiesta al nostro team in attesa
//   rejected   l'ultima richiesta non è stata accolta
//   closed     l'associazione l'abbiamo chiusa noi (revocata o non
//              approvata): col motivo
//   suspended  sospesa dal nostro team (col motivo)
//   review     associata, in attesa del nostro visto
//   paused     messa in pausa dal ristoratore
//   expired    associata, ma l'abbonamento è finito
//   live       si vede nell'app
export type CardState =
  | 'none'
  | 'requested'
  | 'rejected'
  | 'closed'
  | 'suspended'
  | 'review'
  | 'paused'
  | 'expired'
  | 'live';

// Il colore del pallino per ogni stato della scheda: verde solo quando si
// vede nell'app, ambra quando si aspetta qualcosa (noi, o una richiesta),
// grigio quando tocca al ristoratore o non è ancora cominciata. Un posto
// solo: lo usano la home e la pagina della scheda, che devono dire la
// stessa cosa.
export const CARD_TONE: Record<CardState, Stato> = {
  none: 'todo',
  requested: 'draft',
  rejected: 'todo',
  closed: 'todo',
  suspended: 'draft',
  review: 'draft',
  paused: 'todo',
  expired: 'todo',
  live: 'ready',
};

export function cardState(venue: Venue, subscribed: boolean): CardState {
  if (venue.cardId === null) {
    if (venue.request?.status === 'pending') return 'requested';
    // closedByUs c'è solo se la chiusura è più recente dell'ultima richiesta
    if (venue.closedByUs) return 'closed';
    if (venue.request?.status === 'rejected') return 'rejected';
    return 'none';
  }
  if (venue.cardStatus === 'suspended') return 'suspended';
  if (!venue.cardReviewed) return 'review';
  if (venue.cardStatus === 'paused') return 'paused';
  if (!subscribed) return 'expired';
  return 'live';
}

// I gesti del ristoratore sul collegamento: funzioni della 721, che
// controllano da sé cosa si può fare in quale stato.
export async function setCardPaused(cardId: string, paused: boolean): Promise<Esito> {
  const { error } = await supabase.rpc('partner_set_card_paused', {
    p_card_id: cardId,
    p_paused: paused,
  });
  if (error) {
    reportError(paused ? 'pausa scheda' : 'riattivazione scheda', error);
    return { error: error.message };
  }
  return { ok: true };
}

export async function unlinkCard(cardId: string): Promise<Esito> {
  const { error } = await supabase.rpc('partner_unlink_card', { p_card_id: cardId });
  if (error) {
    reportError('scollegamento scheda', error);
    return { error: error.message };
  }
  return { ok: true };
}

// Ritirare la propria richiesta in attesa (726): da lì il locale è libero.
export async function withdrawRequest(requestId: string): Promise<Esito> {
  const { error } = await supabase.rpc('partner_withdraw_request', { p_request_id: requestId });
  if (error) {
    reportError('ritiro richiesta', error);
    return { error: error.message };
  }
  return { ok: true };
}

/**
 * Corregge un'azienda (19/09): la stessa funzione sul server, con l'id.
 * Cambiando P.IVA o paese le associazioni in corso di quell'azienda tornano
 * da approvare (726): la pagina lo dice prima di salvare.
 */
export async function updateCompany(
  companyId: string,
  countryCode: string,
  legalName: string,
  vatNumber: string
): Promise<Esito<{ companyId: string; vatStatus: VatStatus }>> {
  const { data, error } = await supabase.functions.invoke('partner-company', {
    body: { company_id: companyId, country_code: countryCode, legal_name: legalName, vat_number: vatNumber },
  });
  if (error || !data?.company_id) {
    reportError('modifica azienda', error);
    return { error: await chiaveErrore(error) };
  }
  return { ok: { companyId: data.company_id, vatStatus: data.vat_status } };
}
