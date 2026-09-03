'use client';

// Il menù come lo vede il cliente al tavolo. Non è la scheda AllergiApp
// (quella è SchedaPreview): è l'altra faccia del prodotto, la pagina che si
// apre col QR — intestazione del locale, le linguette dei menù, il filtro,
// le sezioni.
//
// Le LINGUETTE sono la ragione per cui logo e colore appartengono al locale e
// non al menù: il QR è incollato al tavolo e non cambia a mezzogiorno, quindi
// carta e pranzo stanno DENTRO la stessa pagina (DIGITAL_MENU.md, Tema 13).
//
// ⚠️ QUI NON C'È PIÙ IL DISCLAIMER "dichiarato dal ristorante, non verificato
// da AllergiApp", e non è una dimenticanza: è la decisione del 2026-09-01
// (Tema 18). Al tavolo è il ristorante che ti porge il SUO menù col QR, e
// nessuno pensa che una carta stampata sia stata verificata da un terzo.
// Quella frase resta dov'è indispensabile — sulla SCHEDA in app
// (SchedaPreview), dove siamo NOI a presentare un ristorante a chi lo sta
// scegliendo da lontano. Di nostro qui resta il FILTRO, ed è l'unico posto
// dove un cliente potrebbe leggere una verifica che non abbiamo fatto:
// perciò la riga "dichiarati dal ristorante" sta attaccata al filtro e non
// in fondo alla pagina. Il fondo è del ristoratore (condizioni al tavolo).
//
// Ma si vedono **da due menù in su**. Il nome di un menù serve a distinguerlo
// da un altro: con un menù solo la linguetta è un'etichetta che al cliente non
// dice niente e per giunta non si può premere. (Prima c'era sempre, per far
// capire nell'editor che i menù possono essere più d'uno: didattica pagata dal
// cliente al tavolo, che di quel ripasso non sa che farsene.)
import { useState } from 'react';
import { fill, useI18n } from '@/lib/i18n';
import { ALLERGENS, allergenName } from '@/lib/allergens';
import { DIETS, dietNeedName } from '@/lib/diets';
import { dishThumb, type Dish } from '@/lib/dishes';
import {
  displayPrice,
  hasNoteText,
  menuItems,
  type Menu,
  type MenuItem,
  type MenuSection,
} from '@/lib/menus';
import { filaPastiglie, filterLabel, type FilterPill } from '@/lib/menuFilters';
import {
  TEXT_SCALE_FACTORS,
  type DishPhotoShape,
  type HeadingFont,
  type SectionStyle,
  type TextScale,
} from '@/lib/venues';
import { accentHex, type MenuBrand } from '@/lib/menuBrand';
import DishDetailSheet from './DishDetailSheet';
import FilterSheet from './FilterSheet';

export interface ViewerNeeds {
  allergens: string[];
  diets: string[];
}

export const NO_NEEDS: ViewerNeeds = { allergens: [], diets: [] };

// Perché una riga è stata messa in fondo. Vuoto = va bene per chi guarda.
interface Esclusione {
  contiene: string[]; // allergeni scelti che il piatto dichiara di contenere
  nonPer: string[];   // esigenze scelte che il piatto non dichiara
}

function esclusione(dish: Dish, needs: ViewerNeeds): Esclusione {
  return {
    contiene: needs.allergens.filter((code) => dish.allergens.includes(code)),
    // ATTENZIONE alla semantica: "non dichiarato vegetariano" NON vuol dire
    // "non è vegetariano". Per questo la riga non sparisce e il testo dice
    // "non indicato per", che è quello che sappiamo davvero.
    nonPer: needs.diets.filter((code) => !dish.dietTags.includes(code)),
  };
}

function esclusa(e: Esclusione): boolean {
  return e.contiene.length > 0 || e.nonPer.length > 0;
}

