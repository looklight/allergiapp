/**
 * Risposte dei ristoratori alle recensioni (mig 733/734).
 *
 * Le scrive solo il ristoratore dal portale partner: qui si leggono e si
 * tiene il pallino "nuove risposte alle mie recensioni".
 * La visibilità (abbonamento, collegamento approvato, non rimossa) la decide
 * il database: se una risposta non arriva, non c'è niente da mostrare.
 *
 * Tutto fail-soft: una risposta che non si carica non deve mai rompere la
 * lista delle recensioni.
 */

import { supabase } from './supabase';
import type { ReviewReply } from './restaurant.types';

export async function getReviewReplies(reviewIds: string[]): Promise<Map<string, ReviewReply>> {
  const replies = new Map<string, ReviewReply>();
  if (reviewIds.length === 0) return replies;
  try {
    const { data, error } = await supabase.rpc('get_review_replies', { p_review_ids: reviewIds });
    if (error) throw error;
    for (const r of data ?? []) {
      replies.set(r.review_id, {
        id: r.id,
        body: r.body,
        language: r.language ?? null,
        created_at: r.created_at,
        venue_name: r.venue_name,
        venue_logo_url: r.venue_logo_url ?? null,
      });
    }
  } catch (error) {
    console.warn('[ReviewReplyService] getReviewReplies failed:', error);
  }
  return replies;
}

export async function countUnseenReviewReplies(): Promise<number> {
  try {
    const { data, error } = await supabase.rpc('count_unseen_review_replies');
    if (error) throw error;
    return typeof data === 'number' ? data : 0;
  } catch (error) {
    console.warn('[ReviewReplyService] countUnseen failed:', error);
    return 0;
  }
}

export async function markReviewRepliesSeen(): Promise<void> {
  const { error } = await supabase.rpc('mark_review_replies_seen');
  if (error) console.warn('[ReviewReplyService] markSeen failed:', error);
}
