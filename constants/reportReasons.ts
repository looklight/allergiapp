import type { ReportReason } from '../types/restaurants';

export const REPORT_REASONS: { id: ReportReason; icon: string; label: string }[] = [
  { id: 'closed', icon: '🔒', label: 'Chiuso definitivamente' },
  { id: 'incorrect_info', icon: '❌', label: 'Informazioni errate' },
  { id: 'hygiene', icon: '⚠️', label: 'Condizioni igieniche' },
  { id: 'inappropriate', icon: '🚫', label: 'Contenuto inappropriato' },
  { id: 'other', icon: '📝', label: 'Altro' },
];

export const REPORT_REASON_MAP: Record<ReportReason, { icon: string; label: string }> = Object.fromEntries(
  REPORT_REASONS.map(r => [r.id, { icon: r.icon, label: r.label }])
) as Record<ReportReason, { icon: string; label: string }>;
