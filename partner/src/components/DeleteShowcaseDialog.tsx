'use client';

// Conferma di eliminazione: al posto di un confirm generico dice QUANTO si
// perde (i link di quella vetrina), così la scelta è informata. I piatti
// non si perdono: sono del catalogo, la vetrina teneva solo quali accendere.
// L'eliminazione resta comunque annullabile dal toast in lista.
import { useEffect } from 'react';
import { useI18n } from '@/lib/i18n';
import { countLinks, type Showcase } from '@/lib/showcases';

export default function DeleteShowcaseDialog({
  showcase,
  onCancel,
  onConfirm,
}: {
  showcase: Showcase;
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

  const dishes = showcase.dishIds.length;
  const links = countLinks(showcase.links);
  const summary =
    dishes === 0 && links === 0
      ? d.home.deleteEmpty
      : `${dishes} ${dishes === 1 ? d.home.dishOne : d.home.dishOther} · ${links} ${
          links === 1 ? d.home.linkOne : d.home.linkOther
        }`;

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
        <h2 className="text-lg font-semibold text-gray-900">{d.home.deleteTitle}</h2>

        <div className="mt-3 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5">
          <p className="truncate text-sm font-medium text-gray-900">
            {showcase.venueName.trim() || d.home.unnamed}
          </p>
          <p className="mt-0.5 text-xs text-gray-500">{summary}</p>
        </div>

        <p className="mt-3 text-sm text-gray-600">{d.home.deleteBody}</p>

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
