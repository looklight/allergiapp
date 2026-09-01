'use client';

// Il pannello che entra da destra col piatto da creare o correggere. Tiene
// anche la scelta delle schede, che si applica solo al salvataggio: chiudere
// senza salvare non deve lasciare in giro un piatto acceso a metà.
//
// Le schede sono FACOLTATIVE: aprendo la maschera dal menù non c'entrano
// niente — lì il piatto sta per essere messo in una sezione, non acceso su
// una scheda — e mostrarle sarebbe una domanda fuori posto a cui rispondere
// mentre si sta facendo altro.
import { useId, useState } from 'react';
import { useI18n } from '@/lib/i18n';
import { useModal } from '@/lib/useModal';
import type { Dish } from '@/lib/dishes';
import type { Venue } from '@/lib/venues';
import DishForm from './DishForm';

export default function DishPanel({
  dish,
  venues,
  initialVenueIds,
  onSave,
  onClose,
}: {
  // assente = piatto nuovo
  dish?: Dish;
  // tutti i locali del partner, accesi o no; assenti = non si chiedono
  venues?: Venue[];
  initialVenueIds?: string[];
  onSave: (data: Omit<Dish, 'id'>, venueIds: string[]) => void;
  onClose: () => void;
}) {
  const { d } = useI18n();
  const [inVenues, setInVenues] = useState<string[]>(initialVenueIds ?? []);
  // Le caselle sono i posti in cui il piatto può DAVVERO comparire: senza
  // scheda AllergiApp non c'è niente da spuntare, e una casella che si
  // spunta senza che succeda nulla è peggio di una casella che non c'è
  const conScheda = (venues ?? []).filter((s) => s.cardId !== null);
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

        <DishForm initial={dish} onSave={(data) => onSave(data, inVenues)} onCancel={onClose}>
          {/* Dove appare il piatto: stesso stato del toggle sulla scheda */}
          {venues !== undefined && (
          <div className="border-t border-gray-200 pt-3">
            <label className="mb-1 block text-sm font-medium text-gray-700">
              {d.dishes.listingsLabel}
            </label>
            {conScheda.length === 0 ? (
              // Due vuoti diversi, e dirlo sbagliato manda dalla parte
              // opposta: senza locali se ne crea uno, con locali ma senza
              // scheda si associa il locale a un ristorante dell'app
              <p className="text-xs text-gray-500">
                {venues.length === 0 ? d.dishes.noVenues : d.dishes.needsCard}
              </p>
            ) : (
              <>
                <p className="mb-2 text-xs text-gray-500">{d.dishes.listingsHint}</p>
                <div className="space-y-1.5">
                  {conScheda.map((s) => (
                    <label key={s.id} className="flex items-center gap-2 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={inVenues.includes(s.id)}
                        onChange={(e) =>
                          setInVenues((prev) =>
                            e.target.checked ? [...prev, s.id] : prev.filter((id) => id !== s.id)
                          )
                        }
                        className="h-4 w-4 rounded border-gray-300 accent-[#4CAF50]"
                      />
                      <span className="truncate">{s.venueName.trim() || d.home.unnamed}</span>
                    </label>
                  ))}
                </div>
              </>
            )}
          </div>
          )}
        </DishForm>
      </div>
    </div>
  );
}
