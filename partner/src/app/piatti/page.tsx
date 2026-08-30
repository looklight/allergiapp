'use client';

// Il gestionale: il catalogo piatti del partner, che vive sopra le singole
// vetrine. Qui si crea e si corregge un piatto; dove appare si decide col
// toggle sulla vetrina o con le caselle in fondo alla maschera.
import { useEffect, useState } from 'react';
import { useI18n } from '@/lib/i18n';
import { setDishShowcases, showcasesWithDish, useDishes, type Dish } from '@/lib/dishes';
import { useShowcases } from '@/lib/showcases';
import { ALLERGENS } from '@/lib/allergens';
import { DISH_CATEGORIES, categoryName } from '@/lib/categories';
import DishForm from '@/components/DishForm';
import DeleteDishDialog from '@/components/DeleteDishDialog';

// Quanto resta annullabile un'eliminazione, dal toast in fondo alla lista
const UNDO_MS = 8000;

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

export default function DishesPage() {
  const { d, locale } = useI18n();
  const { dishes, create, update, remove, restore } = useDishes();
  const { showcases } = useShowcases();
  const [query, setQuery] = useState('');
  // null = tutte le categorie; '' = i piatti senza categoria
  const [category, setCategory] = useState<string | null>(null);
  const [editing, setEditing] = useState<'new' | string | null>(null);
  // Vetrine spuntate nel pannello: si applicano al salvataggio, così
  // annullare la modifica non lascia in giro un piatto acceso a metà
  const [inShowcases, setInShowcases] = useState<string[]>([]);
  const [deleting, setDeleting] = useState<Dish | null>(null);
  // Piatto appena eliminato, con la posizione e le vetrine che aveva
  const [undoable, setUndoable] = useState<{
    dish: Dish;
    index: number;
    showcaseIds: string[];
  } | null>(null);

  // Scaduto il tempo il toast sparisce e l'eliminazione diventa definitiva
  useEffect(() => {
    if (!undoable) return;
    const timer = setTimeout(() => setUndoable(null), UNDO_MS);
    return () => clearTimeout(timer);
  }, [undoable]);

  // Esc chiude il pannello, come da qualsiasi finestra modale
  useEffect(() => {
    if (!editing) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setEditing(null);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [editing]);

  function openNew() {
    // Un piatto nuovo nasce acceso ovunque: chi ha un locale solo non deve
    // spuntare niente, chi ne ha di più vede subito le caselle e sceglie
    setInShowcases((showcases ?? []).map((s) => s.id));
    setEditing('new');
  }

  function openEdit(dish: Dish) {
    setInShowcases(showcasesWithDish(showcases ?? [], dish.id).map((s) => s.id));
    setEditing(dish.id);
  }

  function saveDish(data: Omit<Dish, 'id'>) {
    const id = editing === 'new' ? create(data).id : editing;
    if (!id) return;
    if (editing !== 'new') update(id, data);
    setDishShowcases(id, inShowcases);
    setEditing(null);
  }

  function confirmDelete(dish: Dish) {
    const index = (dishes ?? []).findIndex((item) => item.id === dish.id);
    const showcaseIds = showcasesWithDish(showcases ?? [], dish.id).map((s) => s.id);
    remove(dish.id);
    setDeleting(null);
    setUndoable({ dish, index: index < 0 ? 0 : index, showcaseIds });
  }

  function undoDelete() {
    if (!undoable) return;
    restore(undoable.dish, undoable.index, undoable.showcaseIds);
    setUndoable(null);
  }

  const search = query.trim().toLowerCase();
  const filtered = (dishes ?? []).filter(
    (dish) =>
      (category === null || dish.category === category) &&
      (search === '' || dish.name.toLowerCase().includes(search))
  );
  // La pill "Senza categoria" compare solo se c'è qualcosa da filtrarci
  const hasUncategorized = (dishes ?? []).some((dish) => dish.category === '');
  const editingDish = editing && editing !== 'new' ? dishes?.find((x) => x.id === editing) : undefined;

  return (
    <div>
      <h1 className="mb-2 text-xl font-semibold md:text-2xl">{d.dishes.title}</h1>
      <p className="mb-8 max-w-xl text-sm text-gray-600">{d.dishes.intro}</p>

      {!dishes || !showcases ? (
        <p className="text-sm text-gray-500">{d.common.loading}</p>
      ) : dishes.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center">
          <p className="text-sm font-medium text-gray-900">{d.dishes.empty}</p>
          <p className="mt-1 text-sm text-gray-500">{d.dishes.emptyHint}</p>
          <button
            onClick={openNew}
            className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-700"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
            {d.dishes.create}
          </button>
        </div>
      ) : (
        <>
          {/* Ricerca e nuovo piatto sulla stessa riga: il primario resta a destra */}
          <div className="mb-3 flex items-center gap-3">
            <div className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 focus-within:border-gray-900">
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
            <button
              onClick={openNew}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-700"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M12 5v14M5 12h14" />
              </svg>
              <span className="hidden sm:inline">{d.dishes.create}</span>
            </button>
          </div>

          {/* Categorie: una riga sola, scorre se non ci sta (come nella maschera) */}
          <div className="-mx-0.5 mb-4 flex gap-1.5 overflow-x-auto px-0.5 pb-0.5">
            {[
              { code: null, label: d.dishes.allCategories },
              ...(hasUncategorized ? [{ code: '', label: d.dishes.noCategory }] : []),
              ...DISH_CATEGORIES.map((cat) => ({ code: cat.code, label: cat[locale] })),
            ].map(({ code, label }) => (
              <button
                key={code ?? 'all'}
                onClick={() => setCategory(code)}
                className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
                  category === code
                    ? 'border-gray-900 bg-gray-900 text-white'
                    : 'border-gray-300 bg-white text-gray-600 hover:border-gray-400'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Intestazione delle colonne: solo da tablet in su, sotto le righe
              si impilano e i dati tornano una riga di testo sotto al nome */}
          <div className="hidden items-center gap-4 px-4 pb-2 text-xs font-medium uppercase tracking-wide text-gray-400 md:flex">
            <span className="w-11 shrink-0" />
            <span className="min-w-0 flex-1">{d.dishes.colDish}</span>
            <span className="w-28 shrink-0">{d.dishes.colCategory}</span>
            <span className="w-52 shrink-0">{d.dishes.colAllergens}</span>
            <span className="w-32 shrink-0">{d.dishes.colShowcases}</span>
            <span className="w-32 shrink-0" />
          </div>

          {filtered.length === 0 ? (
            <p className="rounded-2xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
              {d.dishes.noResults}
            </p>
          ) : (
            <div className="space-y-2">
              {filtered.map((dish) => {
                const on = showcasesWithDish(showcases, dish.id);
                const showcaseLabel =
                  on.length === 0
                    ? '—'
                    : on.length === 1
                      ? on[0].venueName.trim() || d.home.unnamed
                      : `${on.length} ${d.dishes.showcaseCount}`;
                const chips = dish.allergens.slice(0, ALLERGEN_CHIPS);
                const extra = dish.allergens.length - chips.length;

                return (
                  <div
                    key={dish.id}
                    className="flex items-center gap-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm"
                  >
                    {dish.photoUrl !== '' ? (
                      <img src={dish.photoUrl} alt="" className="h-11 w-11 shrink-0 rounded-full object-cover" />
                    ) : (
                      <PhotoPlaceholder />
                    )}

                    <button
                      onClick={() => openEdit(dish)}
                      className="min-w-0 flex-1 text-left"
                    >
                      <p className="truncate text-sm font-medium text-gray-900">{dish.name}</p>
                      {dish.description.trim() !== '' && (
                        <p className="truncate text-xs text-gray-500">{dish.description}</p>
                      )}
                      {/* Su telefono categoria e vetrine non hanno una colonna:
                          finiscono qui sotto, in una riga sola */}
                      <p className="mt-0.5 truncate text-xs text-gray-400 md:hidden">
                        {dish.category === '' ? d.dishes.noCategory : categoryName(dish.category, locale)}
                        {' · '}
                        {on.length === 0 ? d.dishes.inNoShowcase : showcaseLabel}
                      </p>
                    </button>

                    <span className="hidden w-28 shrink-0 truncate text-xs text-gray-500 md:block">
                      {dish.category === '' ? '—' : categoryName(dish.category, locale)}
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
                        on.length === 0 ? 'text-gray-400' : 'text-gray-700'
                      }`}
                    >
                      {showcaseLabel}
                    </span>

                    <span className="flex w-auto shrink-0 items-center gap-3 text-sm font-medium md:w-32 md:justify-end">
                      <button onClick={() => openEdit(dish)} className="text-gray-600 hover:text-gray-900">
                        {d.common.edit}
                      </button>
                      <button onClick={() => setDeleting(dish)} className="text-red-600 hover:text-red-700">
                        {d.common.delete}
                      </button>
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          <p className="mt-3 text-xs text-gray-400">
            {filtered.length} {filtered.length === 1 ? d.dishes.countOne : d.dishes.countOther}
          </p>
        </>
      )}

      {/* Pannello laterale: entra da destra e ospita la maschera del piatto */}
      {editing && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-black/40"
          onClick={() => setEditing(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="h-full w-full max-w-[43rem] overflow-y-auto bg-white p-5 shadow-xl md:p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-gray-900">
                {editing === 'new' ? d.dishes.newTitle : d.dishes.editTitle}
              </h2>
              <button
                onClick={() => setEditing(null)}
                aria-label={d.common.close}
                className="text-gray-400 transition-colors hover:text-gray-900"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>

            <DishForm
              key={editing}
              initial={editingDish}
              onSave={saveDish}
              onCancel={() => setEditing(null)}
            >
              {/* Dove appare il piatto: stesso stato del toggle sulla vetrina */}
              <div className="border-t border-gray-200 pt-3">
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  {d.dishes.showcasesLabel}
                </label>
                {(showcases ?? []).length === 0 ? (
                  <p className="text-xs text-gray-500">{d.dishes.noShowcases}</p>
                ) : (
                  <>
                    <p className="mb-2 text-xs text-gray-500">{d.dishes.showcasesHint}</p>
                    <div className="space-y-1.5">
                      {(showcases ?? []).map((s) => (
                        <label key={s.id} className="flex items-center gap-2 text-sm text-gray-700">
                          <input
                            type="checkbox"
                            checked={inShowcases.includes(s.id)}
                            onChange={(e) =>
                              setInShowcases((prev) =>
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
            </DishForm>
          </div>
        </div>
      )}

      {deleting && (
        <DeleteDishDialog
          dish={deleting}
          showcases={showcasesWithDish(showcases ?? [], deleting.id)}
          onCancel={() => setDeleting(null)}
          onConfirm={() => confirmDelete(deleting)}
        />
      )}

      {/* Toast di annullamento: come per le vetrine, l'eliminazione resta
          reversibile per qualche secondo */}
      {undoable && (
        <div
          role="status"
          className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-4 rounded-xl bg-gray-900 px-4 py-3 shadow-lg"
        >
          <span className="text-sm text-white">{d.dishes.deleted}</span>
          <button
            onClick={undoDelete}
            className="text-sm font-medium text-white underline underline-offset-2 transition-opacity hover:opacity-80"
          >
            {d.dishes.undo}
          </button>
        </div>
      )}
    </div>
  );
}
