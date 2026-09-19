'use client';

// Maschera di creazione: si dà un nome al locale e si vede cosa ci si fa
// dentro. Il nome NON è un'etichetta privata — è quello che i clienti leggono
// in cima al menù al tavolo (Tema 16). Gli esempi sono gli elementi veri del
// menù, dell'editor e della scheda (filtro, pill dei link, riga piatto con
// allergeni), non disegni.
//
// DUE COSE, MENÙ PRIMA (19/09). Fino ad allora qui c'era solo la scheda
// AllergiApp — la cosa che si fa per seconda, e non tutti. Ora sopra c'è il
// menù al tavolo, gratis, che è quello che la maggior parte dei ristoratori
// viene a fare. Due blocchi sempre visibili e non un interruttore: sono
// indipendenti. Niente distintivi Gratis/Pro sulle linguette (tolti il 19/09):
// il menù non è tutto gratis — l'aspetto è Pro — e un'etichetta per parte
// diceva una cosa sbagliata. Le due parti stanno su due LINGUETTE (scelta
// dell'utente):
// una sotto l'altra la finestra diventava lunga il doppio. Le linguette
// spiegano, non scelgono: il locale fa tutte e due le cose. Provato anche in
// versione a parole e sulla home vuota: scartato dall'utente, che vuole
// l'infografica e solo qui.
import { useId, useState } from 'react';
import { useI18n } from '@/lib/i18n';
import { useModal } from '@/lib/useModal';
import { allergenName } from '@/lib/allergens';
import { LINK_ORDER, type LinkKind } from '@/lib/linkKinds';
import LinkPill from '@/components/LinkPill';

// Allergeni dei piatti di esempio, nell'ordine di newVenue.sampleDishes
const SAMPLE_ALLERGENS = [['gluten', 'eggs'], ['crustaceans'], ['milk', 'eggs']];

function Step({
  n,
  title,
  children,
}: {
  n: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-2.5">
      <span className="mt-px flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-gray-300 text-[11px] font-medium text-gray-500">
        {n}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] text-gray-600">{title}</p>
        <div className="mt-1.5">{children}</div>
      </div>
    </div>
  );
}

type Parte = 'menu' | 'app';

