// Le recensioni del ristorante collegato e le risposte del ristoratore
// (migration 733). Tutto passa dalle funzioni del database: la regola
// «si risponde solo con abbonamento e collegamento approvato» sta lì, qui
// si legge soltanto `canReply` per decidere cosa mostrare.
import { supabase } from './supabase';
import { vale, abbonamentoDi, type Subscription } from './subscriptions';
import { reportError } from './storage';
import type { Venue } from './venues';
import type { Esito } from './association';

export const REPLY_MAX = 1000;

export type Reply = {
  id: string;
  body: string;
  createdAt: string;
  updatedAt: string;
  removedAt: string | null;
  removedNote: string | null;
};

export type VenueReview = {
  id: string;
  rating: number;
  comment: string | null;
  allergens: string[];
  diets: string[];
  photos: { url: string; thumbnailUrl?: string }[];
  createdAt: string;
  updatedAt: string;
  // null anche per chi ha scelto l'anonimato: il nome non esce dal database
  author: string | null;
  anonymous: boolean;
  reply: Reply | null;
  canReply: boolean;
};

/**
 * La voce «Recensioni» c'è solo quando si può rispondere: stessa condizione
 * di `partner_can_reply` (733) — collegamento attivo o in pausa, visto del
 * nostro team, abbonamento che vale.
 */
export function canManageReviews(venue: Venue | null, subs: Subscription[] | null): boolean {
  if (!venue || !venue.cardId || !venue.cardReviewed) return false;
  if (venue.cardStatus !== 'active' && venue.cardStatus !== 'paused') return false;
  return vale(abbonamentoDi(subs, venue.id));
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export async function loadVenueReviews(venueId: string): Promise<VenueReview[] | null> {
  const { data, error } = await supabase.rpc('partner_venue_reviews', { p_venue_id: venueId });
  if (error) {
    reportError('lettura recensioni', error);
    return null;
  }
  return (data ?? []).map((r: any) => ({
    id: r.review_id,
    rating: r.rating ?? 0,
    comment: r.comment,
    allergens: r.allergens_snapshot ?? [],
    diets: r.dietary_snapshot ?? [],
    photos: Array.isArray(r.photos) ? r.photos : [],
    createdAt: r.review_created_at,
    updatedAt: r.review_updated_at,
    author: r.author_username,
    anonymous: r.author_is_anonymous ?? false,
    reply: r.reply_id
      ? {
          id: r.reply_id,
          body: r.reply_body,
          createdAt: r.reply_created_at,
          updatedAt: r.reply_updated_at,
          removedAt: r.reply_removed_at,
          removedNote: r.reply_removed_note,
        }
      : null,
    canReply: r.can_reply ?? false,
  }));
}

// La lingua della risposta è quella del browser (deciso 25/09): serve al
// «Traduci» dell'app, come la lingua delle recensioni.
function browserLanguage(): string | null {
  if (typeof navigator === 'undefined') return null;
  return navigator.language || null;
}

export async function saveReply(venueId: string, reviewId: string, body: string): Promise<Esito> {
  const { error } = await supabase.rpc('partner_save_review_reply', {
    p_venue_id: venueId,
    p_review_id: reviewId,
    p_body: body,
    p_language: browserLanguage(),
  });
  if (error) {
    reportError('salvataggio risposta', error);
    return { error: error.message };
  }
  return { ok: true };
}

export async function deleteReply(replyId: string): Promise<Esito> {
  const { error } = await supabase.rpc('partner_delete_review_reply', { p_reply_id: replyId });
  if (error) {
    reportError('cancellazione risposta', error);
    return { error: error.message };
  }
  return { ok: true };
}
