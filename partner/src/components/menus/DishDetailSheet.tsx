'use client';

// Il dettaglio di un piatto, aperto toccando la riga nell'anteprima: foto
// grande, descrizione intera, e — quello che la riga compatta non mostra
// mai per intero — TUTTI gli allergeni dichiarati e TUTTE le esigenze che
// soddisfa. Nella lista si vede solo quello che riguarda il filtro acceso;
// chi ha un'allergia vuole poter controllare l'elenco completo prima di
// ordinare, non solo il pezzo che il filtro ha scelto di mostrargli.
//
// UN POPUP AL CENTRO, non più un foglio che sale dal basso. Il foglio dal
// basso è il gesto del telefono — si trascina giù per chiuderlo — ma quel
// trascinamento non c'è mai stato: restava una scheda incollata al bordo,
// senza un modo evidente di chiuderla. Adesso ha la sua X, si chiude toccando
// fuori, ed è più bassa: la foto si guarda 4:3 invece che quadrata, così gli
// allergeni stanno nella stessa schermata del piatto.
//
// LE FRECCINE scorrono la carta nell'ordine in cui si vede — col filtro
// acceso è già riordinata — perché chi legge un menù confronta due o tre
// piatti, e senza di loro ogni confronto costa chiudi-scorri-riapri.
//
// ⚠️ QUESTA È LA COPIA GEMELLA della pagina pubblica (landing:
// lib/render-menu.js + menu-page.css/.js): se divergono, il ristoratore
// sceglie guardando una cosa e il suo cliente ne trova un'altra.
//
// Niente pagina vera e nessun URL da gestire: chiuderlo torna esattamente al
// menù. Niente useModal, che blocca lo scroll della PAGINA DEL PORTALE mentre
// qui dentro c'è solo lo schermo simulato del cliente. Di quello resta
// useEscape — dentro l'anteprima a telefono questa finestra è dentro
// un'altra, e con un ascoltatore per conto suo un Esc le chiudeva tutte e
// due.
import { useI18n } from '@/lib/i18n';
import { useEscape } from '@/lib/useModal';
import { ALLERGENS } from '@/lib/allergens';
import { dietNeedName } from '@/lib/diets';
import { displayPrice, type MenuItem } from '@/lib/menus';
import type { Dish } from '@/lib/dishes';
import type { ViewerNeeds } from './MenuPreview';

