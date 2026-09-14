'use client';

// Il gestionale: il catalogo piatti del partner, che vive sopra i singoli
// locali. Qui si crea e si corregge un piatto, e basta.
//
// DOVE APPARE NON SI DECIDE QUI (decisione dell'utente, 15/09). Il catalogo è
// la fonte dei dati; i piatti li sceglie chi li usa — il menù nel suo editor,
// la scheda AllergiApp nella sua pagina. Prima questa tabella aveva la
// colonna "Sulla scheda" coi suoi interruttori, un selettore "Accendi su" e
// le caselle nella maschera: tre modi di fare dal catalogo una cosa che è
// della scheda.
import { useEffect, useRef, useState } from 'react';
import { useI18n } from '@/lib/i18n';
import { venuesWithDish, useDishes, type Dish } from '@/lib/dishes';
import { useVenues } from '@/lib/venues';
import { deleteDishPhoto } from '@/lib/photos';
import { DISH_CATEGORIES, categoryName } from '@/lib/categories';
import { ALLERGENS } from '@/lib/allergens';
import { DIETS } from '@/lib/diets';
import DishRow from '@/components/dishes/DishRow';
import DishPanel from '@/components/dishes/DishPanel';
import DeleteDishDialog from '@/components/dishes/DeleteDishDialog';
import UndoToast from '@/components/UndoToast';
import { PageIntro, PageTitle } from '@/components/PageHeading';

type SortKey = 'name' | 'category';

// Intestazione che ordina: la freccia compare solo sulla colonna attiva, così
// si vede a colpo d'occhio da cosa dipende l'ordine che si sta guardando.
function SortHeader({
  label,
  sortKey,
  sort,
  onClick,
}: {
  label: string;
  sortKey: SortKey;
  sort: { key: SortKey; dir: 'asc' | 'desc' } | null;
  onClick: (key: SortKey) => void;
}) {
  const active = sort?.key === sortKey;
  return (
    <button
      onClick={() => onClick(sortKey)}
      className={`inline-flex items-center gap-1 uppercase tracking-wide transition-colors hover:text-gray-700 ${
        active ? 'text-gray-700' : ''
      }`}
    >
      {label}
      {active && (
        <svg
          className={`h-3 w-3 ${sort.dir === 'desc' ? 'rotate-180' : ''}`}
          viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
        >
          <path d="M6 15l6-6 6 6" />
        </svg>
      )}
    </button>
  );
}