export default function MenuPreview({
  menu,
  siblings,
  dishes,
  brand,
  coverUrl,
  venueName,
  tableConditions,
  showPhotos,
  photoShape,
  showDescriptions,
  sectionStyle,
  headingFont,
  textScale,
  needs,
  onToggleNeed,
}: {
  menu: Menu;
  // gli altri menù dello stesso locale: diventano le linguette
  siblings: Menu[];
  dishes: Dish[];
  brand: MenuBrand;
  // L'immagine dietro l'intestazione, al posto del colore pieno. Vuota =
  // resta il colore.
  coverUrl: string;
  venueName: string;
  // Coperto, servizio, pagamenti: sono del LOCALE, quindi identiche sotto
  // ogni linguetta. Vuote = non si mostra niente.
  tableConditions: string;
  // Le due manopole dell'aspetto (BrandBar): stanno sul LOCALE, e questa
  // anteprima deve rispettarle o il ristoratore sceglie alla cieca.
  showPhotos: boolean;
  // Tonde o squadrate (migration 711). Vale per la lista: la foto grande del
  // dettaglio resta rettangolare.
  photoShape: DishPhotoShape;
  showDescriptions: boolean;
  // Come si vede il titolo di una sezione: filetto, fascia o solo testo
  sectionStyle: SectionStyle;
  headingFont: HeadingFont;
  textScale: TextScale;
  needs: ViewerNeeds;
  onToggleNeed: (kind: 'allergens' | 'diets', code: string) => void;
}) {
  const { d, locale } = useI18n();
  const accent = accentHex(brand.accent);
  const dishById = (id: string) => dishes.find((dish) => dish.id === id);
  // Il piatto aperto nel foglio di dettaglio: sta qui e non nella pagina che
  // usa MenuPreview, perché è uno stato di QUESTA schermata (il telefono
  // simulato), non dell'editor che le sta intorno.
  const [detail, setDetail] = useState<{ item: MenuItem; dish: Dish } | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);

  const nelMenu = menuItems(menu)
    .map((item) => dishById(item.dishId))
    .filter((dish): dish is Dish => dish !== undefined);

  // Si offrono SOLO gli allergeni che qualche piatto dichiara e le esigenze
  // che qualche piatto soddisfa: una pastiglia che non toglie niente è un
  // bottone che non fa niente, e una che svuota il menù è peggio.
  //
  // …e "senza glutine" NON compare due volte. `gluten_free` sta fra le
  // esigenze e `gluten` fra gli allergeni: due pastiglie con la stessa
  // identica scritta che filtrano in modo diverso — una chiede che il glutine
  // non sia fra gli allergeni dichiarati, l'altra che il ristoratore abbia
  // spuntato "senza glutine" su quel piatto. Davanti a un celiaco seduto al
  // tavolo sono due bottoni uguali con due risposte diverse. Resta
  // l'ALLERGENE, che il ristoratore compila su ogni piatto mentre l'esigenza è
  // facoltativa; nel dettaglio la targhetta verde "Senza glutine" rimane, e lì
  // è un'informazione e non un comando. Stessa regola sulla pagina pubblica
  // (landing, lib/render-menu.js): se divergono, il ristoratore vede
  // un'anteprima che non è quella che vedrà il suo cliente.
  const disponibili: FilterPill[] = [
    ...ALLERGENS.filter((a) => nelMenu.some((dish) => dish.allergens.includes(a.code))).map((a) => ({
      kind: 'allergens' as const,
      code: a.code,
    })),
    ...DIETS.filter(
      (t) => t.code !== 'gluten_free' && nelMenu.some((dish) => dish.dietTags.includes(t.code))
    ).map((t) => ({
      kind: 'diets' as const,
      code: t.code,
    })),
  ];
  const accese: FilterPill[] = [
    ...needs.allergens.map((code) => ({ kind: 'allergens' as const, code })),
    ...needs.diets.map((code) => ({ kind: 'diets' as const, code })),
  ].filter((p) => disponibili.some((x) => x.kind === p.kind && x.code === p.code));
  // La fila: le accese in testa, poi la graduatoria (v. menuFilters.ts)
  const fila = filaPastiglie(disponibili, accese);

  // Lo spazio della foto si tiene per ALLINEARE le righe fra loro: senza, in
  // un menù dove alcuni piatti hanno la foto e altri no, il testo partirebbe
  // da due punti diversi. Ma se non ce l'ha NESSUNO non c'è niente da
  // allineare, e resta una colonna di quadrati grigi lunga tutto il menù —
  // che è il caso della maggior parte dei menù veri.
  // Due condizioni, e sono diverse: il ristoratore può SPEGNERLE (showPhotos)
  // e comunque non ci sono se non le ha caricate nessuno. La prima è una
  // scelta, la seconda è il contenuto.
  const conFoto = showPhotos && nelMenu.some((dish) => dishThumb(dish) !== '');
  // 'modern' è il carattere di sistema e non ha classe: è il ripiego, ed è
  // anche l'unico che non fa scaricare niente al cliente.
  const carattere = headingFont === 'modern' ? '' : ` heading-${headingFont}`;
  // Nomi dei piatti e prezzi seguono lo stesso carattere ma con il PESO del
  // loro ruolo (v. globals.css): sono testi principali quanto le
  // intestazioni. Quello che NON lo segue è tutto il resto — descrizioni,
  // note, e la riga degli allergeni.
  const suffisso = headingFont === 'modern' ? '' : `-${headingFont}`;

  const scelte = accese.length;
  const adatti = nelMenu.filter((dish) => !esclusa(esclusione(dish, needs))).length;

  // Sezioni e BLOCCHI DI TESTO nella stessa fila, perché nel menù occupano
  // lo stesso posto. Si mostra una sezione se ha piatti, e un blocco se ha
  // qualcosa scritto dentro: un blocco appena creato nell'editor non deve
  // comparire al tavolo come un riquadro vuoto.
  const gruppi: MenuSection[] = [
    { id: 'loose', kind: 'section' as const, name: '', description: '', items: menu.loose },
    ...menu.sections,
  ]
    .filter((g) => (g.kind === 'note' ? hasNoteText(g) : g.items.length > 0))
    // "La carta si riordina", non si accorcia (Tema 2). I piatti che non
    // vanno bene restano leggibili in fondo alla loro sezione, col motivo
    // scritto: nasconderli darebbe l'impressione che il ristorante non abbia
    // altro, e su un dato DICHIARATO e non verificato una sparizione è una
    // promessa che non possiamo fare.
    //
    // Il riordino si fa QUI e non dentro la resa, perché non serve solo a
    // disegnare: è anche l'ordine in cui le freccine del dettaglio passano da
    // un piatto all'altro, e devono seguire quello che si ha davanti.
    .map((gruppo) => {
      if (gruppo.kind === 'note') return gruppo;
      const righe = [...gruppo.items].sort((a, b) => {
        const da = dishById(a.dishId);
        const db = dishById(b.dishId);
        const ea = da ? esclusa(esclusione(da, needs)) : false;
        const eb = db ? esclusa(esclusione(db, needs)) : false;
        return Number(ea) - Number(eb);
      });
      return { ...gruppo, items: righe };
    });

  // La carta stesa in una fila sola, nell'ordine in cui si legge: da qui le
  // freccine del dettaglio sanno qual è il piatto prima e quello dopo.
  const inFila = gruppi
    .filter((g) => g.kind === 'section')
    .flatMap((g) => g.items)
    .map((item) => ({ item, dish: dishById(item.dishId) }))
    .filter((x): x is { item: MenuItem; dish: Dish } => x.dish !== undefined);
  const dove = detail === null ? -1 : inFila.findIndex((x) => x.item.id === detail.item.id);
  const primaDi = dove > 0 ? inFila[dove - 1] : null;
  const dopoDi = dove >= 0 && dove < inFila.length - 1 ? inFila[dove + 1] : null;

  return (
    // relative: è l'ancora del foglio di dettaglio (absolute inset-0), che
    // deve coprire SOLO lo schermo simulato e non la pagina del portale
    // intorno — dentro il telefono mockup o dentro l'anteprima a tutta
    // pagina, mai oltre.
    <div
      className={`relative flex h-full flex-col bg-white${
        headingFont === 'modern' ? '' : ` menu-font-${headingFont}`
      }`}
      // La grandezza dei testi come sul sito: un moltiplicatore solo sulla
      // radice, e ogni misura del contenuto è calc(Npx * var(--ms)).
      //
      // ⚠️ LE MISURE DI BASE SONO LE STESSE DEL SITO, numero per numero
      // (menu-page.css). Prima erano "un punto sotto" per via della cornice
      // del telefono, larga 360 contro i 390 di un iPhone recente — ma lo
      // sconto non era uguale per tutti i ruoli, e il risultato era che nel
      // portale il nome del piatto stava a un punto dal titolo di sezione
      // mentre al tavolo ne stava a due: il ristoratore giudicava
      // proporzioni che il suo cliente non avrebbe visto. Con i numeri
      // identici l'anteprima è semplicemente un telefono stretto (360 sta
      // fra un iPhone SE e un 15), che è una bugia molto più piccola. Le due
      // copie vanno tenute allineate (v. lib/render-menu.js), o il
      // ristoratore sceglie guardando una cosa e il cliente ne vede un'altra.
      style={{ '--ms': TEXT_SCALE_FACTORS[textScale] } as React.CSSProperties}
    >
      {/* Intestazione: la fascia colorata è l'unico posto in cui il colore
          scelto fa da fondo. Sul testo dei piatti resterebbe una scelta di
          contrasto lasciata al ristoratore, che il Tema 8 non concede. */}
      {/* L'intestazione: il colore pieno, oppure la COPERTINA con sopra una
          velatura scura. La velatura non è facoltativa — il nome è bianco, e
          su una foto chiara (una sala luminosa, un piatto di pasta)
          sparirebbe. È la stessa ragione per cui le tinte le scegliamo noi
          (Tema 8). Il colore resta come fondo sotto l'immagine: se la foto
          non arriva, l'intestazione non diventa bianca. */}
      <div
        // Il respiro sopra e sotto il nome è quello del sito (menu-page.css,
        // .menu-header): stretta com'era, la fascia sembrava una barra di
        // servizio invece dell'intestazione del ristorante.
        className="shrink-0 bg-cover bg-center px-4 pb-5 pt-6 text-white"
        style={
          coverUrl === ''
            ? { backgroundColor: accent }
            : {
                backgroundColor: accent,
                backgroundImage: `linear-gradient(rgba(0,0,0,0.45), rgba(0,0,0,0.6)), url(${coverUrl})`,
              }
        }
      >
        <div className="flex items-center gap-2.5">
          {/* SENZA LOGO NON C'È NESSUN LOGO, e prima invece compariva quello
              di AllergiApp (2026-09-02, deciso dall'utente). Sembrava una
              buona idea — "un'intestazione col solo nome sembra una pagina non
              finita" — ma al tavolo il piattino di AllergiApp accanto al nome
              del ristorante si legge come SE FOSSE il marchio del ristorante,
              e noi qui siamo ospiti: il menù è suo. Un nome da solo, ben
              spaziato, è un'intestazione perfettamente finita. */}
          {brand.logoUrl !== '' && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={brand.logoUrl}
              alt=""
              className="h-9 w-9 shrink-0 rounded-full bg-white object-cover"
            />
          )}
          <p className={`min-w-0 flex-1 text-[calc(22px*var(--ms))] font-semibold leading-snug${carattere}`}>
            {venueName}
          </p>
        </div>

        {/* Descrizione del menù: facoltativa, quello che il ristoratore ha
            scritto sotto il titolo nell'editor (orari, un avviso). */}
        {menu.description.trim() !== '' && (
          <p className="mt-2 whitespace-pre-line text-[calc(14px*var(--ms))] leading-snug text-white/85">
            {menu.description}
          </p>
        )}

        {/* Le linguette: quella aperta è piena, le altre restano leggibili.
            Nell'anteprima non si cambiano — si sta guardando questo menù. */}
        {siblings.length > 1 && (
        <div className="-mx-4 mt-3 flex gap-1.5 overflow-x-auto px-4 pb-0.5">
          {siblings.map((m) => {
            const attivo = m.id === menu.id;
            return (
              <span
                key={m.id}
                className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${
                  attivo ? 'bg-white' : 'bg-white/20 text-white'
                }`}
                style={attivo ? { color: accent } : undefined}
              >
                {m.name.trim() || d.menus.genericTab}
              </span>
            );
          })}
        </div>
        )}
      </div>

      {/* IL FILTRO. È la ragione per cui questo menù non è come gli altri
          menù col QR (Tema 2), quindi sta in alto e si tocca subito — e non
          è mai una funzione a pagamento: è la dimostrazione del prodotto. */}
      {disponibili.length > 0 && (
        <div className="shrink-0 border-b border-gray-100 px-4 py-2">
          <div className="flex items-baseline justify-between gap-2">
            <p className="text-[10px] font-medium uppercase tracking-wide text-gray-400">
              {d.menuPublic.filterHint}
            </p>
            {scelte > 0 && (
              <span className="text-[10px] tabular-nums text-gray-400">
                {fill(adatti === 1 ? d.menuPublic.filterSummaryOne : d.menuPublic.filterSummary, {
                  matching: adatti,
                  total: nelMenu.length,
                })}
              </span>
            )}
          </div>

          {/* UNA FILA SOLA: il bottone dei filtri scorre insieme alle
              pastiglie ed è solo l'icona (2026-09-03, come sul sito). La
              parola "Filtri" ripeteva quello che l'icona già dice, ed era
              l'unica scritta della fila a non essere una scelta; il nome
              resta per chi non vede l'icona (aria-label, title).

              Le pastiglie escono dal bordo destro (-mr-4 pr-4): una fila che
              si ferma prima del margine sembra finita anche quando non lo è. */}
          <div className="-mr-4 mt-1.5 flex items-center gap-1.5 overflow-x-auto pb-0.5 pr-4">
            <button
              onClick={() => setFilterOpen(true)}
              aria-label={d.menuPublic.filterButton}
              title={d.menuPublic.filterButton}
              className="flex shrink-0 items-center gap-0.5 rounded-full border border-gray-300 bg-white px-2 py-1 text-[11px] font-medium text-gray-700"
            >
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M4 7h16M7 12h10M10 17h4" />
              </svg>
              {scelte > 0 && (
                <span className="tabular-nums font-semibold" style={{ color: accent }}>
                  {scelte}
                </span>
              )}
            </button>
            {fila.map((pill) => (
              <Pastiglia
                key={`${pill.kind}-${pill.code}`}
                label={filterLabel(pill, locale, d.preview.withoutPrefix)}
                selected={needs[pill.kind].includes(pill.code)}
                accent={accent}
                onClick={() => onToggleNeed(pill.kind, pill.code)}
              />
            ))}
          </div>

          {/* L'UNICA riga che parla a nome nostro, ed è attaccata al filtro
              perché il filtro è l'unica cosa nostra in questa pagina (v. la
              nota in testa al file). Non è in fondo e non è un disclaimer:
              dice da dove viene il dato su cui il filtro sta lavorando. */}
          <p className="mt-1 text-[10px] leading-snug text-gray-400">
            {d.menuPublic.filterDeclared}
          </p>
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-6 pt-3">
        {gruppi.length === 0 ? (
          <p className="pt-10 text-center text-sm text-gray-400">{d.menuEditor.previewEmpty}</p>
        ) : (
          gruppi.map((gruppo) => {
            // Un blocco di testo non è una sezione con dentro niente: non ha
            // intestazione col colore del locale (quella annuncia dei piatti
            // che qui non arrivano mai) e non partecipa al filtro — non c'è
            // niente da riordinare, e sbiadirlo direbbe che riguarda le
            // esigenze scelte, che è proprio quello che non è.
            if (gruppo.kind === 'note') {
              return (
                <div key={gruppo.id} className="mb-4 rounded-xl bg-gray-50 px-3 py-2.5">
                  {gruppo.name.trim() !== '' && (
                    <p className="text-[calc(13px*var(--ms))] font-semibold leading-snug text-gray-900">
                      {gruppo.name}
                    </p>
                  )}
                  {gruppo.description.trim() !== '' && (
                    <p className="mt-0.5 whitespace-pre-line text-[calc(12px*var(--ms))] leading-snug text-gray-600">
                      {gruppo.description}
                    </p>
                  )}
                </div>
              );
            }

            // Le righe arrivano già riordinate (v. gruppi): il filtro le ha
            // messe in fondo alla loro sezione, e la fila che le freccine
            // percorrono è la stessa.
            const righe = gruppo.items;
            return (
              <section key={gruppo.id} className="mb-4">
                {gruppo.name.trim() !== '' && (
                  <TitoloSezione stile={sectionStyle} accent={accent} carattere={carattere}>
                    {gruppo.name}
                  </TitoloSezione>
                )}
                {gruppo.description.trim() !== '' && (
                  <p className="mb-3 whitespace-pre-line text-[calc(12px*var(--ms))] leading-snug text-gray-500">
                    {gruppo.description}
                  </p>
                )}
                <ul className="space-y-3">
                  {righe.map((item) => (
                    <Riga
                      key={item.id}
                      item={item}
                      dish={dishById(item.dishId)}
                      conFoto={conFoto}
                      formaFoto={photoShape}
                      conDescrizioni={showDescriptions}
                      suffisso={suffisso}
                      currency={menu.currency}
                      locale={locale}
                      needs={needs}
                      onOpen={(dish) => setDetail({ item, dish })}
                    />
                  ))}
                </ul>
              </section>
            );
          })
        )}

        {/* Il fondo del menù è del RISTORATORE: coperto, servizio,
            pagamenti. Su un menù vuoto non compare — sarebbe il coperto di
            una carta che non c'è. */}
        {gruppi.length > 0 && tableConditions.trim() !== '' && (
          <p className="riga-minuta mt-2 whitespace-pre-line border-t border-gray-100 pt-3 leading-snug text-gray-500">
            {tableConditions}
          </p>
        )}
      </div>

      {filterOpen && (
        <FilterSheet
          available={disponibili}
          selected={accese}
          accent={accent}
          onToggle={onToggleNeed}
          onReset={() => {
            for (const pill of accese) onToggleNeed(pill.kind, pill.code);
          }}
          onClose={() => setFilterOpen(false)}
        />
      )}

      {detail && (
        <DishDetailSheet
          item={detail.item}
          dish={detail.dish}
          suffisso={suffisso}
          showPhoto={showPhotos}
          currency={menu.currency}
          needs={needs}
          onPrev={primaDi === null ? null : () => setDetail(primaDi)}
          onNext={dopoDi === null ? null : () => setDetail(dopoDi)}
          onClose={() => setDetail(null)}
        />
      )}
    </div>
  );
}

// I TRE MODI DI ANNUNCIARE UNA SEZIONE. Sono la struttura del menù, ed è la
// cosa che si vede di più scorrendo: per questo il ristoratore può sceglierli.
//
//   filetto     maiuscoletto piccolo nel colore del locale, riga sotto.
//               Quello di sempre: sobrio, da carta stampata.
//   fascia      titolo su fondo pieno, testo bianco. Si TROVA scorrendo, che
//               su un menù lungo è quello che serve davvero. Regge solo
//               perché le tinte le scegliamo noi, tutte scure abbastanza da
//               tenere il bianco sopra (Tema 8).
//   solo testo  niente colore e niente filetto, ma più grande. Il più
//               moderno, e l'unico che non usa il colore del locale.
//
// ⚠️ La fascia esce dai margini della colonna (-mx-4 px-4): dentro il
// riquadro del telefono deve toccare i bordi, o non è una fascia — è un
// rettangolo con due bordi bianchi ai lati.
function TitoloSezione({
  stile,
  accent,
  carattere,
  children,
}: {
  stile: SectionStyle;
  accent: string;
  // già nella forma " heading-classic", vuoto per il carattere di sistema
  carattere: string;
  children: React.ReactNode;
}) {
  if (stile === 'banner') {
    return (
      <h3
        className={`-mx-4 mb-2 px-4 py-1.5 text-[calc(14px*var(--ms))] font-semibold uppercase tracking-wide text-white${carattere}`}
        style={{ backgroundColor: accent }}
      >
        {children}
      </h3>
    );
  }
  if (stile === 'plain') {
    return (
      <h3 className={`mb-1.5 text-[calc(18px*var(--ms))] font-semibold text-gray-900${carattere}`}>{children}</h3>
    );
  }
  return (
    <h3
      className={`mb-1 border-b pb-1 text-[calc(14px*var(--ms))] font-semibold uppercase tracking-wide${carattere}`}
      style={{ color: accent, borderColor: `${accent}33` }}
    >
      {children}
    </h3>
  );
}

function Pastiglia({
  label,
  selected,
  accent,
  onClick,
}: {
  label: string;
  selected: boolean;
  accent: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={selected}
      className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors ${
        selected ? 'text-white' : 'border-gray-300 bg-white text-gray-600'
      }`}
      style={selected ? { backgroundColor: accent, borderColor: accent } : undefined}
    >
      {label}
    </button>
  );
}

function Riga({
  item,
  dish,
  conFoto,
  formaFoto,
  conDescrizioni,
  suffisso,
  currency,
  locale,
  needs,
  onOpen,
}: {
  item: MenuItem;
  dish: Dish | undefined;
  // almeno un piatto di questo menù ha una foto (e il ristoratore non le ha
  // spente): solo allora si tiene lo spazio anche a chi non ce l'ha
  conFoto: boolean;
  formaFoto: DishPhotoShape;
  // le descrizioni si leggono in lista invece che aprendo il piatto
  conDescrizioni: boolean;
  // '' col carattere di sistema, altrimenti '-classic' e simili
  suffisso: string;
  currency: string;
  locale: 'it' | 'en';
  needs: ViewerNeeds;
  onOpen: (dish: Dish) => void;
}) {
  const { d } = useI18n();
  if (!dish) return null;

  const prezzo = displayPrice(item.priceCents, currency, locale);
  const perche = esclusione(dish, needs);
  const fuori = esclusa(perche);
  const tondo = formaFoto === 'round';

  return (
    <li
      className={`${fuori ? 'opacity-45' : ''} ${
        item.highlighted ? '-mx-1.5 rounded-lg bg-amber-50 px-1.5 py-1' : ''
      }`}
    >
      {/* Tutta la riga si tocca, non solo il nome: sul telefono un bersaglio
          piccolo è un bersaglio mancato. Apre il dettaglio — foto grande,
          descrizione intera, tutti gli allergeni — che qui non c'è spazio
          per mostrare per intero. */}
      <button
        type="button"
        onClick={() => onOpen(dish)}
        aria-label={fill(d.menuPublic.dishDetailOpen, { dish: dish.name })}
        className="flex w-full gap-2.5 text-left"
      >
        {/* Un piatto senza foto tiene lo spazio SOLO se in questo menù
            qualcuno la foto ce l'ha: fra righe fotografate e righe no, il
            testo partirebbe da punti diversi e la carta sembrerebbe storta.
            Se non ce l'ha nessuno non c'è niente da allineare (v. conFoto). */}
        {conFoto && dishThumb(dish) !== '' ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={dishThumb(dish)}
            alt=""
            className={`h-12 w-12 shrink-0 object-cover ${tondo ? 'rounded-full' : 'rounded-lg'}`}
          />
        ) : conFoto ? (
          <div className={`h-12 w-12 shrink-0 bg-gray-100 ${tondo ? 'rounded-full' : 'rounded-lg'}`} />
        ) : null}
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-1.5">
            {/* La stella qui è solo un segno, non un bottone: nell'anteprima
                (come nella pagina pubblica) il cliente non evidenzia niente,
                legge quello che il ristoratore ha già deciso. */}
            {item.highlighted && (
              <svg className="h-3 w-3 shrink-0 text-amber-500" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M12 3.5l2.55 5.6 6.05.58-4.55 4.06 1.3 5.94L12 16.75l-5.35 2.93 1.3-5.94-4.55-4.06 6.05-.58L12 3.5z" />
              </svg>
            )}
            {/* Nome e "i" insieme, non nome-flex-1-poi-i: senza questo
                raggruppamento l'icona finiva spinta accanto al prezzo,
                sembrando un'informazione sul prezzo invece che sul piatto. */}
            <span className="flex min-w-0 flex-1 items-baseline gap-1">
              {/* Va a capo, non si tronca: con i puntini un piatto dal nome
                  lungo diventava "Tagliatelle al ragù di cingh…", che al
                  tavolo è la riga che non si può leggere. Le righe perdono un
                  po' di altezza uniforme, e va bene — l'uniformità serve a
                  scorrere, il nome serve a ordinare. Stessa scelta sul sito
                  (.menu-item-name in menu-page.css). */}
              <p
                className={`min-w-0 break-words text-[calc(16px*var(--ms))] font-medium leading-snug text-gray-900${
                  suffisso === '' ? '' : ` name${suffisso}`
                }`}
              >
                {dish.name}
              </p>
              {/* La descrizione NON sta più qui: occupava una riga in più solo
                  sui piatti che ce l'hanno, e la carta perdeva l'altezza
                  uniforme fra una riga e l'altra scorrendola. Questa "i" dice
                  che c'è, senza costare lo spazio — il testo intero si legge
                  aprendo il dettaglio. */}
              {dish.description.trim() !== '' && !conDescrizioni && (
                <svg
                  className="h-3 w-3 shrink-0 text-gray-400"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="16" x2="12" y2="12" />
                  <line x1="12" y1="8" x2="12.01" y2="8" />
                </svg>
              )}
            </span>
            {/* Un piatto senza prezzo non mostra niente: una riga vuota o uno
                zero al tavolo sono peggio del silenzio */}
            {prezzo !== '' && (
              <p
                className={`shrink-0 text-[calc(16px*var(--ms))] font-semibold tabular-nums text-gray-900${
                  suffisso === '' ? '' : ` price${suffisso}`
                }`}
              >
                {prezzo}
              </p>
            )}
          </div>
          {/* La descrizione in lista, quando il ristoratore l'ha accesa: al
              suo posto, sopra, sparisce la "i" che diceva soltanto che
              c'era. */}
          {conDescrizioni && dish.description.trim() !== '' && (
            <p className="mt-1 text-[calc(13px*var(--ms))] leading-snug text-gray-500">{dish.description}</p>
          )}
          {item.highlighted && item.highlightNote.trim() !== '' && (
            <p className="mt-1 text-[calc(12px*var(--ms))] font-medium leading-snug text-amber-700">
              {item.highlightNote}
            </p>
          )}
          {/* Col filtro acceso il motivo prende il posto dell'elenco intero:
              chi ha appena toccato "senza glutine" vuole sapere perché QUESTO
              piatto è finito in fondo, non rileggere tutti i suoi allergeni. */}
          {fuori ? (
            <p className="riga-minuta mt-1 font-medium leading-snug text-gray-500">
              {perche.contiene.length > 0 &&
                fill(d.menuPublic.excludedContains, {
                  list: perche.contiene.map((c) => allergenName(c, locale).toLowerCase()).join(', '),
                })}
              {perche.contiene.length > 0 && perche.nonPer.length > 0 && ' · '}
              {perche.nonPer.length > 0 &&
                fill(d.menuPublic.excludedNotFor, {
                  list: perche.nonPer.map((c) => dietNeedName(c, locale).toLowerCase()).join(', '),
                })}
            </p>
          ) : (
            dish.allergens.length > 0 && (
              <p className="riga-minuta mt-1 leading-snug text-gray-400">
                {d.preview.contains}{' '}
                {dish.allergens.map((code) => allergenName(code, locale)).join(', ')}
              </p>
            )
          )}
        </div>
      </button>
    </li>
  );
}
