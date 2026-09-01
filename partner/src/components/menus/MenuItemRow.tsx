'use client';

// Una riga della carta: il piatto com'è in catalogo, più le due sole cose che
// il MENÙ aggiunge — il prezzo e la posizione. Nome, foto e allergeni restano
// FATTI DEL PIATTO: qui non hanno un campo proprio (due verità sugli
// allergeni è esattamente il rischio che il prodotto esiste per evitare), ma
// la matita al passaggio apre lo stesso pannello del catalogo — corregge il
// piatto ovunque compaia, non uno che vale solo per questo menù.
import { useRef } from 'react';
import { fill, useI18n } from '@/lib/i18n';
import { dishThumb, type Dish } from '@/lib/dishes';
import type { MenuItem } from '@/lib/menus';
import PriceField from './PriceField';

export default function MenuItemRow({
  item,
  dish,
  currency,
  sections,
  sectionId,
  isFirst,
  isLast,
  onPrice,
  onHighlight,
  onHighlightNote,
  onEdit,
  onMove,
  onMoveToSection,
  onRemove,
  dragging,
  dropLine,
  onDragStart,
  onDragOverRow,
  onDropRow,
  onDragEnd,
}: {
  item: MenuItem;
  // il piatto del catalogo, se c'è ancora
  dish: Dish | undefined;
  currency: string;
  // tutte le destinazioni possibili, per la tendina "Sposta in"
  sections: { id: string | null; name: string }[];
  sectionId: string | null;
  isFirst: boolean;
  isLast: boolean;
  onPrice: (cents: number | null) => void;
  onHighlight: (highlighted: boolean) => void;
  onHighlightNote: (note: string) => void;
  onEdit: (dish: Dish) => void;
  onMove: (verso: -1 | 1) => void;
  onMoveToSection: (sectionId: string | null) => void;
  onRemove: () => void;
  // Trascinamento. Le FRECCE RESTANO e non sono un ripiego: il trascinamento
  // HTML5 col dito non funziona, e questo portale si usa dal telefono quanto
  // dal computer. Sono anche l'unico modo da tastiera.
  dragging: boolean;
  dropLine: boolean;
  onDragStart: () => void;
  onDragOverRow: (posizione: 'sopra' | 'sotto') => void;
  onDropRow: () => void;
  onDragEnd: () => void;
}) {
  const { d } = useI18n();
  const riga = useRef<HTMLLIElement>(null);

  // Un piatto eliminato dal catalogo mentre era nel menù: nel database la
  // riga sparisce per cascata, qui si può vedere per un istante. Meglio una
  // riga vuota che una schermata bianca.
  if (!dish) return null;

  const nome = dish.name.trim();

  return (
    <li
      ref={riga}
      onDragOver={(e) => {
        // Senza preventDefault il browser non considera questo un bersaglio
        // valido e il rilascio non arriva mai
        e.preventDefault();
        const box = e.currentTarget.getBoundingClientRect();
        onDragOverRow(e.clientY < box.top + box.height / 2 ? 'sopra' : 'sotto');
      }}
      onDrop={(e) => {
        e.preventDefault();
        onDropRow();
      }}
      className={`group relative flex items-center gap-3 rounded-xl px-2 py-1.5 hover:bg-gray-50 ${
        dragging ? 'opacity-40' : ''
      }`}
    >
      {/* Dove finirà. Sta sopra la riga sorvolata perché l'inserimento è
          sempre "prima di questa": la linea è la posizione, non un bordo. */}
      {dropLine && (
        <span className="pointer-events-none absolute inset-x-2 -top-px h-0.5 rounded-full bg-gray-900" />
      )}
      {/* Le frecce: si vedono al passaggio, ma restano sempre nel flusso —
          comparendo dal nulla sposterebbero il resto della riga sotto il
          puntatore. Su telefono, dove il passaggio non esiste, sono visibili. */}
      <div className="flex shrink-0 flex-col items-center opacity-100 transition-opacity md:opacity-0 md:group-focus-within:opacity-100 md:group-hover:opacity-100">
        {/* La maniglia è un elemento a sé e non tutta la riga: rendendo
            trascinabile il contenitore, selezionare il testo dentro al campo
            del prezzo comincerebbe un trascinamento invece di selezionare.
            Non prende il fuoco da tastiera (le frecce lo fanno già) e resta
            nascosta a chi legge con lo screen reader. */}
        <span
          draggable
          aria-hidden="true"
          onDragStart={(e) => {
            e.dataTransfer.effectAllowed = 'move';
            // Firefox non comincia nemmeno il trascinamento senza un dato
            e.dataTransfer.setData('text/plain', item.id);
            // L'immagine trascinata è la RIGA INTERA, non la maniglia: si sta
            // spostando un piatto, e vedersi dietro al puntatore un puntino
            // grigio non dice quale
            if (riga.current) e.dataTransfer.setDragImage(riga.current, 24, 20);
            onDragStart();
          }}
          onDragEnd={onDragEnd}
          className="mb-0.5 cursor-grab text-gray-300 transition-colors hover:text-gray-600 active:cursor-grabbing"
        >
          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="9" cy="6" r="1.6" />
            <circle cx="15" cy="6" r="1.6" />
            <circle cx="9" cy="12" r="1.6" />
            <circle cx="15" cy="12" r="1.6" />
            <circle cx="9" cy="18" r="1.6" />
            <circle cx="15" cy="18" r="1.6" />
          </svg>
        </span>
        <button
          onClick={() => onMove(-1)}
          disabled={isFirst}
          aria-label={d.menuEditor.moveUp}
          className="text-gray-400 transition-colors hover:text-gray-900 disabled:opacity-25 disabled:hover:text-gray-400"
        >
          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 15l6-6 6 6" />
          </svg>
        </button>
        <button
          onClick={() => onMove(1)}
          disabled={isLast}
          aria-label={d.menuEditor.moveDown}
          className="text-gray-400 transition-colors hover:text-gray-900 disabled:opacity-25 disabled:hover:text-gray-400"
        >
          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>
      </div>

      {dishThumb(dish) ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={dishThumb(dish)} alt="" className="h-9 w-9 shrink-0 rounded-lg object-cover" />
      ) : (
        <div className="h-9 w-9 shrink-0 rounded-lg bg-gray-100" />
      )}

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm text-gray-900">{nome}</p>
        {dish.description.trim() !== '' && (
          <p className="truncate text-xs text-gray-500">{dish.description}</p>
        )}
        {/* La nota compare solo se il piatto è evidenziato: è la stella che
            decide, non il testo. Sfondo ambra per restare agganciata visivamente
            alla stella che l'ha aperta, anche a riga non più a fuoco. */}
        {item.highlighted && (
          <input
            type="text"
            value={item.highlightNote}
            onChange={(e) => onHighlightNote(e.target.value)}
            placeholder={d.menuEditor.highlightNotePlaceholder}
            aria-label={fill(d.menuEditor.highlightNoteLabel, { dish: nome })}
            className="mt-0.5 w-full min-w-0 rounded border border-transparent bg-amber-50 px-1.5 py-0.5 text-xs text-amber-800 placeholder:text-amber-700/60 hover:border-amber-300 focus:border-amber-500 focus:outline-none"
          />
        )}
      </div>

      {/* Con una destinazione sola non c'è niente da scegliere.
          Come le frecce, si scopre al passaggio: a riposo una riga deve dire
          il piatto e il prezzo, che sono le due cose che si guardano
          scorrendo una carta di quaranta righe. La tendina mostra la sezione
          in cui la riga sta già, quindi ferma non è nemmeno un'informazione
          nuova — è la stessa che c'è scritta in cima al riquadro. */}
      {sections.length > 1 && (
        <select
          value={sectionId ?? ''}
          aria-label={d.menuEditor.moveToLabel}
          onChange={(e) => onMoveToSection(e.target.value === '' ? null : e.target.value)}
          className="hidden max-w-[9rem] shrink-0 truncate rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-xs text-gray-600 transition-opacity focus:border-gray-900 focus:outline-none sm:block md:opacity-0 md:group-focus-within:opacity-100 md:group-hover:opacity-100"
        >
          {sections.map((s) => (
            <option key={s.id ?? 'loose'} value={s.id ?? ''}>
              {s.name}
            </option>
          ))}
        </select>
      )}

      {/* La stella resta sempre visibile e non solo al passaggio, come il
          prezzo: dice se il piatto è in evidenza anche a schermata ferma,
          scorrendo la carta da lontano. */}
      <button
        onClick={() => onHighlight(!item.highlighted)}
        aria-pressed={item.highlighted}
        aria-label={item.highlighted ? d.menuEditor.highlightOff : d.menuEditor.highlightOn}
        title={item.highlighted ? d.menuEditor.highlightOff : d.menuEditor.highlightOn}
        className={`shrink-0 transition-colors ${
          item.highlighted ? 'text-amber-500 hover:text-amber-600' : 'text-gray-300 hover:text-gray-600'
        }`}
      >
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill={item.highlighted ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinejoin="round">
          <path d="M12 3.5l2.55 5.6 6.05.58-4.55 4.06 1.3 5.94L12 16.75l-5.35 2.93 1.3-5.94-4.55-4.06 6.05-.58L12 3.5z" />
        </svg>
      </button>

      <div className="shrink-0">
        <PriceField
          cents={item.priceCents}
          currency={currency}
          label={fill(d.menuEditor.priceLabel, { dish: nome })}
          onChange={onPrice}
        />
      </div>

      {/* Come la tendina "Sposta in": si scopre al passaggio, sempre visibile
          su telefono dove il passaggio non esiste. Apre lo stesso pannello di
          /piatti — corregge il catalogo, non solo questa riga. */}
      <button
        onClick={() => onEdit(dish)}
        aria-label={fill(d.menuEditor.editDish, { dish: nome })}
        title={fill(d.menuEditor.editDish, { dish: nome })}
        className="shrink-0 text-gray-300 opacity-100 transition-opacity hover:text-gray-900 md:opacity-0 md:group-focus-within:opacity-100 md:group-hover:opacity-100"
      >
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
        </svg>
      </button>

      <button
        onClick={onRemove}
        aria-label={d.menuEditor.removeItem}
        title={d.menuEditor.removeItem}
        className="shrink-0 text-gray-300 transition-colors hover:text-red-600"
      >
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>
    </li>
  );
}