export default function NewVenueDialog({
  onCancel,
  onCreate,
}: {
  onCancel: () => void;
  onCreate: (venueName: string) => void;
}) {
  const { d, locale } = useI18n();
  const [name, setName] = useState('');
  // Si apre sul menù: è quello che la maggior parte viene a fare
  const [parte, setParte] = useState<Parte>('menu');
  const tabsId = useId();

  const panel = useModal<HTMLDivElement>(onCancel);
  const titleId = useId();

  // nello schema a sinistra c'è il locale: senza nome lo dice, non ne finge uno
  const venueLabel = name.trim() || d.newVenue.yourVenue;
  const LINK_LABELS: Record<LinkKind, string> = {
    booking: d.editor.linkBooking,
    delivery: d.editor.linkDelivery,
    menu: d.editor.linkMenu,
    website: d.editor.linkWebsite,
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onCancel}
    >
      <div className="backdrop-enter absolute inset-0 bg-black/40" />
      <div
        ref={panel}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="dialog-enter relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl outline-none"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id={titleId} className="mb-4 text-lg font-semibold text-gray-900">
          {d.newVenue.title}
        </h2>

        <label className="mb-1 block text-sm font-medium text-gray-700">
          {d.editor.venueNameLabel}
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onCreate(name.trim());
          }}
          placeholder={d.editor.venueNamePlaceholder}
          className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-gray-900 focus:outline-none"
        />
        <p className="mt-1.5 text-xs text-gray-500">{d.newVenue.nameHint}</p>

        <div className="mt-6 border-t border-gray-200 pt-4">
          <p className="mb-3 text-xs font-medium uppercase tracking-wide text-gray-400">
            {d.newVenue.how}
          </p>
          <div role="tablist" aria-label={d.newVenue.how} className="mb-4 grid grid-cols-2 rounded-lg border border-gray-300 p-0.5">
            {([
              { id: 'menu', title: d.newVenue.menuTitle },
              { id: 'app', title: d.newVenue.appTitle },
            ] as const).map(({ id, title }) => (
              <button
                key={id}
                type="button"
                role="tab"
                id={`${tabsId}-${id}-tab`}
                aria-selected={parte === id}
                aria-controls={`${tabsId}-${id}`}
                onClick={() => setParte(id)}
                className={`min-w-0 rounded-md px-2 py-1.5 text-[13px] font-medium transition-colors ${
                  parte === id ? 'bg-gray-900 text-white' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <span className="truncate">{title}</span>
              </button>
            ))}
          </div>

          {/* Le due parti occupano la STESSA cella della griglia: quella
              nascosta resta lì invisibile e tiene l'altezza della più alta,
              così cambiando linguetta la finestra non salta.
              Lo sfondo grigio dice che quello che c'è dentro è un ESEMPIO,
              non una cosa del proprio locale: i riquadri bianchi sopra sono
              i pezzi veri del menù e della scheda. */}
          <div className="grid rounded-xl bg-gray-100 p-4">
            {/* IL MENÙ AL TAVOLO, nella stessa forma della scheda: due passi,
                prima cosa fai tu, poi cosa fa il cliente. Così le due
                linguette hanno la stessa misura e si leggono allo stesso modo.
                L'elenco del cliente è astratto (righe, non piatti veri):
                spuntati in cima quelli adatti, in fondo e più chiaro quello
                che non va — il filtro RIORDINA, non nasconde (Tema 18).
                Provate e scartate il 19/09: un menù e un telefono disegnati
                coi piatti d'esempio (troppo spazio), tre icone in fila
                («il cliente lo filtra» non si capiva). */}
            <div
              role="tabpanel"
              id={`${tabsId}-menu`}
              aria-labelledby={`${tabsId}-menu-tab`}
              inert={parte !== 'menu'}
              className={`col-start-1 row-start-1 self-center ${parte === 'menu' ? '' : 'invisible'}`}
            >
              <div className="space-y-4">
                <Step n={1} title={d.newVenue.menuStep1}>
                  <div className="flex items-center gap-2">
                    {/* racchiuse in un riquadro largo quanto serve, non quanto
                        la riga: freccia e QR gli stanno subito accanto invece
                        di finire in fondo alla finestra */}
                    <div className="flex min-w-0 flex-wrap gap-1 rounded-lg border border-gray-200 bg-white px-2.5 py-2">
                      {d.newVenue.menuParts.map((part) => (
                        <span key={part} className="rounded-full border border-gray-300 px-2 py-0.5 text-[11px] font-medium text-gray-700">
                          {part}
                        </span>
                      ))}
                    </div>
                    <svg className="h-4 w-4 shrink-0 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M4 12h15M13 6l6 6-6 6" />
                    </svg>
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-700">
                      {/* il QR: i tre quadrati agli angoli, come nella pagina d'accesso */}
                      <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" />
                        <rect x="13.5" y="3.5" width="7" height="7" rx="1.5" />
                        <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" />
                        <path d="M13.5 13.5h3v3h-3zM20.5 13.5v.01M13.5 20.5v.01M17.5 17.5h3M20.5 20.5h.01" />
                      </svg>
                    </span>
                  </div>
                </Step>

                <Step n={2} title={d.newVenue.menuStep2}>
                  <div className="flex items-center gap-2">
                    {/* il QR sul tavolo, che il telefono inquadra */}
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-700">
                      <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" />
                        <rect x="13.5" y="3.5" width="7" height="7" rx="1.5" />
                        <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" />
                        <path d="M13.5 13.5h3v3h-3zM20.5 13.5v.01M13.5 20.5v.01M17.5 17.5h3M20.5 20.5h.01" />
                      </svg>
                    </span>
                    <svg className="h-4 w-4 shrink-0 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M4 12h15M13 6l6 6-6 6" />
                    </svg>
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-700">
                      {/* il telefono del cliente */}
                      <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <rect x="6" y="2.5" width="12" height="19" rx="2.5" />
                        <path d="M10.5 18.5h3" />
                      </svg>
                    </span>
                    <svg className="h-4 w-4 shrink-0 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M4 12h15M13 6l6 6-6 6" />
                    </svg>
                    <div className="min-w-0 flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2">
                      {/* le allergie scelte dal cliente */}
                      <div className="flex flex-wrap gap-1">
                        {['gluten', 'milk'].map((code) => (
                          <span key={code} className="inline-flex items-center gap-1 rounded-full bg-gray-900 px-2 py-0.5 text-[10px] font-medium text-white">
                            <svg className="h-2.5 w-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                              <path d="M5 12.5l4.5 4.5L19 7.5" />
                            </svg>
                            {allergenName(code, locale)}
                          </span>
                        ))}
                      </div>
                      {/* il menù riordinato: gli adatti in cima, spuntati */}
                      <div className="mt-2 space-y-1.5" aria-hidden="true">
                        {/* col prezzo in fondo alla riga, piccolo: c'è tutto quello
                            che c'è in un menù, senza che il disegno cresca */}
                        {[
                          { ok: true, w: 'w-4/5', price: '12 €' },
                          { ok: true, w: 'w-3/5', price: '9 €' },
                          { ok: false, w: 'w-2/3', price: '14 €' },
                        ].map(({ ok, w, price }, i) => (
                          <div key={i} className={`flex items-center gap-1.5 ${ok ? '' : 'opacity-40'}`}>
                            {ok ? (
                              <svg className="h-3 w-3 shrink-0 text-[#4CAF50]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M5 12.5l4.5 4.5L19 7.5" />
                              </svg>
                            ) : (
                              <span className="h-3 w-3 shrink-0" />
                            )}
                            <span className="flex min-w-0 flex-1">
                              <span className={`h-1.5 rounded-full bg-gray-300 ${w}`} />
                            </span>
                            <span className="shrink-0 text-[9px] leading-none text-gray-400">{price}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </Step>
              </div>
            </div>

            {/* LA SCHEDA SU ALLERGIAPP: i due passi di prima */}
            <div
              role="tabpanel"
              id={`${tabsId}-app`}
              aria-labelledby={`${tabsId}-app-tab`}
              inert={parte !== 'app'}
              className={`col-start-1 row-start-1 self-center ${parte === 'app' ? '' : 'invisible'}`}
            >
              <div className="space-y-4">
                <Step n={1} title={d.newVenue.step1}>
                  <div className="space-y-1.5">
                    <div className="flex flex-nowrap gap-1 overflow-hidden">
                      {LINK_ORDER.map((kind) => (
                        <LinkPill key={kind} kind={kind} label={LINK_LABELS[kind]} active compact />
                      ))}
                    </div>
                    {/* Stessa forma del carosello piatti nella scheda: foto tonde
                        affiancate col nome sotto. Qui il segnaposto senza foto,
                        con un allergene per piatto a dire cosa si dichiara. */}
                    <div className="flex gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2.5">
                      {SAMPLE_ALLERGENS.map((codes, i) => (
                        <div key={codes[0]} className="min-w-0 flex-1 text-center">
                          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-stone-100">
                            <svg className="h-5 w-5 text-stone-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                              {/* coltello e forchetta */}
                              <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 002-2V2M7 2v20" />
                              <path d="M21 15V2a5 5 0 00-5 5v6c0 1.1.9 2 2 2h3zm0 0v7" />
                            </svg>
                          </span>
                          <p className="mt-1.5 line-clamp-2 text-[10px] leading-[13px] text-gray-700">
                            {d.newVenue.sampleDishes[i]}
                          </p>
                          <div className="mt-1 flex flex-wrap justify-center gap-1">
                            {codes.map((code) => (
                              <span
                                key={code}
                                className="rounded-full bg-[#FFF8E1] px-1.5 py-px text-[9px] font-medium text-[#8D6E00]"
                              >
                                {allergenName(code, locale)}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </Step>

                <Step n={2} title={d.newVenue.step2}>
                  {/* I due riquadri alti uguali (items-stretch) e il testo che
                      va a capo: «Il tuo ristorante su AllergiApp» in metà
                      finestra non ci sta, e tagliato non diceva più dove. */}
                  <div className="flex items-stretch gap-2">
                    <div className="flex min-w-0 flex-1 items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2.5 py-2">
                      <svg className="h-4 w-4 shrink-0 self-center text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 9l1.5-5h15L21 9" />
                        <path d="M3 9a3 3 0 006 0 3 3 0 006 0 3 3 0 006 0" />
                        <path d="M4.5 11.5V20h15v-8.5" />
                      </svg>
                      <span className="min-w-0 flex-1 truncate text-[12px] leading-tight text-gray-700">{venueLabel}</span>
                    </div>
                    <svg className="h-4 w-4 shrink-0 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 12h15M13 6l6 6-6 6" />
                    </svg>
                    <div className="flex min-w-0 flex-1 items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2.5 py-2">
                      <svg className="h-4 w-4 shrink-0 text-[#4CAF50]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 21s-7-5.5-7-11a7 7 0 1114 0c0 5.5-7 11-7 11z" />
                        <circle cx="12" cy="10" r="2.5" />
                      </svg>
                      <span className="min-w-0 flex-1 text-[12px] leading-tight text-gray-700">
                        {d.newVenue.venueOnApp}
                      </span>
                    </div>
                  </div>
                </Step>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:text-gray-900"
          >
            {d.common.cancel}
          </button>
          <button
            onClick={() => onCreate(name.trim())}
            className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-700"
          >
            {d.home.create}
          </button>
        </div>
      </div>
    </div>
  );
}