export default function DishesPage() {
  const { d, locale } = useI18n();
  const { dishes, create, update, remove, restore } = useDishes();
  // I locali servono solo all'annulla: eliminando un piatto spariscono per
  // cascata anche le sue righe sulle schede, e rimettendolo vanno rimesse
  const { venues } = useVenues();
  const [query, setQuery] = useState('');
  // null = tutte le categorie; '' = i piatti senza categoria
  const [category, setCategory] = useState<string | null>(null);
  // Allergeni contenuti ed esigenze dichiarate: dentro ogni gruppo basta che
  // ne torni uno (cercare "latte o uova"), fra i due gruppi valgono entrambi
  const [allergens, setAllergens] = useState<string[]>([]);
  const [diets, setDiets] = useState<string[]>([]);
  const [filtersOpen, setFiltersOpen] = useState(false);
  // null = l'ordine del catalogo, cioè quello in cui il partner li ha creati
  // (ed è anche l'ordine con cui l'app li mostra). Le intestazioni ci tornano
  // al terzo clic, perché è un ordine che si vuole poter recuperare.
  const [sort, setSort] = useState<{ key: SortKey; dir: 'asc' | 'desc' } | null>(null);
  // 'new' = pannello aperto su un piatto da creare; un id = su quello
  const [editing, setEditing] = useState<'new' | string | null>(null);

  // La home porta qui con la maschera GIÀ APERTA: una scorciatoia che ti
  // lascia davanti alla pagina, a cercare il bottone, non è una scorciatoia.
  // Due indirizzi: `?nuovo` per crearne uno, `?piatto=<id>` per correggere
  // quello — è l'indirizzo che le palline del catalogo sulla home premono, e
  // l'unico modo di aprire quella maschera da fuori senza duplicarla.
  //
  // Si legge l'indirizzo invece di useSearchParams, che obbligherebbe a
  // incartare la pagina in un <Suspense> per la generazione statica — molto
  // rumore per un parametro.
  //
  // Si aspetta che i DATI ci siano, e non basta il montaggio: aprendola subito
  // la finestra nasceva con le liste ancora vuote e proponeva di creare un
  // locale nuovo a chi ce l'aveva già. Serve anche a sapere se il piatto
  // chiesto esiste davvero — un id vecchio (piatto eliminato da un'altra
  // scheda, indirizzo tenuto nei preferiti) non deve aprire niente. Una volta
  // sola, o riaprirebbe la maschera a ogni ricarica delle liste.
  const aperturaChiesta = useRef(false);
  useEffect(() => {
    if (aperturaChiesta.current || !dishes || !venues) return;
    aperturaChiesta.current = true;
    const parametri = new URLSearchParams(window.location.search);
    const piatto = parametri.get('piatto');
    if (!parametri.has('nuovo') && piatto === null) return;
    // consumato subito: tornando indietro dall'editor la maschera non deve
    // riaprirsi da sola
    window.history.replaceState(null, '', '/piatti');
    if (parametri.has('nuovo')) {
      setEditing('new');
    } else if (piatto !== null && dishes.some((dish) => dish.id === piatto)) {
      setEditing(piatto);
    }
  }, [dishes, venues]);
  const [deleting, setDeleting] = useState<Dish | null>(null);
  // Piatto appena eliminato, con la posizione e i locali sulla cui scheda era
  const [undoable, setUndoable] = useState<{
    dish: Dish;
    index: number;
    venueIds: string[];
    // Se la riga è sparita davvero dal database. È una promessa e non un
    // valore perché l'annulla compare subito, mentre l'esito della scrittura
    // arriva dopo: quando scade, la risposta c'è già.
    eliminata: Promise<boolean>;
  } | null>(null);
  // Punto fermo dove torna il fuoco quando il toast se ne va: la riga da cui
  // era partito è stata eliminata
  const createButton = useRef<HTMLButtonElement>(null);

  function toggleFilter(code: string, list: string[], setList: (next: string[]) => void) {
    setList(list.includes(code) ? list.filter((c) => c !== code) : [...list, code]);
  }

  async function saveDish(data: Omit<Dish, 'id'>) {
    // Il pannello si chiude subito: la lista è già aggiornata in locale e
    // far aspettare tre giri di rete davanti a un bottone "Salva" che non
    // reagisce è peggio che scriverli in sottofondo.
    const apertoSu = editing;
    setEditing(null);
    if (apertoSu === 'new') await create(data);
    else if (apertoSu) await update(apertoSu, data);
  }

  function confirmDelete(dish: Dish) {
    // Eliminandone due di fila, il toast del primo lascia il posto al secondo
    // e da lì in poi il primo non è più annullabile: è il suo momento di
    // diventare definitivo, foto compresa.
    purgePhoto();
    const index = (dishes ?? []).findIndex((item) => item.id === dish.id);
    const venueIds = venuesWithDish(venues ?? [], dish.id).map((s) => s.id);
    const eliminata = remove(dish.id);
    setDeleting(null);
    setUndoable({ dish, index: index < 0 ? 0 : index, venueIds, eliminata });
  }

  function undoDelete() {
    if (!undoable) return;
    restore(undoable.dish, undoable.index, undoable.venueIds);
    setUndoable(null);
  }

  // Finché l'annulla è a schermo i file della foto restano: cancellarli
  // insieme alla riga farebbe tornare il piatto con l'immagine rotta, cioè
  // un annulla che non annulla del tutto. Si portano via quando
  // l'eliminazione diventa davvero definitiva — qui e non in remove().
  // ...e solo se la riga è sparita davvero. Se il database ha rifiutato
  // l'eliminazione, il piatto ricomparirà al prossimo caricamento: portargli
  // via la foto lo farebbe tornare con l'immagine rotta, che è peggio di un
  // file di troppo rimasto sullo Storage.
  function purgePhoto() {
    if (!undoable) return;
    const { dish, eliminata } = undoable;
    void eliminata.then((ok) => {
      if (ok) void deleteDishPhoto(dish.photoUrl, dish.photoThumbUrl);
    });
  }

  function forgetDeleted() {
    purgePhoto();
    setUndoable(null);
  }

  const search = query.trim().toLowerCase();
  // Solo le categorie in cui il partner ha davvero dei piatti: una pill che
  // non filtra niente è un bottone che non fa niente, e sono otto.
  const usedCategories = [
    ...((dishes ?? []).some((dish) => dish.category === '')
      ? [{ code: '', label: d.dishes.noCategory }]
      : []),
    ...DISH_CATEGORIES.filter((cat) => (dishes ?? []).some((dish) => dish.category === cat.code)).map(
      (cat) => ({ code: cat.code, label: categoryName(cat.code, locale) })
    ),
  ];
  // Eliminando l'ultimo piatto di una categoria la sua pill sparisce: se era
  // quella selezionata il filtro resterebbe acceso su un criterio invisibile
  const activeCategory =
    category !== null && usedCategories.some((cat) => cat.code === category) ? category : null;
  // Come per le categorie: si elencano solo gli allergeni e le esigenze che
  // compaiono davvero nel catalogo, non tutti e venti
  const usedAllergens = ALLERGENS.filter((a) =>
    (dishes ?? []).some((dish) => dish.allergens.includes(a.code))
  );
  const usedDiets = DIETS.filter((t) => (dishes ?? []).some((dish) => dish.dietTags.includes(t.code)));
  // Correggendo un piatto può sparire l'ultimo allergene di un filtro acceso:
  // come per le categorie, il criterio diventato invisibile decade
  const activeAllergens = allergens.filter((code) => usedAllergens.some((a) => a.code === code));
  const activeDiets = diets.filter((code) => usedDiets.some((t) => t.code === code));
  const activeFilters = activeAllergens.length + activeDiets.length;

  const filtered = (dishes ?? []).filter(
    (dish) =>
      (activeCategory === null || dish.category === activeCategory) &&
      (search === '' || dish.name.toLowerCase().includes(search)) &&
      (activeAllergens.length === 0 || activeAllergens.some((code) => dish.allergens.includes(code))) &&
      (activeDiets.length === 0 || activeDiets.some((code) => dish.dietTags.includes(code)))
  );

  // I piatti senza categoria per primi, come nella scheda dell'app
  const categoryRank = (code: string) =>
    code === '' ? -1 : DISH_CATEGORIES.findIndex((cat) => cat.code === code);

  function compare(a: Dish, b: Dish) {
    if (!sort) return 0;
    const verso = sort.dir === 'asc' ? 1 : -1;
    if (sort.key === 'name') return a.name.localeCompare(b.name, locale) * verso;
    return (categoryRank(a.category) - categoryRank(b.category)) * verso;
  }

  const rows = sort === null ? filtered : [...filtered].sort(compare);

  // Primo clic crescente, secondo decrescente, terzo si torna al catalogo
  function toggleSort(key: SortKey) {
    setSort((prev) =>
      prev?.key !== key ? { key, dir: 'asc' } : prev.dir === 'asc' ? { key, dir: 'desc' } : null
    );
  }
  const editingDish = editing && editing !== 'new' ? dishes?.find((x) => x.id === editing) : undefined;

  return (
    <div>
      <PageTitle>{d.dishes.title}</PageTitle>
      <PageIntro className="mb-10 md:mb-12">{d.dishes.intro}</PageIntro>

      {!dishes || !venues ? (
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
            {(usedAllergens.length > 0 || usedDiets.length > 0) && (
              <button
                onClick={() => setFiltersOpen(!filtersOpen)}
                aria-expanded={filtersOpen}
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                  activeFilters > 0 || filtersOpen
                    ? 'border-gray-900 text-gray-900'
                    : 'border-gray-300 text-gray-600 hover:border-gray-400'
                }`}
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 5h18l-7 8v5.5l-4 2V13z" />
                </svg>
                <span className="hidden sm:inline">{d.dishes.filters}</span>
                {activeFilters > 0 && (
                  <span className="rounded-full bg-gray-900 px-1.5 text-[11px] font-medium text-white">
                    {activeFilters}
                  </span>
                )}
              </button>
            )}
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

          {/* Categorie: una riga sola, scorre se non ci sta (come nella maschera).
              Con una categoria sola in uso non c'è niente da scegliere. */}
          {usedCategories.length > 1 && (
          <div className="-mx-0.5 mb-4 flex gap-1.5 overflow-x-auto px-0.5 pb-0.5">
            {[{ code: null as string | null, label: d.dishes.allCategories }, ...usedCategories].map(({ code, label }) => (
              <button
                key={code ?? 'all'}
                onClick={() => setCategory(code)}
                className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
                  activeCategory === code
                    ? 'border-gray-900 bg-gray-900 text-white'
                    : 'border-gray-300 bg-white text-gray-600 hover:border-gray-400'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          )}

          {/* Il pannello dei filtri: chiuso finché non serve, perché venti pill
              sempre aperte sono più ingombro che aiuto */}
          {filtersOpen && (
            <div className="mb-4 space-y-3 rounded-2xl border border-gray-200 bg-white p-4">
              {usedAllergens.length > 0 && (
                <div>
                  <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-400">
                    {d.dishes.filterAllergens}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {usedAllergens.map((a) => {
                      const selected = activeAllergens.includes(a.code);
                      return (
                        <button
                          key={a.code}
                          onClick={() => toggleFilter(a.code, allergens, setAllergens)}
                          aria-pressed={selected}
                          className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                            selected
                              ? 'border-[#FFE082] bg-[#FFF8E1] text-[#8D6E00]'
                              : 'border-gray-300 bg-white text-gray-600 hover:border-gray-400'
                          }`}
                        >
                          {a[locale]}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {usedDiets.length > 0 && (
                <div>
                  <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-400">
                    {d.dishes.filterDiets}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {usedDiets.map((t) => {
                      const selected = activeDiets.includes(t.code);
                      return (
                        <button
                          key={t.code}
                          onClick={() => toggleFilter(t.code, diets, setDiets)}
                          aria-pressed={selected}
                          className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                            selected
                              ? 'border-[#C8E6C9] bg-[#E8F5E9] text-[#2E7D32]'
                              : 'border-gray-300 bg-white text-gray-600 hover:border-gray-400'
                          }`}
                        >
                          {t[locale]}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {activeFilters > 0 && (
                <button
                  onClick={() => {
                    setAllergens([]);
                    setDiets([]);
                  }}
                  className="text-xs font-medium text-gray-500 underline underline-offset-2 hover:text-gray-900"
                >
                  {d.dishes.filtersClear}
                </button>
              )}
            </div>
          )}

          {/* Intestazione delle colonne: solo da tablet in su, sotto le righe
              si impilano e i dati tornano una riga di testo sotto al nome */}
          <div className="hidden items-center gap-3 px-4 pb-2 text-xs font-medium uppercase tracking-wide text-gray-400 md:flex">
            <span className="w-11 shrink-0" />
            <span className="min-w-0 flex-[2]">
              <SortHeader label={d.dishes.colDish} sortKey="name" sort={sort} onClick={toggleSort} />
            </span>
            <span className="w-24 shrink-0">
              <SortHeader label={d.dishes.colCategory} sortKey="category" sort={sort} onClick={toggleSort} />
            </span>
            <span className="hidden min-w-0 flex-[3] lg:block">{d.dishes.colTags}</span>
            <span className="w-32 shrink-0" />
          </div>

          {rows.length === 0 ? (
            <p className="rounded-2xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
              {d.dishes.noResults}
            </p>
          ) : (
            <div className="space-y-2">
              {rows.map((dish) => (
                <DishRow
                  key={dish.id}
                  dish={dish}
                  onEdit={() => setEditing(dish.id)}
                  onDelete={() => setDeleting(dish)}
                />
              ))}
            </div>
          )}

          <p className="mt-3 text-xs text-gray-400">
            {rows.length} {rows.length === 1 ? d.dishes.countOne : d.dishes.countOther}
          </p>
        </>
      )}

      {editing && (
        <DishPanel
          key={editing}
          dish={editingDish}
          onSave={saveDish}
          onClose={() => setEditing(null)}
        />
      )}

      {deleting && (
        <DeleteDishDialog
          dish={deleting}
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
          onExpire={forgetDeleted}
          returnFocusTo={createButton}
        />
      )}

    </div>
  );
}
