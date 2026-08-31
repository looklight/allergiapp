'use client';

// Una riga del gestionale: le colonne che servono a riconoscere un piatto e a
// capire dove sta. Su telefono le colonne spariscono e i loro dati tornano una
// riga di testo sotto al nome, perché una tabella a cinque colonne su 380px
// non si legge.
import { useEffect, useRef, useState } from 'react';
import { useI18n } from '@/lib/i18n';
import { dishThumb } from '@/lib/dishes';
import type { Dish } from '@/lib/dishes';
import type { Showcase } from '@/lib/showcases';
import { allergenName } from '@/lib/allergens';
import { dietName } from '@/lib/diets';
import { categoryName } from '@/lib/categories';

// Le pill occupano due righe piene e poi si contano quelle che restano fuori.
// Un numero fisso non funzionerebbe: "Glutine" e "Per intolleranti
// all'istamina" occupano spazi diversissimi, e la colonna è elastica.
// 20px per riga (11px di testo su interlinea 16 + 2 di padding sopra e sotto)
// più i 4 del gap: due righe fanno 44.
const TWO_ROWS = 'max-h-11';
const CHIP_GAP = 4;
// Larghezza fissa del contatore: sapendola non serve misurarla, e "+99" ci sta
const COUNTER_W = 32;

