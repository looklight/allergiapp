'use client';

// Il gestionale: il catalogo piatti del partner, che vive sopra le singole
// vetrine. Qui si crea e si corregge un piatto; dove appare si decide col
// toggle sulla vetrina o con le caselle in fondo alla maschera.
import { useRef, useState } from 'react';
import { useI18n } from '@/lib/i18n';
import { setDishShowcases, showcasesWithDish, useDishes, type Dish } from '@/lib/dishes';
import { useShowcases } from '@/lib/showcases';
import { DISH_CATEGORIES } from '@/lib/categories';
import DishRow from '@/components/dishes/DishRow';
import DishPanel from '@/components/dishes/DishPanel';
import DeleteDishDialog from '@/components/dishes/DeleteDishDialog';
import UndoToast from '@/components/UndoToast';

export default function DishesPage() {
  const { d, locale } = useI18n();
  const { dishes, create, update, remove, restore } = useDishes();
  const { showcases } = useShowcases();
  const [query, setQuery] = useState('');
  // null = tutte le categorie; '' = i piatti senza categoria
  const [category, setCategory] = useState<string | null>(null);
  // 'new' = pannello aperto su un piatto da creare; un id = su quello
  const [editing, setEditing] = useState<'new' | string | null>(null);
  const [deleting, setDeleting] = useState<Dish | null>(null);
  // Piatto appena eliminato, con la posizione e le vetrine che aveva
  const [undoable, setUndoable] = useState<{
    dish: Dish;
    index: number;
    showcaseIds: string[];
  } | null>(null);
  // Punto fermo dove torna il fuoco quando il toast se ne va: la riga da cui
  // era partito è stata eliminata
  const createButton = useRef<HTMLButtonElement>(null);

  function saveDish(data: Omit<Dish, 'id'>, showcaseIds: string[]) {
    const id = editing === 'new' ? create(data).id : editing;
    if (!id) return;
    if (editing !== 'new') update(id, data);
    setDishShowcases(id, showcaseIds);
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
  // Un piatto nuovo nasce acceso ovunque: chi ha un locale solo non deve
  // spuntare niente, chi ne ha di più vede subito le caselle e sceglie
  const editingShowcaseIds =
    editing === 'new'
      ? (showcases ?? []).map((s) => s.id)
      : showcasesWithDish(showcases ?? [], editing ?? '').map((s) => s.id);

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
            ref={createButton}
            onClick={() => setEditing('new')}
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
              ref={createButton}
              onClick={() => setEditing('new')}
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
              {filtered.map((dish) => (
                <DishRow
                  key={dish.id}
                  dish={dish}
                  showcases={showcasesWithDish(showcases, dish.id)}
                  onEdit={() => setEditing(dish.id)}
                  onDelete={() => setDeleting(dish)}
                />
              ))}
            </div>
          )}

          <p className="mt-3 text-xs text-gray-400">
            {filtered.length} {filtered.length === 1 ? d.dishes.countOne : d.dishes.countOther}
          </p>
        </>
      )}

      {editing && showcases && (
        <DishPanel
          key={editing}
          dish={editingDish}
          showcases={showcases}
          initialShowcaseIds={editingShowcaseIds}
          onSave={saveDish}
          onClose={() => setEditing(null)}
        />
      )}

      {deleting && (
        <DeleteDishDialog
          dish={deleting}
          showcases={showcasesWithDish(showcases ?? [], deleting.id)}
          onCancel={() => setDeleting(null)}
          onConfirm={() => confirmDelete(deleting)}
        />
      )}

      {undoable && (
        <UndoToast
          key={undoable.dish.id}
          message={d.dishes.deleted}
          undoLabel={d.dishes.undo}
          onUndo={undoDelete}
          onExpire={() => setUndoable(null)}
          returnFocusTo={createButton}
        />
      )}

    </div>
  );
}
