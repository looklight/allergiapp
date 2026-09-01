'use client';

// Conferma di eliminazione: come per i locali dice QUANTO si perde, e qui
// quello che conta è dove il piatto era acceso — cancellarlo dal catalogo lo
// toglie da tutte le schede insieme, e dai menù in cui l'avevi messo.
// L'eliminazione resta comunque annullabile dal toast in lista.
import { useId } from 'react';
import { useI18n } from '@/lib/i18n';
import { useModal } from '@/lib/useModal';
import type { Dish } from '@/lib/dishes';
import type { Venue } from '@/lib/venues';

export default function DeleteDishDialog({
  dish,
  venues,
  onCancel,
  onConfirm,
}: {
  dish: Dish;
  // i locali sulla cui scheda il piatto è acceso, non tutti quelli del partner
  venues: Venue[];
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const { d } = useI18n();
  const panel = useModal<HTMLDivElement>(onCancel);
  const titleId = useId();

  // Con uno o due locali i nomi ci stanno e dicono di più del numero
  const summary =
    venues.length === 0
      ? d.dishes.onNoListing
      : venues.length <= 2
        ? venues.map((s) => s.venueName.trim() || d.home.unnamed).join(' · ')
        : `${venues.length} ${d.dishes.listingCount}`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onCancel}
    >
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
        <h2 id={titleId} className="text-lg font-semibold text-gray-900">{d.dishes.deleteTitle}</h2>

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
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700"
          >
            {d.common.delete}
          </button>
        </div>
      </div>
    </div>
  );
}