export default function DishDetailSheet({
  item,
  dish,
  suffisso,
  showPhoto,
  currency,
  needs,
  onPrev,
  onNext,
  onClose,
}: {
  item: MenuItem;
  dish: Dish;
  // il carattere scelto per i testi principali: '' se è quello di sistema
  suffisso: string;
  // Il ristoratore ha spento le foto sul menù al tavolo: spente vuol dire
  // spente anche qui. Un'eccezione ("in lista no, nel dettaglio sì") sarebbe
  // una regola in più da spiegare, e chi le nasconde perché sono disomogenee
  // non le vuole nemmeno aprendo il piatto.
  showPhoto: boolean;
  currency: string;
  needs: ViewerNeeds;
  // I due vicini nella carta, o null ai capi. Le freccine non spariscono mai:
  // si spengono, o arrivati in fondo l'altra si sposterebbe sotto il dito.
  onPrev: (() => void) | null;
  onNext: (() => void) | null;
  onClose: () => void;
}) {
  const { d, locale } = useI18n();
  useEscape(onClose);

  const prezzo = displayPrice(item.priceCents, currency, locale);
  // Gli allergeni dichiarati nell'ordine fisso di ALLERGENS (non in quello di
  // inserimento del ristoratore): stessa lista che vede ovunque, stesso ordine.
  const dichiarati = ALLERGENS.filter((a) => dish.allergens.includes(a.code));
  const contengono = new Set(needs.allergens.filter((code) => dish.allergens.includes(code)));

  return (
    <div
      className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/45 p-3"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={dish.name}
        onClick={(e) => e.stopPropagation()}
        className="max-h-full w-full overflow-y-auto rounded-2xl bg-white pb-4 shadow-xl"
      >
        {/* La barra dei comandi resta in vista mentre si scorre: la X di un
            popup che se ne va in cima è la X che non si trova più. */}
        <div className="sticky top-0 z-10 flex items-center gap-1.5 bg-white px-2.5 pb-1 pt-2">
          <Comando etichetta={d.menuPublic.dishDetailPrev} onClick={onPrev}>
            <path d="M15 18l-6-6 6-6" />
          </Comando>
          <Comando etichetta={d.menuPublic.dishDetailNext} onClick={onNext}>
            <path d="M9 6l6 6-6 6" />
          </Comando>
          <span className="ml-auto">
            <Comando etichetta={d.common.close} onClick={onClose}>
              <path d="M6 6l12 12M18 6L6 18" />
            </Comando>
          </span>
        </div>

        {/* La foto arriva QUADRATA (photos.ts ritaglia un canvas square al
            caricamento), ma dentro un popup un quadrato a tutta larghezza si
            mangiava la finestra e spingeva gli allergeni sotto il bordo —
            cioè la cosa per cui il piatto si apre. Si guarda 4:3: si perde un
            quarto dell'altezza al centro, e si vede il piatto INSIEME a quello
            che c'è scritto sotto. */}
        {showPhoto && dish.photoUrl !== '' && (
          <div className="px-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={dish.photoUrl}
              alt=""
              className="aspect-[4/3] w-full rounded-xl object-cover"
            />
          </div>
        )}

        <div className="px-4 pt-3">
          <div className="flex items-baseline justify-between gap-3">
            <h3
              className={`text-[calc(19px*var(--ms))] font-semibold leading-snug text-gray-900${
                suffisso === '' ? '' : ` name${suffisso}`
              }`}
            >
              {dish.name}
            </h3>
            {prezzo !== '' && (
              <p
                className={`shrink-0 text-[calc(18px*var(--ms))] font-semibold tabular-nums text-gray-900${
                  suffisso === '' ? '' : ` price${suffisso}`
                }`}
              >
                {prezzo}
              </p>
            )}
          </div>

          {dish.description.trim() !== '' && (
            <p className="mt-1.5 text-[calc(15px*var(--ms))] leading-snug text-gray-600">{dish.description}</p>
          )}

          <div className="mt-3">
            <p className="text-[10px] font-medium uppercase tracking-wide text-gray-400">
              {d.menuPublic.dishDetailAllergensTitle}
            </p>
            {dichiarati.length === 0 ? (
              <p className="mt-1 text-[calc(15px*var(--ms))] text-gray-500">{d.menuPublic.dishDetailNoAllergens}</p>
            ) : (
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {dichiarati.map((a) => {
                  // In rosso solo quelli che il cliente ha scelto di evitare:
                  // gli altri restano neutri, non è colpa loro se il filtro è
                  // acceso su qualcos'altro.
                  const evitato = contengono.has(a.code);
                  return (
                    <span
                      key={a.code}
                      className={`rounded-full border px-2.5 py-1 text-[calc(13px*var(--ms))] font-medium ${
                        evitato
                          ? 'border-red-200 bg-red-50 text-red-700'
                          : 'border-gray-200 bg-gray-50 text-gray-600'
                      }`}
                    >
                      {a[locale]}
                    </span>
                  );
                })}
              </div>
            )}
          </div>

          {dish.dietTags.length > 0 && (
            <div className="mt-3">
              <p className="text-[10px] font-medium uppercase tracking-wide text-gray-400">
                {d.menuPublic.dishDetailDietsTitle}
              </p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {dish.dietTags.map((code) => (
                  <span
                    key={code}
                    className="rounded-full border border-green-200 bg-green-50 px-2.5 py-1 text-[calc(13px*var(--ms))] font-medium text-green-700"
                  >
                    {dietNeedName(code, locale)}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* In fondo e non sotto la foto: lì rompeva le proporzioni fra
              immagine e titolo. Un avviso diverso da quello sugli
              allergeni — qui si dice che la foto è indicativa, non che gli
              ingredienti non sono verificati. */}
          {showPhoto && dish.photoUrl !== '' && (
            <p className="mt-3 border-t border-gray-100 pt-2.5 text-[10px] leading-snug text-gray-400">
              {d.menuPublic.dishDetailPhotoDisclaimer}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// Un comando della barra: freccia o X, stessa forma. Spento invece che
// assente quando non c'è dove andare (v. onPrev/onNext).
function Comando({
  etichetta,
  onClick,
  children,
}: {
  etichetta: string;
  onClick: (() => void) | null;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick ?? undefined}
      disabled={onClick === null}
      aria-label={etichetta}
      title={etichetta}
      className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-30 disabled:hover:bg-white"
    >
      <svg
        className="h-4 w-4"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        {children}
      </svg>
    </button>
  );
}
