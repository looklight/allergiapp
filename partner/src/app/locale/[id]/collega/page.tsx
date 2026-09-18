'use client';

// ASSOCIARE IL LOCALE AL SUO RISTORANTE SU ALLERGIAPP (parte 2 del
// collegamento; design in MONETIZATION.md «Associazione locale ↔ ristorante»).
//
// Una pagina sola, a passi, nell'ordine in cui il ristoratore ragiona:
//   1. cerca       città (o CAP) e nome, poi «Cerca» (18/09)
//   2. conferma    indirizzo e mappa: «è questo il tuo locale?»
//   3. azienda     paese, ragione sociale, P.IVA, dichiarazione (in arrivo)
//   4. esito       associato, o richiesta all'admin (in arrivo)
// Una pagina e non una finestra sopra la scheda: sul telefono i passi hanno
// bisogno di tutto lo schermo, e un indirizzo proprio si può riaprire.
//
// Le regole non stanno qui: chi può associare cosa lo decide il database
// (721, 723). La pagina chiede e mostra.
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { fill, useI18n } from '@/lib/i18n';
import { useVenues } from '@/lib/venues';
import { abbonamentoDi, useSubscriptions } from '@/lib/subscriptions';
import { MAX_RESULTS, searchRestaurants, type RestaurantHit } from '@/lib/association';
import { cuisineLabels } from '@/lib/cuisines';
import { PageIntro, PageTitle } from '@/components/PageHeading';
import StaticMap from '@/components/StaticMap';

// Sotto le due lettere il database non cerca (723): il pulsante resta spento.
const MIN_LETTERE = 2;

type Fase = 'cerca' | 'conferma' | 'azienda';

