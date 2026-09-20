'use client';

// L'ABBONAMENTO DI UN LOCALE.
//
// Qui si LEGGE soltanto: le righe le scrive il webhook di Stripe (provenienza
// 'stripe') o l'admin (provenienza 'manual'). Il portale non ha nessuna via
// per scriverle — e non per delicatezza: se l'avesse, un ristoratore potrebbe
// regalarsi l'abbonamento chiamando il database col proprio token.
//
// Le due cose che si possono fare da qui passano da due funzioni su Supabase,
// perché hanno bisogno della chiave segreta di Stripe: aprire il pagamento e
// aprire il pannello del cliente (carta, disdetta, fatture).
import { supabase } from './supabase';
import { currentUserId, reportError, useRemoteList } from './storage';

export type Plan = 'monthly' | 'yearly';
export type SubscriptionStatus = 'active' | 'past_due' | 'canceled';
export type SubscriptionSource = 'stripe' | 'manual';

export type Subscription = {
  id: string;
  venueId: string;
  source: SubscriptionSource;
  plan: Plan | null;
  status: SubscriptionStatus;
  /** Fine del periodo pagato, o scadenza della concessione. null = senza scadenza. */
  endsAt: string | null;
  /** Disdetto ma pagato fino a `endsAt`. */
  cancelAtPeriodEnd: boolean;
};

/* eslint-disable @typescript-eslint/no-explicit-any */
async function loadSubscriptions(): Promise<Subscription[]> {
  // Solo i propri: v. currentUserId (un admin vedrebbe quelli di tutti)
  const uid = await currentUserId();
  if (!uid) return [];
  const { data, error } = await supabase
    .from('partner_subscriptions')
    .select('id, venue_id, source, plan, status, ends_at, cancel_at_period_end')
    .eq('owner_user_id', uid)
    .order('created_at', { ascending: false });
  reportError('lettura abbonamenti', error);

  return (data ?? []).map((row: any) => ({
    id: row.id,
    venueId: row.venue_id,
    source: row.source,
    plan: row.plan,
    status: row.status,
    endsAt: row.ends_at,
    cancelAtPeriodEnd: row.cancel_at_period_end ?? false,
  }));
}

/**
 * Vale oggi? Stessa regola di `venue_subscription_active()` nel database
 * (migration 716), e va tenuta uguale: col pagamento in ritardo l'abbonamento
 * resta valido finché Stripe ritenta.
 */
export function vale(sub: Subscription | null | undefined): boolean {
  if (!sub) return false;
  if (sub.status === 'canceled') return false;
  if (sub.endsAt && new Date(sub.endsAt) <= new Date()) return false;
  return true;
}

export function abbonamentoDi(
  subs: Subscription[] | null,
  venueId: string
): Subscription | null {
  if (!subs) return null;
  // Sul locale ce n'è al massimo uno aperto (indice parziale della 716); i
  // chiusi restano come storia e non devono vincere su quello vivo.
  return subs.find((s) => s.venueId === venueId && vale(s)) ?? null;
}

export function useSubscriptions() {
  const { list: subs, reload } = useRemoteList<Subscription>('abbonamenti', loadSubscriptions);
  return { subs, reload };
}

/**
 * Apre il pagamento su Stripe. Torna il messaggio d'errore, o null se sta
 * andando (in quel caso la pagina è già in viaggio verso Stripe).
 */
export async function apriPagamento(venueId: string, plan: Plan): Promise<string | null> {
  const { data, error } = await supabase.functions.invoke('stripe-checkout', {
    body: { venue_id: venueId, plan },
  });
  if (error) {
    reportError('apertura pagamento', error);
    return error.message ?? 'errore';
  }
  if (!data?.url) return 'errore';
  window.location.href = data.url;
  return null;
}

/** Pannello del cliente di Stripe: carta, disdetta, fatture. */
export async function apriPannelloCliente(): Promise<string | null> {
  const { data, error } = await supabase.functions.invoke('stripe-portal', { body: {} });
  if (error) {
    reportError('apertura pannello cliente', error);
    return error.message ?? 'errore';
  }
  if (!data?.url) return 'errore';
  window.location.href = data.url;
  return null;
}
