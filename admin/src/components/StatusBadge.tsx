import { type ReportStatus, REPORT_STATUS_LABELS } from '@/lib/types';

const styles: Record<ReportStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  resolved: 'bg-green-100 text-green-800',
  dismissed: 'bg-gray-100 text-gray-800',
};

export default function StatusBadge({ status }: { status: ReportStatus }) {
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${styles[status]}`}>
      {REPORT_STATUS_LABELS[status]}
    </span>
  );
}
