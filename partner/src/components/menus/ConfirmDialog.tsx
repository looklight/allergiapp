'use client';

// La conferma di un'eliminazione, con il titolo e il corpo scritti da chi la
// apre. DeleteShowcaseDialog e DeleteDishDialog restano a sé perché ognuno
// mostra un riepilogo suo di cosa si perde; qui il riepilogo È il corpo, e i
// due punti in cui serve nei menù (il menù, la sezione) avrebbero prodotto
// due copie della stessa finestra.
import { useId } from 'react';
import { useI18n } from '@/lib/i18n';
import { useModal } from '@/lib/useModal';

export default function ConfirmDialog({
  title,
  body,
  subject,
  confirmLabel,
  onCancel,
  onConfirm,
}: {
  title: string;
  body: string;
  // Il nome della cosa che si sta eliminando, riquadrato: leggerlo prima di
  // premere è quello che distingue "elimino la sezione giusta" da "ne elimino
  // una a caso perché erano due bottoni identici"
  subject?: string;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const { d } = useI18n();
  const panel = useModal<HTMLDivElement>(onCancel);
  const titleId = useId();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onCancel}>
      <div className="backdrop-enter absolute inset-0 bg-black/40" />
      <div
        ref={panel}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="dialog-enter relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl outline-none"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id={titleId} className="text-lg font-semibold text-gray-900">
          {title}
        </h2>

        {subject !== undefined && (
          <div className="mt-3 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5">
            <p className="truncate text-sm font-medium text-gray-900">{subject}</p>
          </div>
        )}

        <p className="mt-3 text-sm text-gray-600">{body}</p>

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:text-gray-900"
          >
            {d.common.cancel}
          </button>
          <button
            onClick={onConfirm}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