function PhotoPlaceholder({ dimmed }: { dimmed: boolean }) {
  return (
    <span
      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-dashed border-gray-300 text-gray-300 transition ${
        dimmed ? 'opacity-50' : ''
      }`}
    >
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 8h3l1.5-2h7L17 8h3a1 1 0 011 1v9a1 1 0 01-1 1H4a1 1 0 01-1-1V9a1 1 0 011-1z" />
        <circle cx="12" cy="13" r="3.5" />
      </svg>
    </span>
  );
}

export default function DishRow({
  dish,
  showcases,
  on,
  onToggle,
  onEdit,
  onDelete,
}: {
  dish: Dish;
  // le vetrine in cui il piatto è acceso, non tutte quelle del partner
  showcases: Showcase[];
  // acceso nella vetrina a cui si riferisce la colonna; null = il partner non
  // ha ancora vetrine, quindi non c'è niente da accendere e la colonna non c'è
  on: boolean | null;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { d, locale } = useI18n();
  // Le pill in eccesso si aprono per riga: chi sta controllando un piatto
  // vuole leggerle tutte, ma tenerle aperte su tutte le righe renderebbe la
  // tabella una colonna di paragrafi
  const [allTags, setAllTags] = useState(false);

  // Con una vetrina sola il nome dice più del numero; da due in su non ci sta
  const showcaseLabel =
    showcases.length === 0
      ? '—'
      : showcases.length === 1
        ? showcases[0].venueName.trim() || d.home.unnamed
        : `${showcases.length} ${d.dishes.showcaseCount}`;
  const category = dish.category === '' ? '' : categoryName(dish.category, locale);
  // Allergeni contenuti e compatibilità dichiarate, nello stesso ordine in cui
  // stanno nella maschera: prima cosa c'è dentro, poi per chi va bene
  const tags = [
    ...dish.allergens.map((code) => ({ code, label: allergenName(code, locale), allergen: true })),
    ...dish.dietTags.map((code) => ({ code, label: dietName(code, locale), allergen: false })),
  ];
  // Quante pill restano fuori dalle due righe, e dove finisce l'ultima che si
  // vede: il contatore si mette lì di seguito, come fosse in fila. Si misura
  // DOPO aver disegnato, ma le pill restano tutte nel DOM e il contatore è
  // fuori dal flusso: così la misura non cambia ciò che misura, che sarebbe
  // un'altalena senza fine.
  const cell = useRef<HTMLSpanElement>(null);
  const [overflow, setOverflow] = useState<{ count: number; left: number; top: number } | null>(null);

  useEffect(() => {
    const node = cell.current;
    if (!node) return;
    function measure() {
      if (!node) return;
      const limit = node.clientHeight;
      const chips = [...node.querySelectorAll<HTMLElement>('[data-chip]')];
      const shown = chips.filter((chip) => chip.offsetTop + chip.offsetHeight <= limit + 1);
      const last = shown[shown.length - 1];
      if (chips.length === shown.length || !last) return setOverflow(null);
      setOverflow({
        count: chips.length - shown.length,
        // se in coda all'ultima pill non ci sta, si appoggia al bordo destro
        // e la sfumatura dice che sotto il testo continua
        left: Math.min(last.offsetLeft + last.offsetWidth + CHIP_GAP, node.clientWidth - COUNTER_W),
        top: last.offsetTop,
      });
    }
    measure();
    // la colonna è elastica: allargando la finestra ne rientrano di più
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, [tags.length, allTags]);

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      {/* Spento in questa vetrina: la foto si smorza come nella griglia della
          vetrina, così scorrendo la tabella si distingue cosa è in scheda
          senza dover leggere ogni interruttore */}
      {dish.photoUrl !== '' ? (
        <img
          src={dishThumb(dish)}
          loading="lazy"
          alt=""
          className={`h-11 w-11 shrink-0 rounded-full object-cover transition ${
            on === false ? 'opacity-40 grayscale' : ''
          }`}
        />
      ) : (
        <PhotoPlaceholder dimmed={on === false} />
      )}

      {/* Spento: si smorza tutto quello che descrive il piatto, pill comprese.
          Restano piene solo due cose: l'interruttore, che deve restare
          leggibile perché è il modo di riaccenderlo, e le azioni, che smorzate
          sembrerebbero disabilitate mentre funzionano. */}
      <button
        onClick={onEdit}
        className={`min-w-0 flex-[2] text-left transition ${on === false ? 'opacity-50' : ''}`}
      >
        <p className="truncate text-sm font-medium text-gray-900">{dish.name}</p>
        {dish.description.trim() !== '' && (
          <p className="truncate text-xs text-gray-500">{dish.description}</p>
        )}
        <p className="mt-0.5 truncate text-xs text-gray-400 md:hidden">
          {category === '' ? d.dishes.noCategory : category}
          {' · '}
          {showcases.length === 0 ? d.dishes.inNoShowcase : showcaseLabel}
        </p>
      </button>

      <span
        className={`hidden w-24 shrink-0 truncate text-xs text-gray-500 transition md:block ${
          on === false ? 'opacity-50' : ''
        }`}
      >
        {category === '' ? '—' : category}
      </span>

      <span
        ref={cell}
        className={`relative hidden min-w-0 flex-[3] flex-wrap gap-1 overflow-hidden transition lg:flex ${
          allTags ? '' : TWO_ROWS
        } ${on === false ? 'opacity-50' : ''}`}
      >
        {tags.length === 0 ? (
          <span className="text-xs text-gray-400">—</span>
        ) : (
          <>
            {tags.map(({ code, label, allergen }) => (
              <span
                key={`${allergen ? 'a' : 'd'}-${code}`}
                data-chip
                className={`rounded-full px-2 py-0.5 text-[11px] font-medium leading-4 ${
                  allergen ? 'bg-[#FFF8E1] text-[#8D6E00]' : 'bg-[#E8F5E9] text-[#2E7D32]'
                }`}
              >
                {label}
              </span>
            ))}
            {(overflow || allTags) && (
              /* Posizionato e non in fila: entrando nel flusso ruberebbe il
                 posto a una pill, e a quel punto ne resterebbe fuori un'altra.
                 Le coordinate però lo mettono dove sarebbe se ci fosse. */
              <button
                onClick={() => setAllTags(!allTags)}
                aria-expanded={allTags}
                aria-label={dish.name}
                style={
                  allTags || !overflow
                    ? undefined
                    : { left: overflow.left, top: overflow.top, width: COUNTER_W }
                }
                className={`text-[11px] leading-5 text-gray-400 transition-colors hover:text-gray-700 ${
                  allTags ? 'px-1' : 'absolute bg-gradient-to-l from-white via-white pl-2 text-left'
                }`}
              >
                {allTags ? '−' : `+${overflow?.count}`}
              </button>
            )}
          </>
        )}
      </span>

      {/* L'interruttore vale per UNA vetrina, quella che la pagina indica
          sopra la tabella: acceso qui non vuol dire acceso ovunque. Dove sta
          altrove lo dicono la riga sotto al nome e la maschera. */}
      {on !== null && (
        <span className="hidden w-20 shrink-0 justify-center md:flex">
          <button
            type="button"
            role="switch"
            aria-checked={on}
            aria-label={dish.name}
            onClick={onToggle}
            className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${
              on ? 'bg-[#4CAF50]' : 'bg-gray-300'
            }`}
          >
            <span
              className={`absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
                on ? 'translate-x-4' : ''
              }`}
            />
          </button>
        </span>
      )}

      {on !== null && (
        <button
          type="button"
          role="switch"
          aria-checked={on}
          aria-label={dish.name}
          onClick={onToggle}
          className={`relative h-5 w-9 shrink-0 rounded-full transition-colors md:hidden ${
            on ? 'bg-[#4CAF50]' : 'bg-gray-300'
          }`}
        >
          <span
            className={`absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
              on ? 'translate-x-4' : ''
            }`}
          />
        </button>
      )}

      <span className="flex w-auto shrink-0 items-center gap-3 text-sm font-medium md:w-32 md:justify-end">
        {/* Su telefono "Modifica" sparisce: le due azioni scritte per esteso
            lasciavano al nome del piatto una sessantina di pixel, e qui la
            modifica si apre già toccando la riga. L'eliminazione invece resta
            scritta, perché non deve capitare per sbaglio. */}
        <button onClick={onEdit} className="hidden text-gray-600 hover:text-gray-900 md:inline">
          {d.common.edit}
        </button>
        <button onClick={onDelete} className="text-red-600 hover:text-red-700">
          {d.common.delete}
        </button>
      </span>
    </div>
  );
}
