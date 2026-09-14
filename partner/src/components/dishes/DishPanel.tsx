'use client';

// Il pannello che entra da destra col piatto da creare o correggere.
//
// Parla SOLO del piatto. Fino al 15/09 teneva in fondo anche le caselle
// "Sulle schede", per accenderlo sulle schede AllergiApp dei locali: il
// catalogo però è la fonte dei dati, e dove un piatto compare lo decide chi
// lo usa — il menù nel suo editor, la scheda nella sua pagina (decisione
// dell'utente, 15/09). Un piatto nuovo quindi non finisce su nessuna scheda
// da solo.
import { useId } from 'react';
import { useI18n } from '@/lib/i18n';
import { useModal } from '@/lib/useModal';
import type { Dish } from '@/lib/dishes';
import DishForm from './DishForm';

export default function DishPanel({
  dish,
  onSave,
  onClose,
}: {
  // assente = piatto nuovo
  dish?: Dish;
  onSave: (data: Omit<Dish, 'id'>) => void;
  onClose: () => void;
}) {
  const { d } = useI18n();
  const panel = useModal<HTMLDivElement>(onClose);
  const titleId = useId();

  return (
    <div className="fixed inset-0 z-50 flex justify-end overflow-hidden" onClick={onClose}>
      <div className="backdrop-enter absolute inset-0 bg-black/40" />
      <div
        ref={panel}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="panel-enter relative flex h-full w-full max-w-[43rem] flex-col overflow-hidden bg-white shadow-xl outline-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Tre fasce: intestazione ferma, corpo che scorre, piede fermo. Il
            piede è fuori dalla parte che scorre, non appiccicato dentro: così
            non c'è nessun bordo sotto cui possa passare del testo. */}
        <div className="flex shrink-0 items-center justify-between gap-3 px-5 pb-4 pt-5 md:px-6 md:pt-6">
          <h2 id={titleId} className="text-lg font-semibold text-gray-900">
            {dish ? d.dishes.editTitle : d.dishes.newTitle}
          </h2>
          <button
            onClick={onClose}
            aria-label={d.common.close}
            className="text-gray-400 transition-colors hover:text-gray-900"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        <DishForm initial={dish} onSave={onSave} onCancel={onClose} />
      </div>
    </div>
  );
}
