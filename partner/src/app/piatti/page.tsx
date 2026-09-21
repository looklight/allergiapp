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
import { fill, useI18n } from '@/lib/i18n';
import { venuesWithDish, useDishes, type Dish } from '@/lib/dishes';
import { useVenues } from '@/lib/venues';
import { deleteDishPhoto } from '@/lib/photos';
import { DISH_CATEGORIES, categoryName, visibleCategories } from '@/lib/categories';
import { ALLERGENS } from '@/lib/allergens';
import { DIETS } from '@/lib/diets';
import DishRow from '@/components/dishes/DishRow';
import DishPanel from '@/components/dishes/DishPanel';
import DeleteDishDialog from '@/components/dishes/DeleteDishDialog';
import ConfirmDialog from '@/components/menus/ConfirmDialog';
import CategoryManager, { ManageCategoriesButton, useHiddenCategories } from '@/components/dishes/CategoryManager';
import UndoToast from '@/components/UndoToast';
import { CreateButton, PageIntro, PageTitleRow } from '@/components/PageHeading';

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
  const { dishes, create, update, remove, restore, setCategory: spostaInCategoria } = useDishes();
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
  // SELEZIONE MULTIPLA (richiesta dell'utente, 15/09): si accende da un
  // bottone e non è sempre attiva, perché nel caso normale toccare una riga
  // vuol dire aprire quel piatto. Accesa, le righe si spuntano e in cima
  // compare la barra delle azioni su tutti gli spuntati insieme.
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [deletingMany, setDeletingMany] = useState(false);
  // Il pannello "Gestisci…" delle categorie, al posto della fila di pill
  const [gestisciCategorie, setGestisciCategorie] = useState(false);
  const nascoste = useHiddenCategories();
  // Piatti appena eliminati — uno dalla riga, o tanti dalla selezione — coi
  // locali sulla cui scheda erano: finché il toast è a schermo si rimettono
  const [undoable, setUndoable] = useState<{
    items: { dish: Dish; venueIds: string[] }[];
    // Se le righe sono sparite davvero dal database, e le righe di menù da
    // rimettere. È una promessa e non un valore perché l'annulla compare
    // subito, mentre l'esito della scrittura arriva dopo: quando scade, la
    // risposta c'è già.
    eliminata: Promise<{ ok: boolean; menuRows: Record<string, unknown>[] }>;
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

  function confirmDelete(daEliminare: Dish[]) {
    if (daEliminare.length === 0) return;
    // Eliminandone due volte di fila, il toast della prima lascia il posto
    // alla seconda e da lì in poi la prima non è più annullabile: è il suo
    // momento di diventare definitiva, foto comprese.
    purgePhoto();
    const items = daEliminare.map((dish) => ({
      dish,
      venueIds: venuesWithDish(venues ?? [], dish.id).map((s) => s.id),
    }));
    const eliminata = remove(daEliminare.map((dish) => dish.id));
    setDeleting(null);
    setDeletingMany(false);
    setSelected([]);
    setSelecting(false);
    setUndoable({ items, eliminata });
  }

  function undoDelete() {
    if (!undoable) return;
    const { items, eliminata } = undoable;
    // Si rimette solo DOPO che l'eliminazione è arrivata al database: con un
    // annulla rapidissimo il ripristino partiva prima, trovava i piatti ancora
    // lì, falliva — e poi l'eliminazione li portava via lo stesso
    void eliminata.then(({ menuRows }) => restore(items, menuRows));
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
    const { items, eliminata } = undoable;
    void eliminata.then(({ ok }) => {
      if (!ok) return;
      for (const { dish } of items) void deleteDishPhoto(dish.photoUrl, dish.photoThumbUrl);
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

  // Gli spuntati che esistono ancora: un piatto eliminato altrove non conta.
  // "Seleziona tutti" vale per le righe VISIBILI, cioè col filtro e la
  // ricerca di adesso — come nella scelta dei piatti della scheda.
  const scelti = (dishes ?? []).filter((dish) => selected.includes(dish.id));
  const idsVisibili = rows.map((dish) => dish.id);
  const tuttiVisibiliScelti = idsVisibili.length > 0 && idsVisibili.every((id) => selected.includes(id));

  function toggleSelected(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function toggleTuttiVisibili() {
    setSelected((prev) =>
      tuttiVisibiliScelti
        ? prev.filter((id) => !idsVisibili.includes(id))
        : [...prev, ...idsVisibili.filter((id) => !prev.includes(id))]
    );
  }

  function esciDallaSelezione() {
    setSelecting(false);
    setSelected([]);
  }

  return (
    <div>
      {/* "Nuovo piatto" sulla riga del titolo (v. PageTitleRow). Col catalogo
          vuoto no: lì c'è già il bottone al centro, con la spiegazione, e due
          "crea" nella stessa schermata vuota sarebbero uno di troppo. */}
      <PageTitleRow
        action={
          dishes && dishes.length > 0 ? (
            <CreateButton label={d.dishes.create} onClick={() => setEditing('new')} buttonRef={createButton} />
          ) : undefined
        }
      >
        {d.dishes.title}
      </PageTitleRow>
      <PageIntro className="mb-10 md:mb-12">{d.dishes.intro}</PageIntro>

      {!dishes || !venues ? (
        <p className="text-sm text-gray-500">{d.common.loading}</p>
      ) : dishes.length === 0 ? (
        // Stessa larghezza del riquadro vuoto dei Menù: a tutta pagina il
        // messaggio breve si perdeva in mezzo a un rettangolo enorme
        <div className="max-w-xl rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center">
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
          {/* Gli strumenti della lista sulla stessa riga: ricerca, filtri,
              selezione. "Nuovo piatto" non è fra loro: sta col titolo. */}
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
            {/* Il bottone della selezione: in contorno come Filtri, perché è
                un modo di guardare la lista e non un'azione. Acceso diventa
                "Fine", che è la via d'uscita. */}
            <button
              onClick={() => (selecting ? esciDallaSelezione() : setSelecting(true))}
              aria-pressed={selecting}
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                selecting
                  ? 'border-gray-900 text-gray-900'
                  : 'border-gray-300 text-gray-600 hover:border-gray-400'
              }`}
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="3" y="3" width="18" height="18" rx="4" />
                <path d="M8 12.5l2.5 2.5L16 9.5" />
              </svg>
              <span className="hidden sm:inline">{selecting ? d.dishes.selectDone : d.dishes.select}</span>
            </button>
          </div>

          {/* Su telefono la fila esce fino ai bordi dello schermo (-mx-4 px-4,
              come nell'anteprima del menù) e senza barra di scorrimento:
              prima i chip venivano tagliati sul filo del contenuto, a 16px
              dal bordo (21/09). Da tablet in su la pagina ha più margine e
              la fila resta com'era. */}
          {/* Categorie: una riga sola, scorre se non ci sta. I filtri solo con
              almeno due categorie in uso — con una non c'è niente da scegliere.

              IN CODA "GESTISCI…", come nella maschera del piatto (richiesta
              dell'utente, 15/09): quali categorie si usano si decide anche da
              qui, dove si guarda il catalogo intero. Il pannello è lo stesso
              componente e prende il posto della fila, non le si mette sotto. */}
          {gestisciCategorie ? (
            <div className="mb-4">
              <CategoryManager onDone={() => setGestisciCategorie(false)} />
            </div>
          ) : (
          <div className="scrollbar-none -mx-4 mb-4 flex items-center gap-1.5 overflow-x-auto px-4 pb-0.5 md:-mx-0.5 md:px-0.5">
            {usedCategories.length > 1 &&
              [{ code: null as string | null, label: d.dishes.allCategories }, ...usedCategories].map(({ code, label }) => (
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
            <ManageCategoriesButton onClick={() => setGestisciCategorie(true)} />
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
            {/* in selezione le righe hanno la casella in testa: lo spazio
                c'è anche qui, o le colonne scivolano rispetto ai titoli */}
            {selecting && <span className="w-4 shrink-0" />}
            <span className="w-11 shrink-0" />
            <span className="min-w-0 flex-[2]">
              <SortHeader label={d.dishes.colDish} sortKey="name" sort={sort} onClick={toggleSort} />
            </span>
            <span className="w-24 shrink-0">
              <SortHeader label={d.dishes.colCategory} sortKey="category" sort={sort} onClick={toggleSort} />
            </span>
            <span className="hidden min-w-0 flex-[3] lg:block">{d.dishes.colTags}</span>
            <span className="w-10 shrink-0" />
          </div>

          {/* LA BARRA DELLE AZIONI SUGLI SPUNTATI, ferma in cima mentre si
              scorre: con cinquanta piatti si spunta in fondo alla lista e si
              agisce senza risalire. Le azioni restano visibili anche a zero
              spuntati, spente — comparire al primo tocco farebbe saltare la
              lista sotto il dito. */}
          {selecting && (
            <div className="sticky top-0 z-20 -mx-1 mb-3 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl border border-gray-200 bg-white/95 px-4 py-3 shadow-sm backdrop-blur">
              <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={tuttiVisibiliScelti}
                  ref={(el) => {
                    if (el) el.indeterminate = !tuttiVisibiliScelti && idsVisibili.some((id) => selected.includes(id));
                  }}
                  onChange={toggleTuttiVisibili}
                  className="h-4 w-4 cursor-pointer rounded border-gray-300 accent-gray-900"
                />
                {tuttiVisibiliScelti ? d.dishes.deselectAll : d.dishes.selectAll}
              </label>
              <span className="text-sm font-medium text-gray-900">
                {scelti.length === 1 ? d.dishes.selectedOne : fill(d.dishes.selectedCount, { count: scelti.length })}
              </span>
              <div className="ml-auto flex flex-wrap items-center gap-3">
                {/* Qui il cestino ha anche la parola: è l'azione su tanti piatti
                    insieme, e un'icona sola in una barra di comandi si
                    confonderebbe con le altre */}
                <button
                  onClick={() => setDeletingMany(true)}
                  disabled={scelti.length === 0}
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-red-600 transition-colors hover:text-red-700 disabled:opacity-40"
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M4 7h16M9 7V5a2 2 0 012-2h2a2 2 0 012 2v2M10 11v6M14 11v6M6 7l1 12a2 2 0 002 2h6a2 2 0 002-2l1-12" />
                  </svg>
                  {d.common.delete}
                </button>
              </div>

              {/* SPOSTA IN CATEGORIA, a pill e non a tendina (richiesta
                  dell'utente, 15/09): si vedono tutte insieme e si sceglie
                  con un tocco. SOLO LE CATEGORIE ATTIVE — quelle nascoste dal
                  "Gestisci…" non si propongono, come nella maschera del
                  piatto — più "Senza categoria". Si applica subito: è
                  reversibile con un altro tocco, quindi niente conferma.
                  Accesa la pill della categoria che hanno TUTTI gli
                  spuntati, così si vede dove sono prima di spostarli. */}
              <div className="flex w-full flex-wrap items-center gap-1.5 border-t border-gray-100 pt-2.5">
                <span className="mr-1 text-xs text-gray-500">{d.dishes.bulkCategory}</span>
                {[
                  { code: '', label: d.dishes.noCategory },
                  ...visibleCategories(nascoste).map((cat) => ({
                    code: cat.code,
                    label: categoryName(cat.code, locale),
                  })),
                ].map(({ code, label }) => {
                  const diTutti = scelti.length > 0 && scelti.every((dish) => dish.category === code);
                  return (
                    <button
                      key={code || 'none'}
                      type="button"
                      disabled={scelti.length === 0}
                      aria-pressed={diTutti}
                      onClick={() => void spostaInCategoria(scelti.map((dish) => dish.id), code)}
                      className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors disabled:opacity-40 ${
                        diTutti
                          ? 'border-gray-900 bg-gray-900 text-white'
                          : 'border-gray-300 bg-white text-gray-600 hover:border-gray-400'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

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
                  selecting={selecting}
                  selected={selected.includes(dish.id)}
                  onSelect={() => toggleSelected(dish.id)}
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
          onConfirm={() => confirmDelete([deleting])}
        />
      )}

      {deletingMany && (
        <ConfirmDialog
          title={
            scelti.length === 1 ? d.dishes.deleteTitle : fill(d.dishes.deleteManyTitle, { count: scelti.length })
          }
          body={scelti.length === 1 ? d.dishes.deleteBody : d.dishes.deleteManyBody}
          subject={scelti.length === 1 ? scelti[0].name : undefined}
          confirmLabel={d.common.delete}
          onCancel={() => setDeletingMany(false)}
          onConfirm={() => confirmDelete(scelti)}
        />
      )}

      {undoable && (
        <UndoToast
          key={undoable.items.map(({ dish }) => dish.id).join()}
          message={
            undoable.items.length === 1
              ? d.dishes.deleted
              : fill(d.dishes.deletedMany, { count: undoable.items.length })
          }
          undoLabel={d.dishes.undo}
          onUndo={undoDelete}
          onExpire={forgetDeleted}
          returnFocusTo={createButton}
        />
      )}

    </div>
  );
}
