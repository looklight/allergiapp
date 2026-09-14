'use client';

// Il pulsante "···": raccoglie le azioni secondarie che da sole
// affollerebbero la riga accanto al pulsante principale (dashboard,
// richiesta dell'utente, 14/09). Si chiude da solo cliccando fuori, con Esc,
// o scegliendo una voce.
import { useEffect, useRef, useState } from 'react';

export interface VoceOverflow {
  label: string;
  // Un link esterno (si apre in una scheda nuova) oppure un'azione: mai
  // entrambi, e mai nessuno dei due — la voce deve poter fare qualcosa.
  href?: string;
  onSelect?: () => void;
}

export default function OverflowMenu({ etichetta, voci }: { etichetta: string; voci: VoceOverflow[] }) {
  const [aperto, setAperto] = useState(false);
  const contenitore = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!aperto) return;
    function fuori(e: MouseEvent) {
      if (!contenitore.current?.contains(e.target as Node)) setAperto(false);
    }
    function esc(e: KeyboardEvent) {
      if (e.key === 'Escape') setAperto(false);
    }
    document.addEventListener('mousedown', fuori);
    window.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', fuori);
      window.removeEventListener('keydown', esc);
    };
  }, [aperto]);

  return (
    <div ref={contenitore} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setAperto((a) => !a)}
        aria-haspopup="menu"
        aria-expanded={aperto}
        aria-label={etichetta}
        title={etichetta}
        className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-900"
      >
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <circle cx="12" cy="5" r="1.75" />
          <circle cx="12" cy="12" r="1.75" />
          <circle cx="12" cy="19" r="1.75" />
        </svg>
      </button>
      {aperto && (
        <div
          role="menu"
          className="absolute right-0 z-20 mt-1 min-w-[11rem] rounded-lg border border-gray-200 bg-white py-1 shadow-lg"
        >
          {voci.map((voce) =>
            voce.href !== undefined ? (
              <a
                key={voce.label}
                href={voce.href}
                target="_blank"
                rel="noopener noreferrer"
                role="menuitem"
                onClick={() => setAperto(false)}
                className="block px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                {voce.label}
              </a>
            ) : (
              <button
                key={voce.label}
                type="button"
                role="menuitem"
                onClick={() => {
                  setAperto(false);
                  voce.onSelect?.();
                }}
                className="block w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
              >
                {voce.label}
              </button>
            )
          )}
        </div>
      )}
    </div>
  );
}
