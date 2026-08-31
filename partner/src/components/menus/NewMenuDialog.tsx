'use client';

// La finestra che si apre su "Nuovo menù". Chiede il nome del locale — ma
// SOLO la prima volta, cioè finché il locale non ce l'ha.
//
// Perché prima di aprire l'editor: il nome è l'unica cosa senza la quale il
// menù non può esistere davvero (è l'intestazione che legge il cliente, ed è
// da lì che uscirà l'indirizzo pubblico), e non c'è nessun'altra fonte da cui
// prenderlo — chi non associa un ristorante non ha nessun nome da nessuna
// parte. Chiederlo qui vuol dire averlo prima ancora di disegnare la
// schermata; chiederlo dentro l'editor vuol dire scoprire di non averlo
// quando serve.
//
// Dal secondo menù in poi la finestra chiede solo il nome del menù, perché il
// locale il suo nome ce l'ha già.
import { useId, useState } from 'react';
import { useI18n } from '@/lib/i18n';
import { useModal } from '@/lib/useModal';

export default function NewMenuDialog({
  venueName,
  onCancel,
  onCreate,
}: {
  // il nome che il locale ha già; vuoto = non è ancora stato chiesto
  venueName: string;
  onCancel: () => void;
  // venueName torna indietro solo se è stato chiesto, altrimenti resta quello
  onCreate: (menuName: string, venueName: string) => void;
}) {
  const { d } = useI18n();
  const panel = useModal<HTMLDivElement>(onCancel);
  const titleId = useId();
  const venueId = useId();
  const menuId = useId();
  const serveNome = venueName.trim() === '';
  const [venue, setVenue] = useState('');
  const [menu, setMenu] = useState(d.menus.defaultName);

  const pronto = !serveNome || venue.trim() !== '';

  function conferma() {
    if (!pronto) return;
    onCreate(menu.trim() || d.menus.defaultName, serveNome ? venue.trim() : venueName);
  }

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
          {d.menus.create}
        </h2>

        {serveNome && (
          <div className="mt-4">
            <label htmlFor={venueId} className="mb-1 block text-sm font-medium text-gray-700">
              {d.menuEditor.venueNameLabel}
            </label>
            <input
              id={venueId}
              type="text"
              value={venue}
              autoFocus
              onChange={(e) => setVenue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && conferma()}
              placeholder={d.menus.venuePlaceholder}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none"
            />
            <p className="mt-1 text-xs text-gray-500">{d.menus.venueHint}</p>
          </div>
        )}

        <div className="mt-4">
          <label htmlFor={menuId} className="mb-1 block text-sm font-medium text-gray-700">
            {d.menus.menuNameLabel}
          </label>
          <input
            id={menuId}
            type="text"
            value={menu}
            autoFocus={!serveNome}
            onChange={(e) => setMenu(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && conferma()}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none"
          />
          <p className="mt-1 text-xs text-gray-500">{d.menus.menuNameHint}</p>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:text-gray-900"
          >
            {d.common.cancel}
          </button>
          <button
            onClick={conferma}
            disabled={!pronto}
            className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-700 disabled:opacity-40 disabled:hover:bg-gray-900"
          >
            {d.menus.create}
          </button>
        </div>
      </div>
    </div>
  );
}
