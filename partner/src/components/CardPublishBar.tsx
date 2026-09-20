'use client';

// «Pubblica / Annulla» della scheda AllergiApp (728, deciso con l'utente il
// 19/09). La bozza della scheda — link e piatti scelti — si salva da sola
// come sempre; l'app mostra solo la versione PUBBLICATA, che cambia qui.
// Stesso gesto del menù al tavolo (PublishBar), così il ristoratore lo
// riconosce: prepari, poi decidi tu quando va online.
//
// Sta nella riga fissa in cima alla scheda e ci compare solo quando c'è
// qualcosa da pubblicare: in quel momento è la cosa più urgente della
// pagina, e la riga «Associa il ristorante» le cede il posto finché non si
// è pubblicato o annullato.
//
// SOBRIA (richiesta dell'utente): due parole e due bottoni. Che senza
// piatti la scheda non compare lo dice la sezione dei piatti, dove si
// sceglie — non si ripete qui.
//
// Nome, foto e allergeni dei piatti NON passano da qui: l'app li legge dal
// catalogo, quindi una correzione di allergeni non aspetta questo bottone.
import { useState } from 'react';
import { useI18n } from '@/lib/i18n';
import type { Venue } from '@/lib/venues';

export default function CardPublishBar({
  venue,
  onPublish,
  onRevert,
}: {
  venue: Venue;
  onPublish: () => Promise<boolean>;
  onRevert: () => void;
}) {
  const { d } = useI18n();
  const [inCorso, setInCorso] = useState(false);
  const [fallita, setFallita] = useState(false);

  const mai = venue.published === null;

  async function pubblica() {
    setInCorso(true);
    setFallita(false);
    const ok = await onPublish();
    setInCorso(false);
    if (!ok) setFallita(true);
  }

  const messaggio = fallita ? d.editor.publishFailed : mai ? d.editor.publishNever : d.editor.publishPending;

  return (
    <>
      <p
        className={`min-w-0 flex-1 text-xs sm:text-sm ${fallita ? 'text-amber-800' : 'text-gray-600'}`}
      >
        {messaggio}
      </p>
      <div className="ml-auto flex shrink-0 items-center gap-2">
        {/* Annulla solo se c'è una versione a cui tornare */}
        {!mai && (
          <button
            onClick={() => {
              setFallita(false);
              onRevert();
            }}
            disabled={inCorso}
            className="rounded-lg px-3 py-1.5 text-sm font-medium text-gray-600 transition-colors hover:text-gray-900 disabled:opacity-40"
          >
            {d.editor.publishRevert}
          </button>
        )}
        <button
          onClick={() => void pubblica()}
          disabled={inCorso}
          className="rounded-lg bg-gray-900 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-gray-700 disabled:opacity-50"
        >
          {inCorso ? d.editor.publishing : d.editor.publish}
        </button>
      </div>
    </>
  );
}
