import type { ContentStatus } from '@/lib/types';

const styles: Record<ContentStatus, string> = {
  active: 'bg-green-100 text-green-800',
  pending: 'bg-yellow-100 text-yellow-800',
  removed: 'bg-red-100 text-red-800',
};

const labels: Record<ContentStatus, string> = {
  active: 'Attivo',
  pending: 'In attesa',
  removed: 'Rimosso',
};

export default function StatusBadge({ status }: { status: ContentStatus }) {
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}
