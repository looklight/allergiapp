import type { ReportReason } from '../types/restaurants';

export const REPORT_REASONS: { id: ReportReason; icon: string; labelKey: string }[] = [
  { id: 'closed', icon: '🔒', labelKey: 'restaurants.reportReasons.closed' },
  { id: 'incorrect_info', icon: '❌', labelKey: 'restaurants.reportReasons.incorrect_info' },
  { id: 'other', icon: '📝', labelKey: 'restaurants.reportReasons.other' },
];

// Include anche i motivi non più selezionabili, per mostrare le segnalazioni esistenti
const LEGACY_REASONS: { id: ReportReason; icon: string; labelKey: string }[] = [
  { id: 'hygiene', icon: '⚠️', labelKey: 'restaurants.reportReasons.hygiene' },
  { id: 'inappropriate', icon: '🚫', labelKey: 'restaurants.reportReasons.inappropriate' },
];

export const REPORT_REASON_MAP: Record<ReportReason, { icon: string; labelKey: string }> = Object.fromEntries(
  [...REPORT_REASONS, ...LEGACY_REASONS].map(r => [r.id, { icon: r.icon, labelKey: r.labelKey }])
) as Record<ReportReason, { icon: string; labelKey: string }>;
