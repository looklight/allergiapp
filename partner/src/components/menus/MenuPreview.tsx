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
// Ma si vedono **da due menù in su**. Il nome di un menù serve a distinguerlo
// da un altro: con un menù solo la linguetta è un'etichetta che al cliente non
// dice niente e per giunta non si può premere. (Prima c'era sempre, per far
// capire nell'editor che i menù possono essere più d'uno: didattica pagata dal
// cliente al tavolo, che di quel ripasso non sa che farsene.)
import { fill, useI18n } from '@/lib/i18n';
import { ALLERGENS, allergenName } from '@/lib/allergens';
import { DIETS, dietNeedName } from '@/lib/diets';
import { dishThumb, type Dish } from '@/lib/dishes';
import { displayPrice, menuItems, type Menu, type MenuItem } from '@/lib/menus';
import { DEFAULT_LOGO, accentHex, type MenuBrand } from '@/lib/menuBrand';

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
  venueName,
  needs,
  onToggleNeed,
}: {
  menu: Menu;
  // gli altri menù dello stesso locale: diventano le linguette
  siblings: Menu[];
  dishes: Dish[];
  brand: MenuBrand;
  venueName: string;
  needs: ViewerNeeds;
  onToggleNeed: (kind: 'allergens' | 'diets', code: string) => void;
}) {
  const { d, locale } = useI18n();
  const accent = accentHex(brand.accent);
  const dishById = (id: string) => dishes.find((dish) => dish.id === id);

  const nelMenu = menuItems(menu)
    .map((item) => dishById(item.dishId))
    .filter((dish): dish is Dish => dish !== undefined);

  // Si offrono SOLO gli allergeni che qualche piatto dichiara e le esigenze
  // che qualche piatto soddisfa: una pastiglia che non toglie niente è un
  // bottone che non fa niente, e una che svuota il menù è peggio.
  const allergeniUsati = ALLERGENS.filter((a) => nelMenu.some((dish) => dish.allergens.includes(a.code)));
  const esigenzeUsate = DIETS.filter((t) => nelMenu.some((dish) => dish.dietTags.includes(t.code)));

  const scelte = needs.allergens.length + needs.diets.length;
  const adatti = nelMenu.filter((dish) => !esclusa(esclusione(dish, needs))).length;

  const gruppi = [
    { id: 'loose', name: '', description: '', items: menu.loose },
    ...menu.sections.map((s) => ({ id: s.id, name: s.name, description: s.description, items: s.items })),
  ].filter((g) => g.items.length > 0);

  return (
    <div className="flex h-full flex-col bg-white">
      {/* Intestazione: la fascia colorata è l'unico posto in cui il colore
          scelto fa da fondo. Sul testo dei piatti resterebbe una scelta di
          contrasto lasciata al ristoratore, che il Tema 8 non concede. */}
      <div className="shrink-0 px-4 pb-3 pt-4 text-white" style={{ backgroundColor: accent }}>
        <div className="flex items-center gap-2.5">
          {/* Il logo c'è sempre: senza uno caricato compare quello di
              AllergiApp (v. DEFAULT_LOGO). Un'intestazione col solo nome
              scritto sembra una pagina non finita. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={brand.logoUrl || DEFAULT_LOGO}
            alt=""
            className="h-9 w-9 shrink-0 rounded-full bg-white object-cover"
          />
          <p className="min-w-0 flex-1 truncate text-[15px] font-semibold">{venueName}</p>
        </div>

        {/* Descrizione del menù: facoltativa, quello che il ristoratore ha
            scritto sotto il titolo nell'editor (orari, un avviso). */}
        {menu.description.trim() !== '' && (
          <p className="mt-1.5 whitespace-pre-line text-[12px] leading-snug text-white/85">
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
      {(allergeniUsati.length > 0 || esigenzeUsate.length > 0) && (
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
          <div className="-mx-4 mt-1.5 flex gap-1.5 overflow-x-auto px-4 pb-0.5">
            {allergeniUsati.map((a) => (
              <Pastiglia
                key={`a-${a.code}`}
                label={`${d.preview.withoutPrefix} ${a[locale].toLowerCase()}`}
                selected={needs.allergens.includes(a.code)}
                accent={accent}
                onClick={() => onToggleNeed('allergens', a.code)}
              />
            ))}
            {esigenzeUsate.map((t) => (
              <Pastiglia
                key={`d-${t.code}`}
                label={dietNeedName(t.code, locale)}
                selected={needs.diets.includes(t.code)}
                accent={accent}
                onClick={() => onToggleNeed('diets', t.code)}
              />
            ))}
          </div>
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-6 pt-3">
        {gruppi.length === 0 ? (
          <p className="pt-10 text-center text-sm text-gray-400">{d.menuEditor.previewEmpty}</p>
        ) : (
          gruppi.map((gruppo) => {
            // "La carta si riordina", non si accorcia (Tema 2). I piatti che
            // non vanno bene restano leggibili in fondo alla loro sezione,
            // col motivo scritto: nasconderli darebbe l'impressione che il
            // ristorante non abbia altro, e su un dato DICHIARATO e non
            // verificato una sparizione è una promessa che non possiamo fare.
            const righe = [...gruppo.items].sort((a, b) => {
              const da = dishById(a.dishId);
              const db = dishById(b.dishId);
              const ea = da ? esclusa(esclusione(da, needs)) : false;
              const eb = db ? esclusa(esclusione(db, needs)) : false;
              return Number(ea) - Number(eb);
            });
            return (
              <section key={gruppo.id} className="mb-4">
                {gruppo.name.trim() !== '' && (
                  <h3
                    className="mb-1 border-b pb-1 text-[13px] font-semibold uppercase tracking-wide"
                    style={{ color: accent, borderColor: `${accent}33` }}
                  >
                    {gruppo.name}
                  </h3>
                )}
                {gruppo.description.trim() !== '' && (
                  <p className="mb-2 whitespace-pre-line text-[11px] leading-snug text-gray-500">
                    {gruppo.description}
                  </p>
                )}
                <ul className="space-y-2.5">
                  {righe.map((item) => (
                    <Riga
                      key={item.id}
                      item={item}
                      dish={dishById(item.dishId)}
                      currency={menu.currency}
                      locale={locale}
                      needs={needs}
                    />
                  ))}
                </ul>
              </section>
            );
          })
        )}

        {/* Lo stesso avviso della scheda in app: quello che il cliente legge
            è dichiarato dal ristorante, non verificato da noi. Sul menù al
            tavolo non è meno vero — è più vero, perché lì sta per ordinare. */}
        {gruppi.length > 0 && (
          <p className="mt-2 border-t border-gray-100 pt-3 text-[10px] leading-snug text-gray-400">
            {d.preview.disclaimer}
          </p>
        )}
      </div>
    </div>
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
  currency,
  locale,
  needs,
}: {
  item: MenuItem;
  dish: Dish | undefined;
  currency: string;
  locale: 'it' | 'en';
  needs: ViewerNeeds;
}) {
  const { d } = useI18n();
  if (!dish) return null;

  const prezzo = displayPrice(item.priceCents, currency, locale);
  const perche = esclusione(dish, needs);
  const fuori = esclusa(perche);

  return (
    <li
      className={`${fuori ? 'opacity-45' : ''} ${
        item.highlighted ? '-mx-1.5 rounded-lg bg-amber-50 px-1.5 py-1' : ''
      }`}
    >
      <div className="flex gap-2.5">
        {/* Un piatto senza foto tiene comunque lo spazio: senza, le righe
            fotografate e quelle no avrebbero il testo che parte da punti
            diversi, e la carta sembrerebbe storta scorrendola. */}
        {dishThumb(dish) !== '' ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={dishThumb(dish)} alt="" className="h-11 w-11 shrink-0 rounded-lg object-cover" />
        ) : (
          <div className="h-11 w-11 shrink-0 rounded-lg bg-gray-100" />
        )}
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
            <p className="min-w-0 flex-1 text-[13px] font-medium leading-snug text-gray-900">
              {dish.name}
            </p>
            {/* Un piatto senza prezzo non mostra niente: una riga vuota o uno
                zero al tavolo sono peggio del silenzio */}
            {prezzo !== '' && (
              <p className="shrink-0 text-[13px] font-semibold tabular-nums text-gray-900">{prezzo}</p>
            )}
          </div>
          {dish.description.trim() !== '' && (
            <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-gray-500">
              {dish.description}
            </p>
          )}
          {item.highlighted && item.highlightNote.trim() !== '' && (
            <p className="mt-0.5 text-[11px] font-medium leading-snug text-amber-700">
              {item.highlightNote}
            </p>
          )}
          {/* Col filtro acceso il motivo prende il posto dell'elenco intero:
              chi ha appena toccato "senza glutine" vuole sapere perché QUESTO
              piatto è finito in fondo, non rileggere tutti i suoi allergeni. */}
          {fuori ? (
            <p className="mt-1 text-[10px] font-medium leading-snug text-gray-500">
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
              <p className="mt-1 text-[10px] leading-snug text-gray-400">
                {d.preview.contains}{' '}
                {dish.allergens.map((code) => allergenName(code, locale)).join(', ')}
              </p>
            )
          )}
        </div>
      </div>
    </li>
  );
}
