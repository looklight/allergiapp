import type { ReportReason } from '../types/restaurants';

export const REPORT_REASONS: { id: ReportReason; icon: string; labelKey: string }[] = [
  { id: 'closed', icon: '🔒', labelKey: 'restaurants.reportReasons.closed' },
  { id: 'incorrect_info', icon: '❌', labelKey: 'restaurants.reportReasons.incorrect_info' },
  { id: 'hygiene', icon: '⚠️', labelKey: 'restaurants.reportReasons.hygiene' },
  { id: 'inappropriate', icon: '🚫', labelKey: 'restaurants.reportReasons.inappropriate' },
  { id: 'other', icon: '📝', labelKey: 'restaurants.reportReasons.other' },
];

export const REPORT_REASON_MAP: Record<ReportReason, { icon: string; labelKey: string }> = Object.fromEntries(
  REPORT_REASONS.map(r => [r.id, { icon: r.icon, labelKey: r.labelKey }])
) as Record<ReportReason, { icon: string; labelKey: string }>;
