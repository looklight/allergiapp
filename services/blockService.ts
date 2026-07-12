import { supabase } from './supabase';
import { SupabaseAnalytics } from './supabaseAnalytics';
import { bumpFollowGraphVersion } from './followService';

// Cache modulo degli id bloccati: lista piccola, letta spesso (filtro liste
// recensioni). Keyata sull'utente per non sopravvivere a un cambio account.
let cacheOwnerId: string | null = null;
let blockedIdsCache: Set<string> | null = null;

export async function getBlockedIds(userId: string): Promise<Set<string>> {
  if (blockedIdsCache && cacheOwnerId === userId) return blockedIdsCache;
  // L'eq e' ridondante con la RLS own-rows (mig 075) ma la esplicita:
  // difesa in profondita' se la policy cambiasse.
  const { data, error } = await supabase
    .from('blocked_users')
    .select('blocked_id')
    .eq('blocker_id', userId);
  if (error) throw error;
  blockedIdsCache = new Set((data ?? []).map((r: any) => r.blocked_id));
  cacheOwnerId = userId;
  return blockedIdsCache;
}

export async function isBlocked(userId: string, targetId: string): Promise<boolean> {
  return (await getBlockedIds(userId)).has(targetId);
}

export async function block(userId: string, targetId: string): Promise<void> {
  // Il trigger on_block_insert rimuove i follow in entrambe le direzioni.
  const { error } = await supabase
    .from('blocked_users')
    .insert({ blocker_id: userId, blocked_id: targetId });
  if (error) throw error;
  if (blockedIdsCache && cacheOwnerId === userId) blockedIdsCache.add(targetId);
  // Il trigger DB rimuove i follow nei due sensi: il grafo e' cambiato.
  bumpFollowGraphVersion();
  SupabaseAnalytics.track('user_blocked', { target_id: targetId });
}

export async function unblock(userId: string, targetId: string): Promise<void> {
  const { error } = await supabase
    .from('blocked_users')
    .delete()
    .eq('blocker_id', userId)
    .eq('blocked_id', targetId);
  if (error) throw error;
  if (blockedIdsCache && cacheOwnerId === userId) blockedIdsCache.delete(targetId);
}

export const BlockService = {
  getBlockedIds,
  isBlocked,
  block,
  unblock,
};
