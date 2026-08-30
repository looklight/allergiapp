'use client';

// Conferma di eliminazione: come per le vetrine dice QUANTO si perde, e qui
// quello che conta è dove il piatto era acceso — cancellarlo dal catalogo lo
// toglie da tutte le vetrine insieme, non solo da quella che si sta guardando.
// L'eliminazione resta comunque annullabile dal toast in lista.
import { useEffect } from 'react';
import { useI18n } from '@/lib/i18n';
import type { Dish, Showcase } from '@/lib/draft';

export default function DeleteDishDialog({
  dish,
  showcases,
  onCancel,
  onConfirm,
}: {
  dish: Dish;
  // le vetrine in cui il piatto è acceso, non tutte quelle del partner
  showcases: Showcase[];
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const { d } = useI18n();

  // Esc chiude, come da qualsiasi finestra modale
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onCancel();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel]);

  // Con una o due vetrine i nomi ci stanno e dicono di più del numero
  const summary =
    showcases.length === 0
      ? d.dishes.inNoShowcase
      : showcases.length <= 2
        ? showcases.map((s) => s.venueName.trim() || d.home.unnamed).join(' · ')
        : `${showcases.length} ${d.dishes.showcaseCount}`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-gray-900">{d.dishes.deleteTitle}</h2>

        <div className="mt-3 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5">
          <p className="truncate text-sm font-medium text-gray-900">{dish.name}</p>
          <p className="mt-0.5 truncate text-xs text-gray-500">{summary}</p>
        </div>

        <p className="mt-3 text-sm text-gray-600">{d.dishes.deleteBody}</p>

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:text-gray-900"
          >
            {d.common.cancel}
          </button>
          <button
            onClick={onConfirm}
            autoFocus
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700"
          >
            {d.common.delete}
          </button>
        </div>
      </div>
    </div>
  );
}
