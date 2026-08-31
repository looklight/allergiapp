'use client';

// Il pannello da cui si pescano i piatti del catalogo per metterli nel menù.
// A MAZZO e non uno per volta: comporre una carta vuol dire aggiungerne
// dodici di fila, e aprire e chiudere il pannello dodici volte è il genere di
// attrito che fa tornare al PDF (DIGITAL_MENU.md, Tema 7).
//
// I piatti già nel menù restano ELENCATI, spenti e con la loro etichetta: un
// catalogo che si accorcia mentre lo si guarda fa perdere il segno, e "dov'è
// finita la carbonara" è una domanda peggiore di una riga barrata.
import { useId, useState } from 'react';
import { fill, useI18n } from '@/lib/i18n';
import { useModal } from '@/lib/useModal';
import { dishThumb, type Dish } from '@/lib/dishes';

// Sotto questa soglia il catalogo si guarda tutto con un colpo d'occhio e la
// ricerca sarebbe un ingombro. Stessa soglia dell'editor della vetrina.
const SEARCH_FROM = 12;

export default function DishPicker({
  dishes,
  alreadyIn,
  sectionName,
  onAdd,
  onCreateNew,
  onClose,
}: {
  dishes: Dish[];
  // gli id già presenti nel menù, in qualunque sezione
  alreadyIn: string[];
  // il nome della sezione di destinazione; assente = fuori sezione
  sectionName?: string;
  onAdd: (dishIds: string[]) => void;
  // "non c'è, lo creo adesso": il momento in cui ci si accorge che manca un
  // piatto è mentre lo si cerca qui, non nel gestionale del catalogo
  onCreateNew: () => void;
  onClose: () => void;
}) {
  const { d } = useI18n();
  const panel = useModal<HTMLDivElement>(onClose);
  const titleId = useId();
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<string[]>([]);

  const search = query.trim().toLowerCase();
  const visibili = dishes.filter(
    (dish) => search === '' || dish.name.toLowerCase().includes(search)
  );
  const disponibili = dishes.filter((dish) => !alreadyIn.includes(dish.id));

  function toggle(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end overflow-hidden" onClick={onClose}>
      <div className="backdrop-enter absolute inset-0 bg-black/40" />
      <div
        ref={panel}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="panel-enter relative flex h-full w-full max-w-md flex-col overflow-hidden bg-white shadow-xl outline-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Tre fasce: intestazione ferma, corpo che scorre, piede fermo */}
        <div className="flex shrink-0 items-start justify-between gap-3 px-5 pb-4 pt-5">
          <div className="min-w-0">
            <h2 id={titleId} className="text-lg font-semibold text-gray-900">
              {d.menuEditor.pickerTitle}
            </h2>
            {/* Dove finiranno: con quattro sezioni aperte da quattro bottoni
                uguali, è l'unica cosa che distingue una finestra dall'altra */}
            <p className="mt-0.5 truncate text-xs text-gray-500">
              {sectionName === undefined
                ? d.menuEditor.pickerIntoLoose
                : fill(d.menuEditor.pickerInto, { section: sectionName })}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label={d.common.close}
            className="shrink-0 text-gray-400 transition-colors hover:text-gray-900"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        {dishes.length >= SEARCH_FROM && (
          <div className="shrink-0 px-5 pb-3">
            <div className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 focus-within:border-gray-900">
              <svg className="h-4 w-4 shrink-0 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <circle cx="11" cy="11" r="7" />
                <path d="M20 20l-3.5-3.5" />
              </svg>
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={d.menuEditor.pickerSearch}
                className="w-full bg-transparent py-2 text-sm focus:outline-none"
              />
            </div>
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-4">
          {dishes.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-300 p-6 text-center">
              <p className="text-sm font-medium text-gray-900">{d.menuEditor.pickerCatalogEmpty}</p>
              <p className="mt-1 text-sm text-gray-500">{d.menuEditor.pickerCatalogEmptyHint}</p>
              <button
                onClick={onCreateNew}
                className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-700"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M12 5v14M5 12h14" />
                </svg>
                {d.menuEditor.pickerCreateNew}
              </button>
            </div>
          ) : disponibili.length === 0 ? (
            <p className="py-6 text-center text-sm text-gray-500">{d.menuEditor.pickerAllIn}</p>
          ) : visibili.length === 0 ? (
            <p className="py-6 text-center text-sm text-gray-500">{d.menuEditor.pickerNoResults}</p>
          ) : (
            <ul className="space-y-1">
              {visibili.map((dish) => {
                const dentro = alreadyIn.includes(dish.id);
                const scelto = selected.includes(dish.id);
                return (
                  <li key={dish.id}>
                    <label
                      className={`flex items-center gap-3 rounded-xl px-2 py-2 ${
                        dentro ? 'opacity-50' : 'cursor-pointer hover:bg-gray-50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={scelto}
                        disabled={dentro}
                        onChange={() => toggle(dish.id)}
                        className="h-4 w-4 shrink-0 rounded border-gray-300 accent-[#4CAF50]"
                      />
                      {dishThumb(dish) ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={dishThumb(dish)}
                          alt=""
                          className="h-9 w-9 shrink-0 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="h-9 w-9 shrink-0 rounded-lg bg-gray-100" />
                      )}
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm text-gray-900">{dish.name}</span>
                        {dentro && (
                          <span className="block text-xs text-gray-400">
                            {d.menuEditor.pickerAlreadyIn}
                          </span>
                        )}
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-3 border-t border-gray-200 px-5 py-4">
          {/* A sinistra, staccato dai due bottoni della finestra: non è
              un'alternativa a "Aggiungi", è un'altra strada */}
          <button
            onClick={onCreateNew}
            className="mr-auto inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 transition-colors hover:text-gray-900"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
            {d.menuEditor.pickerCreateNew}
          </button>
          <button
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:text-gray-900"
          >
            {d.common.cancel}
          </button>
          <button
            onClick={() => onAdd(selected)}
            disabled={selected.length === 0}
            className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-700 disabled:opacity-40 disabled:hover:bg-gray-900"
          >
            {selected.length === 0
              ? d.menuEditor.pickerConfirmEmpty
              : fill(d.menuEditor.pickerConfirm, { count: selected.length })}
          </button>
        </div>
      </div>
    </div>
  );
}
