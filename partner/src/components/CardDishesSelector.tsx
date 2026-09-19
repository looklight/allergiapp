'use client';

// La scelta dei piatti per la scheda AllergiApp di un locale.
//
// TUTTO IL CATALOGO, COME CERCHI COL NOME, raggruppato per categoria
// (decisioni dell'utente, 15/09). Le righe con casella sono durate un giro:
// funzionavano, ma la fila di cerchi è più riconoscibile. Quello che le righe
// hanno portato è rimasto, ed è ciò che mancava alla griglia di prima: il
// "Seleziona tutti", la casella per categoria, il filtro "Solo scelti" — con
// ottanta piatti, senza, era un muro in cui scelti e no erano mescolati.
//
// I gesti sono quelli della composizione vera: "Seleziona tutti" per partire
// da tutto e togliere il resto, e un "tutti" per categoria — il caso tipico è
// "tutti i primi, niente dolci", che così sono due tocchi. Si salva a ogni
// tocco, come il resto della pagina, e l'anteprima accanto segue.
//
// RAGGRUPPATI NELL'ORDINE DELL'APP: senza categoria per primi, poi le
// categorie nell'ordine fisso del set. L'ordine sulla scheda non si sceglie a
// mano: in app l'utente filtra per i suoi allergeni e i piatti si riordinano
// comunque.
import { useState } from 'react';
import { fill, useI18n } from '@/lib/i18n';
import { dishThumb, type Dish } from '@/lib/dishes';
import { DISH_CATEGORIES, categoryName } from '@/lib/categories';

// Sotto questa soglia il catalogo si guarda tutto con un colpo d'occhio e la
// ricerca sarebbe un ingombro. Stessa soglia del resto del portale.
const SEARCH_FROM = 12;

// La casella a tre stati di un gruppo: piena, vuota, o a metà. Il terzo stato
// non si scrive in HTML, si imposta dal DOM.
function GroupCheckbox({
  checked,
  indeterminate,
  label,
  onChange,
}: {
  checked: boolean;
  indeterminate: boolean;
  label: string;
  onChange: () => void;
}) {
  return (
    <input
      type="checkbox"
      aria-label={label}
      checked={checked}
      ref={(el) => {
        if (el) el.indeterminate = indeterminate;
      }}
      onChange={onChange}
      className="h-4 w-4 shrink-0 cursor-pointer rounded border-gray-300 accent-[#4CAF50]"
    />
  );
}

