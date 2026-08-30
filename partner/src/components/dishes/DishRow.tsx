'use client';

// Una riga del gestionale: le colonne che servono a riconoscere un piatto e a
// capire dove sta. Su telefono le colonne spariscono e i loro dati tornano una
// riga di testo sotto al nome, perché una tabella a cinque colonne su 380px
// non si legge.
import { useI18n } from '@/lib/i18n';
import type { Dish } from '@/lib/dishes';
import type { Showcase } from '@/lib/showcases';
import { ALLERGENS } from '@/lib/allergens';
import { categoryName } from '@/lib/categories';

// Quanti allergeni stanno nella colonna prima di contare gli altri: la riga
// deve restare alta una riga sola, o la lista smette di essere scorribile
const ALLERGEN_CHIPS = 3;

function PhotoPlaceholder() {
  return (
    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-dashed border-gray-300 text-gray-300">
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
  onEdit,
  onDelete,
}: {
  dish: Dish;
  // le vetrine in cui il piatto è acceso, non tutte quelle del partner
  showcases: Showcase[];
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { d, locale } = useI18n();

  // Con una vetrina sola il nome dice più del numero; da due in su non ci sta
  const showcaseLabel =
    showcases.length === 0
      ? '—'
      : showcases.length === 1
        ? showcases[0].venueName.trim() || d.home.unnamed
        : `${showcases.length} ${d.dishes.showcaseCount}`;
  const category = dish.category === '' ? '' : categoryName(dish.category, locale);
  const chips = dish.allergens.slice(0, ALLERGEN_CHIPS);
  const extra = dish.allergens.length - chips.length;

  return (
    <div className="flex items-center gap-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      {dish.photoUrl !== '' ? (
        <img src={dish.photoUrl} alt="" className="h-11 w-11 shrink-0 rounded-full object-cover" />
      ) : (
        <PhotoPlaceholder />
      )}

      <button onClick={onEdit} className="min-w-0 flex-1 text-left">
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

      <span className="hidden w-28 shrink-0 truncate text-xs text-gray-500 md:block">
        {category === '' ? '—' : category}
      </span>

      <span className="hidden w-52 shrink-0 flex-wrap gap-1 md:flex">
        {chips.length === 0 ? (
          <span className="text-xs text-gray-400">—</span>
        ) : (
          <>
            {chips.map((code) => {
              const info = ALLERGENS.find((a) => a.code === code);
              return (
                <span
                  key={code}
                  className="rounded-full bg-[#FFF8E1] px-2 py-0.5 text-[11px] font-medium text-[#8D6E00]"
                >
                  {info ? info[locale] : code}
                </span>
              );
            })}
            {extra > 0 && <span className="text-[11px] text-gray-400">+{extra}</span>}
          </>
        )}
      </span>

      <span
        className={`hidden w-32 shrink-0 truncate text-xs md:block ${
          showcases.length === 0 ? 'text-gray-400' : 'text-gray-700'
        }`}
      >
        {showcaseLabel}
      </span>

      <span className="flex w-auto shrink-0 items-center gap-3 text-sm font-medium md:w-32 md:justify-end">
        <button onClick={onEdit} className="text-gray-600 hover:text-gray-900">
          {d.common.edit}
        </button>
        <button onClick={onDelete} className="text-red-600 hover:text-red-700">
          {d.common.delete}
        </button>
      </span>
    </div>
  );
}