export default function LinkRestaurantPage() {
  const { d, locale } = useI18n();
  const params = useParams<{ id: string }>();
  const { venues } = useVenues();
  const { subs } = useSubscriptions();
  const venue = venues?.find((v) => v.id === params.id) ?? null;

  // null = non ancora riempito col nome del locale, che arriva col database
  const [nome, setNome] = useState<string | null>(null);
  const [citta, setCitta] = useState('');
  const [hits, setHits] = useState<RestaurantHit[] | null>(null);
  const [cercando, setCercando] = useState(false);
  const [errore, setErrore] = useState(false);
  const [scelto, setScelto] = useState<RestaurantHit | null>(null);
  const [fase, setFase] = useState<Fase>('cerca');
  // Scarta le risposte di una ricerca superata da una più nuova: la rete non
  // garantisce l'ordine, e la vecchia che arriva per ultima coprirebbe la
  // giusta.
  const ultima = useRef(0);

  // Il campo parte col nome del locale: spesso è anche il nome del
  // ristorante, e basta aggiungere la città.
  useEffect(() => {
    if (venue && nome === null) setNome(venue.venueName.trim());
  }, [venue, nome]);

  const pronto = citta.trim().length >= MIN_LETTERE && (nome ?? '').trim().length >= MIN_LETTERE;

  // SI CERCA COL PULSANTE, NON A OGNI LETTERA (richiesta dell'utente, 18/09):
  // con due campi da riempire i risultati di mezzo — la città a metà, il nome
  // senza la città — erano solo rumore che cambiava sotto le dita. Invio nei
  // campi fa lo stesso: è un modulo.
  async function cerca(e: React.FormEvent) {
    e.preventDefault();
    if (!pronto || cercando) return;
    const giro = ++ultima.current;
    setCercando(true);
    const risultati = await searchRestaurants((nome ?? '').trim(), citta.trim());
    if (giro !== ultima.current) return;
    setCercando(false);
    setErrore(risultati === null);
    setHits(risultati ?? []);
  }

  if (!venues) {
    return <p className="text-sm text-gray-500">{d.common.loading}</p>;
  }
  if (!venue) {
    return (
      <div>
        <p className="mb-3 text-sm text-gray-600">{d.home.notFound}</p>
        <Link href="/" className="text-sm font-medium text-gray-900 underline">
          {d.home.backToList}
        </Link>
      </div>
    );
  }

  const abbonato = abbonamentoDi(subs, venue.id) !== null;
  const fraseIntro = d.link.intro.split('{venue}');

  return (
    // Più larga delle pagine di sola lettura (max-w-xl): città e nome stanno
    // sulla stessa riga col pulsante, e una città dal nome lungo deve starci
    // intera (richiesta dell'utente, 19/09). Risultati e conferma seguono la
    // stessa larghezza, così la pagina non cambia misura fra un passo e l'altro.
    <div className="max-w-3xl">
      <Link
        href={`/locale/${venue.id}`}
        className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-gray-500 hover:text-gray-900"
      >
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M15 6l-6 6 6 6" />
        </svg>
        {d.link.back}
      </Link>
      <PageTitle>{d.link.title}</PageTitle>
      <PageIntro className="mb-8">
        {fraseIntro[0]}
        <span className="font-medium text-gray-900">{venue.venueName.trim() || d.home.unnamed}</span>
        {fraseIntro[1]}
      </PageIntro>

      {venue.cardId !== null ? (
        // Il riquadro della scheda dice già cosa fare di un locale associato
        // (scollegare, mettere in pausa): qui basta non ricominciare.
        <p className="text-sm text-gray-600">{d.link.alreadyLinked}</p>
      ) : subs !== null && !abbonato ? (
        // Prima l'abbonamento, poi l'associazione (15/09): lo pretende anche
        // il database, ma dirlo qui evita una ricerca che finirebbe in un
        // errore all'ultimo passo.
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-600">{d.link.needsSubscription}</p>
          <div className="mt-4 flex justify-end">
            <Link
              href="/abbonamenti"
              className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-700"
            >
              {d.link.needsSubscriptionCta}
            </Link>
          </div>
        </div>
      ) : fase === 'conferma' && scelto ? (
        <Conferma
          hit={scelto}
          onYes={() => setFase('azienda')}
          onNo={() => {
            setScelto(null);
            setFase('cerca');
          }}
        />
      ) : fase === 'azienda' && scelto ? (
        <p className="text-sm text-gray-500">{d.common.comingSoon}</p>
      ) : (
        <>
          {/* DUE CAMPI E NON UNO (richiesta dell'utente, 18/09): il nome si
              cerca nel nome, la città in città e indirizzo. Con un campo solo
              «trattoria roma» cercata a Milano trovava anche i locali di Roma.
              PRIMA LA CITTÀ, E OBBLIGATORIA: col solo nome, un «Pizzeria…»
              ne trova centinaia e il proprio può restare fuori dai primi 20;
              dentro una città, oggi, nemmeno il nome più comune ci arriva.
              Accetta anche il CAP, che sta nell'indirizzo. Il nome arriva già
              scritto col nome del locale, quindi si parte dalla città.
              Città e nome larghi uguali: un comune come «San Giovanni in
              Persiceto» è lungo quanto un nome di ristorante. */}
          <form
            onSubmit={cerca}
            className="grid items-end gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]"
          >
            <Campo
              id="ricerca-citta"
              label={d.link.cityLabel}
              value={citta}
              onChange={setCitta}
              placeholder={d.link.cityPlaceholder}
              autoFocus
            />
            <Campo
              id="ricerca-nome"
              label={d.link.nameLabel}
              value={nome ?? ''}
              onChange={setNome}
              placeholder={d.link.namePlaceholder}
            />
            <button
              type="submit"
              disabled={!pronto || cercando}
              className="rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-gray-700 disabled:opacity-40"
            >
              {cercando ? d.link.searching : d.link.searchButton}
            </button>
          </form>

          <div className="mt-4" aria-live="polite">
            {/* Prima della prima ricerca sotto non c'è niente: i campi e il
                pulsante dicono già cosa fare. */}
            {errore ? (
              <p className="text-sm text-[#C0392B]">{d.link.searchError}</p>
            ) : hits && hits.length === 0 ? (
              <p className="text-sm text-gray-500">{d.link.noResults}</p>
            ) : hits ? (
              // Mentre arriva la ricerca nuova restano i risultati di prima,
              // appena sbiaditi: sparire e ricomparire fa saltare la pagina.
              <>
                {/* AL LIMITE DEI RISULTATI, il proprio potrebbe essere
                    rimasto fuori senza che si veda: lo si dice. Oggi dentro
                    una città non ci si arriva; col database che cresce sì. */}
                {hits.length >= MAX_RESULTS && (
                  <p className="mb-3 text-sm text-gray-600">{d.link.tooMany}</p>
                )}
                <ul className={`space-y-2 transition-opacity ${cercando ? 'opacity-60' : ''}`}>
                  {hits.map((hit) => (
                    <li key={hit.id}>
                      <Risultato
                        hit={hit}
                        locale={locale}
                        onChoose={() => {
                          setScelto(hit);
                          setFase('conferma');
                        }}
                      />
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
          </div>

          {/* Il ristorante che non c'è (18/09): la strada normale è l'app con
              una recensione; se non va, ci si scrive. Sempre in vista e
              non solo a ricerca vuota: chi trova un omonimo nella città
              sbagliata deve saperlo lo stesso. */}
          <div className="mt-8 border-t border-gray-200 pt-5">
            <p className="text-sm font-medium text-gray-900">{d.link.notFoundTitle}</p>
            <p className="mt-1 text-sm text-gray-600">{d.link.notFoundText}</p>
            <p className="mt-2 text-sm text-gray-600">
              {d.link.notFoundContact}{' '}
              <a
                href={`mailto:info@allergiapp.com?subject=${encodeURIComponent(d.link.notFoundSubject)}`}
                className="font-medium text-gray-900 underline"
              >
                info@allergiapp.com
              </a>
            </p>
          </div>
        </>
      )}
    </div>
  );
}

function Campo({
  id,
  label,
  value,
  onChange,
  placeholder,
  autoFocus = false,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  autoFocus?: boolean;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-gray-400" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        autoComplete="off"
        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm focus:border-gray-900 focus:outline-none"
      />
    </div>
  );
}

function Risultato({
  hit,
  locale,
  onChoose,
}: {
  hit: RestaurantHit;
  locale: 'it' | 'en';
  onChoose: () => void;
}) {
  const { d } = useI18n();
  const cucine = cuisineLabels(hit.cuisines, locale);
  const libero = hit.holder === 'free';

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-gray-900">{hit.name}</p>
        <p className="mt-0.5 text-xs text-gray-500">{hit.address || hit.city}</p>
        {cucine.length > 0 && <p className="mt-0.5 text-xs text-gray-400">{cucine.join(' · ')}</p>}
        {!libero && (
          <p className="mt-1.5 text-xs font-medium text-gray-600">
            {hit.holder === 'yours' ? d.link.yours : d.link.taken}
          </p>
        )}
      </div>
      {libero && (
        <button
          type="button"
          onClick={onChoose}
          className="shrink-0 rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:border-gray-400"
        >
          {d.link.choose}
        </button>
      )}
    </div>
  );
}

function Conferma({ hit, onYes, onNo }: { hit: RestaurantHit; onYes: () => void; onNo: () => void }) {
  const { d, locale } = useI18n();
  const cucine = cuisineLabels(hit.cuisines, locale);

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <h2 className="text-base font-medium text-gray-900">{d.link.confirmTitle}</h2>
      <div className="mt-4">
        <StaticMap
          latitude={hit.latitude}
          longitude={hit.longitude}
          label={fill(d.link.mapLabel, { name: hit.name })}
        />
      </div>
      <p className="mt-4 text-sm font-medium text-gray-900">{hit.name}</p>
      <p className="mt-0.5 text-sm text-gray-600">{hit.address || hit.city}</p>
      {cucine.length > 0 && <p className="mt-0.5 text-xs text-gray-400">{cucine.join(' · ')}</p>}
      <div className="mt-5 flex flex-wrap justify-end gap-2">
        <button
          type="button"
          onClick={onNo}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:border-gray-400"
        >
          {d.link.confirmNo}
        </button>
        <button
          type="button"
          onClick={onYes}
          className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-700"
        >
          {d.link.confirmYes}
        </button>
      </div>
    </div>
  );
}