export default function CardDishesSelector({
  catalog,
  chosen,
  onChange,
}: {
  catalog: Dish[];
  // gli id dei piatti scelti per questa scheda
  chosen: string[];
  onChange: (dishIds: string[], on: boolean) => void;
}) {
  const { d, locale } = useI18n();
  const [query, setQuery] = useState('');
  // "Solo scelti" guarda i piatti scelti AL MOMENTO in cui lo si accende, non
  // quelli di ogni istante: deselezionandone uno il cerchio resta dov'è, spento,
  // invece di sparire sotto il dito — una lista che si accorcia mentre la si
  // guarda fa perdere il segno, e riprenderlo al volo diventerebbe
  // impossibile. Si ricalcola riaccendendo il filtro.
  const [soloScelti, setSoloScelti] = useState<string[] | null>(null);

  const search = query.trim().toLowerCase();
  const visibili = catalog.filter(
    (dish) =>
      (soloScelti === null || soloScelti.includes(dish.id)) &&
      (search === '' || dish.name.toLowerCase().includes(search))
  );
  const gruppi = [
    { code: '', name: d.dishes.noCategory, dishes: visibili.filter((x) => x.category === '') },
    ...DISH_CATEGORIES.map((cat) => ({
      code: cat.code,
      name: categoryName(cat.code, locale),
      dishes: visibili.filter((x) => x.category === cat.code),
    })),
  ].filter((g) => g.dishes.length > 0);
  // Un gruppo solo non è un raggruppamento: l'intestazione sarebbe un titolo
  // sopra tutta la lista, cioè rumore
  const raggruppa = gruppi.length > 1;

  // "Tutti" vale per quello che si VEDE: con una ricerca in corso seleziona i
  // piatti trovati, non l'intero catalogo alle spalle della ricerca
  const idsVisibili = visibili.map((x) => x.id);
  const tuttiVisibiliScelti = idsVisibili.length > 0 && idsVisibili.every((id) => chosen.includes(id));

  function tutti(ids: string[]) {
    const accendi = !ids.every((id) => chosen.includes(id));
    onChange(
      ids.filter((id) => chosen.includes(id) !== accendi),
      accendi
    );
  }

  if (catalog.length === 0) return null;

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-2">
        <p className="text-xs text-gray-500">
          {fill(d.editor.dishesOn, { on: chosen.filter((id) => catalog.some((x) => x.id === id)).length, total: catalog.length })}
        </p>
        {/* Tutti / Solo scelti: due bottoni appaiati, uno acceso */}
        <div className="ml-auto inline-flex rounded-lg border border-gray-300 p-0.5 text-xs font-medium" role="group">
          {[
            { acceso: soloScelti === null, label: d.editor.dishesFilterAll, onClick: () => setSoloScelti(null) },
            { acceso: soloScelti !== null, label: d.editor.dishesFilterChosen, onClick: () => setSoloScelti([...chosen]) },
          ].map(({ acceso, label, onClick }) => (
            <button
              key={label}
              type="button"
              aria-pressed={acceso}
              onClick={onClick}
              className={`rounded-md px-2.5 py-1 transition-colors ${
                acceso ? 'bg-gray-900 text-white' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {catalog.length > SEARCH_FROM && (
        <div className="mb-3 flex items-center gap-2 rounded-lg border border-gray-300 px-3 focus-within:border-gray-900">
          <svg className="h-4 w-4 shrink-0 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-3.5-3.5" />
          </svg>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={d.dishes.searchPlaceholder}
            className="w-full bg-transparent py-2 text-sm focus:outline-none"
          />
        </div>
      )}

      {visibili.length === 0 ? (
        <p className="py-6 text-center text-sm text-gray-500">
          {soloScelti !== null && search === '' ? d.editor.dishesNoneChosen : d.dishes.noResults}
        </p>
      ) : (
        <>
          {/* Seleziona tutti: la stessa casella delle categorie qui sotto, in
              colonna con loro, così si legge come "la casella di tutto" */}
          <label className="flex cursor-pointer items-center gap-3 border-b border-gray-100 px-2 pb-2.5 text-sm font-medium text-gray-900">
            <GroupCheckbox
              checked={tuttiVisibiliScelti}
              indeterminate={!tuttiVisibiliScelti && idsVisibili.some((id) => chosen.includes(id))}
              label={d.editor.dishesSelectAll}
              onChange={() => tutti(idsVisibili)}
            />
            {tuttiVisibiliScelti ? d.editor.dishesDeselectAll : d.editor.dishesSelectAll}
          </label>

          <div className="mt-2 space-y-4">
            {gruppi.map((gruppo) => {
              const ids = gruppo.dishes.map((x) => x.id);
              const scelti = ids.filter((id) => chosen.includes(id)).length;
              return (
                <div key={gruppo.code}>
                  {raggruppa && (
                    <label className="flex cursor-pointer items-center gap-3 px-2 py-1.5">
                      <GroupCheckbox
                        checked={scelti === ids.length}
                        indeterminate={scelti > 0 && scelti < ids.length}
                        label={gruppo.name}
                        onChange={() => tutti(ids)}
                      />
                      <span className="text-[11px] font-medium uppercase tracking-wide text-gray-500">
                        {gruppo.name}
                      </span>
                      <span className="text-[11px] text-gray-400">
                        {scelti}/{ids.length}
                      </span>
                    </label>
                  )}
                  {/* I PIATTI COME CERCHI COL NOME SOTTO, in fila (richiesta
                      dell'utente, 15/09): la stessa forma con cui la home e
                      l'app li mostrano, quindi si riconoscono a colpo d'occhio.
                      Si seleziona come con una casella — un tocco accende, uno
                      spegne — e il segno verde in basso dice lo stato. */}
                  <div className="grid grid-cols-[repeat(auto-fill,minmax(84px,1fr))] gap-x-2 gap-y-3 px-2 pt-1">
                    {gruppo.dishes.map((dish) => {
                      const scelto = chosen.includes(dish.id);
                      const nome = dish.name.trim();
                      const foto = dishThumb(dish);
                      return (
                        <button
                          key={dish.id}
                          type="button"
                          role="checkbox"
                          aria-checked={scelto}
                          onClick={() => onChange([dish.id], !scelto)}
                          title={nome}
                          className="group flex min-w-0 flex-col items-center gap-1.5 rounded-xl py-1 focus-visible:outline-2 focus-visible:outline-gray-900"
                        >
                          <span className="relative block">
                            {/* Non scelto: foto smorzata e in grigio. Si legge
                                senza etichette, scorrendo la fila. */}
                            <span
                              className={`flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border border-gray-200 bg-white transition ${
                                scelto ? '' : 'opacity-45 grayscale group-hover:opacity-70'
                              }`}
                            >
                              {foto !== '' ? (
                                // eslint-disable-next-line @next/next/no-img-element -- foto del partner: next/image non le ottimizzerebbe
                                <img src={foto} alt="" loading="lazy" className="h-full w-full object-cover" />
                              ) : (
                                // Senza foto l'iniziale, come nella home: un cerchio
                                // vuoto sembrerebbe un'immagine non arrivata
                                <span className="text-lg font-medium text-gray-400">
                                  {nome === '' ? '·' : nome.charAt(0).toUpperCase()}
                                </span>
                              )}
                            </span>
                            <span
                              className={`absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white transition-colors ${
                                scelto ? 'bg-[#4CAF50] text-white' : 'bg-gray-200 text-transparent'
                              }`}
                              aria-hidden="true"
                            >
                              <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M5 12.5l4.5 4.5L19 7" />
                              </svg>
                            </span>
                          </span>
                          {/* Il nome scelto passa in grassetto, che è più
                              largo: un nome al limite della riga («Tagliata di
                              manzo») andava a capo solo da scelto e spostava
                              la griglia. Una copia invisibile in grassetto
                              sotto quella vera tiene sempre la misura più
                              larga, così il nome va a capo nello stesso punto
                              da acceso e da spento. */}
                          <span className="grid w-full text-center text-xs leading-tight">
                            <span aria-hidden="true" className="invisible col-start-1 row-start-1 line-clamp-2 font-medium">
                              {nome === '' ? d.dashboard.dishUnnamed : nome}
                            </span>
                            <span
                              className={`col-start-1 row-start-1 line-clamp-2 transition-colors ${
                                scelto ? 'font-medium text-gray-900' : 'text-gray-400 group-hover:text-gray-600'
                              }`}
                            >
                              {nome === '' ? d.dashboard.dishUnnamed : nome}
                            </span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
