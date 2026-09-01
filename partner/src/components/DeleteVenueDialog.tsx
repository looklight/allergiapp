'use client';

// Conferma di eliminazione: al posto di un confirm generico dice QUANTO si
// perde, così la scelta è informata. I piatti non si perdono: sono del
// catalogo, il locale teneva solo quali accendere. I MENÙ invece se ne vanno
// con lui — il database li porta via in cascata — e sono il lavoro di un
// pomeriggio: si contano qui e si dicono prima, non dopo.
// L'eliminazione resta comunque annullabile dal toast in lista.
import { useId } from 'react';
import { useI18n } from '@/lib/i18n';
import { useModal } from '@/lib/useModal';
import { countLinks, type Venue } from '@/lib/venues';

export default function DeleteVenueDialog({
  venue,
  menus,
  onCancel,
  onConfirm,
}: {
  venue: Venue;
  // Quanti menù se ne vanno con lui. null = non ancora letti dal database, e
  // allora non si elimina: sapere cosa si perde è il senso di questa finestra,
  // e un attimo di attesa costa meno di una carta buttata via senza saperlo.
  menus: number | null;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const { d } = useI18n();
  const panel = useModal<HTMLDivElement>(onCancel);
  const titleId = useId();

  const dishes = venue.dishIds.length;
  const links = countLinks(venue.links);
  const summary =
    menus === null
      ? d.common.loading
      : dishes === 0 && links === 0 && menus === 0
      ? d.home.deleteEmpty
      : [
          `${dishes} ${dishes === 1 ? d.home.dishOne : d.home.dishOther}`,
          `${links} ${links === 1 ? d.home.linkOne : d.home.linkOther}`,
          // il menù compare nel riepilogo solo se c'è: è la cosa più cara da
          // rifare, e uno "0 menù" la sminuirebbe accanto alle altre
          ...(menus > 0 ? [`${menus} ${menus === 1 ? d.home.menuOne : d.home.menuOther}`] : []),
        ].join(' · ');

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
        <h2 id={titleId} className="text-lg font-semibold text-gray-900">{d.home.deleteTitle}</h2>

        <div className="mt-3 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5">
          <p className="truncate text-sm font-medium text-gray-900">
            {venue.venueName.trim() || d.home.unnamed}
          </p>
          <p className="mt-0.5 text-xs text-gray-500">{summary}</p>
        </div>

        <p className="mt-3 text-sm text-gray-600">
          {menus !== null && menus > 0 ? d.home.deleteBodyMenus : d.home.deleteBody}
        </p>

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:text-gray-900"
          >
            {d.common.cancel}
          </button>
          <button
            onClick={onConfirm}
            disabled={menus === null}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-40 disabled:hover:bg-red-600"
          >
            {d.common.delete}
          </button>
        </div>
      </div>
    </div>
  );
}
