import { supabase } from './supabase';
import type { Report, CreateReportInput } from './restaurant.types';

// ─── Reports ────────────────────────────────────────────────────────────────

export async function getReports(restaurantId: string): Promise<Report[]> {
  const { data, error } = await supabase
    .from('reports')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getUserReport(restaurantId: string, userId: string): Promise<Report | null> {
  const { data, error } = await supabase
    .from('reports')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .eq('user_id', userId)
    .eq('status', 'pending')
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function addReport(
  restaurantId: string,
  input: CreateReportInput,
  userId: string,
): Promise<Report | null> {
  try {
    const existing = await getUserReport(restaurantId, userId);

    if (existing) {
      const { data, error } = await supabase
        .from('reports')
        .update({
          reason: input.reason,
          details: input.details ?? null,
        })
        .eq('id', existing.id)
        .select()
        .single();
      if (error) throw error;
      return data;
    } else {
      const { data, error } = await supabase
        .from('reports')
        .insert({
          restaurant_id: restaurantId,
          user_id: userId,
          reason: input.reason,
          details: input.details ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    }
  } catch (error) {
    console.warn('[ReportService] Errore addReport:', error);
    return null;
  }
}

export const ReportService = {
  getReports,
  getUserReport,
  addReport,
};
