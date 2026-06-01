import { type ReportStatus, REPORT_STATUS_LABELS } from '@/lib/types';

const styles: Record<ReportStatus, string> = {
  pending: 'bg-warning-soft text-warning-soft-foreground',
  resolved: 'bg-success-soft text-success-soft-foreground',
  dismissed: 'bg-muted text-foreground',
};

export default function StatusBadge({ status }: { status: ReportStatus }) {
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${styles[status]}`}>
      {REPORT_STATUS_LABELS[status]}
    </span>
  );
}
