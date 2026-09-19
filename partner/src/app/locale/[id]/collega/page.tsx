'use client';

// ASSOCIARE IL LOCALE AL SUO RISTORANTE SU ALLERGIAPP (parte 2 del
// collegamento; design in MONETIZATION.md «Associazione locale ↔ ristorante»).
//
// Una pagina sola, a passi, nell'ordine in cui il ristoratore ragiona:
//   1. cerca       città (o CAP) e nome, poi «Cerca» (18/09)
//   2. conferma    indirizzo e mappa: «è questo il tuo locale?»
//   3. azienda     «conferma che il locale è tuo»: paese, ragione sociale,
//                  P.IVA, dichiarazione — o un'azienda già inserita
//   4. richiesta   se il ristorante è di un altro account, o era stato
//                  revocato: due righe per il nostro team (721, 724)
//   5. fatto       associato — la scheda in app dopo il controllo del nostro
//                  team (724) — o richiesta inviata
// Una pagina e non una finestra sopra la scheda: sul telefono i passi hanno
// bisogno di tutto lo schermo, e un indirizzo proprio si può riaprire.
//
// Le regole non stanno qui: chi può associare cosa lo decide il database
// (721, 723). La pagina chiede e mostra.
import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { fill, useI18n } from '@/lib/i18n';
import { useVenues } from '@/lib/venues';
import { abbonamentoDi, useSubscriptions } from '@/lib/subscriptions';
import {
  MAX_RESULTS,
  linkRestaurant,
  requestRestaurant,
  restaurantPageUrl,
  saveCompany,
  searchRestaurants,
  useCompanies,
  type RestaurantHit,
} from '@/lib/association';
import { countries } from '@/lib/countries';
import { cuisineLabels } from '@/lib/cuisines';
import { PageIntro, PageTitle } from '@/components/PageHeading';
import StaticMap from '@/components/StaticMap';
import CardStateNotice from '@/components/CardStateNotice';

// Sotto le due lettere il database non cerca (723): il pulsante resta spento.
const MIN_LETTERE = 2;

type Fase = 'cerca' | 'conferma' | 'azienda' | 'richiesta' | 'fatto';
// Perché serve il nostro team: le due strade della richiesta (724). La P.IVA
// non confermata non è più una: si associa lo stesso, e il controllo viene
// dopo, prima che la scheda si veda.
type Motivo = 'taken' | 'revoked';

const cardClass = 'rounded-2xl border border-gray-200 bg-white p-5 shadow-sm';
const inputClass =
  'w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm focus:border-gray-900 focus:outline-none';
const labelClass = 'mb-1.5 block text-xs font-medium uppercase tracking-wide text-gray-400';
const primaryClass =
  'rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-700 disabled:opacity-40';
const secondaryClass =
  'rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:border-gray-400';

// Le chiavi d'errore (funzione sul server e 721) nelle parole del portale
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function messaggio(chiave: string, d: any): string {
  const mappa: Record<string, string> = {
    vat_invalid: d.link.errVat,
    name_invalid: d.link.errName,
    country_invalid: d.link.errCountry,
    restaurant_yours: d.link.errYours,
    venue_already_linked: d.link.errVenueLinked,
    subscription_required: d.link.errSubscription,
    request_open: d.link.errRequestOpen,
    too_many: d.link.errTooMany,
  };
  return mappa[chiave] ?? d.link.errGeneric;
}

export default function LinkRestaurantPage() {
  const { d, locale } = useI18n();
  const params = useParams<{ id: string }>();
  const { venues, reload: rileggiLocali } = useVenues();
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
  const [richiesta, setRichiesta] = useState<{ companyId: string; motivo: Motivo } | null>(null);
  const [esito, setEsito] = useState<'linked' | 'requested' | null>(null);
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

      {fase === 'fatto' && scelto && esito ? (
        // Prima del controllo qui sotto: associato il locale, cardId si
        // riempie, e senza questo passo la pagina direbbe «già associato»
        // invece di «fatto».
        <Fatto
          venueId={venue.id}
          hit={scelto}
          // Arriva con la rilettura dei locali, un attimo dopo l'associazione:
          // finché non c'è, il nome si legge senza link.
          slug={venue.cardRestaurant?.slug ?? ''}
          esito={esito}
          senzaPiatti={venue.dishIds.length === 0}
        />
      ) : venue.cardId !== null ? (
        // Il riquadro della scheda dice già cosa fare di un locale associato
        // (scollegare, mettere in pausa): qui basta non ricominciare.
        <p className="text-sm text-gray-600">{d.link.alreadyLinked}</p>
      ) : venue.request?.status === 'pending' ? (
        // Una richiesta in attesa tiene il locale (724): si dice subito,
        // invece di far cercare e confermare per scoprirlo all'ultimo passo.
        <CardStateNotice
          state="requested"
          venue={venue}
          linkHref=""
          onResume={() => {}}
          onChanged={() => void rileggiLocali()}
          busy={false}
        />
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
        <Azienda
          venueId={venue.id}
          hit={scelto}
          onBack={() => setFase('conferma')}
          onLinked={() => {
            setEsito('linked');
            setFase('fatto');
            rileggiLocali();
          }}
          onRequest={(companyId, motivo) => {
            setRichiesta({ companyId, motivo });
            setFase('richiesta');
          }}
        />
      ) : fase === 'richiesta' && scelto && richiesta ? (
        <Richiesta
          venueId={venue.id}
          hit={scelto}
          companyId={richiesta.companyId}
          motivo={richiesta.motivo}
          onSent={() => {
            setEsito('requested');
            setFase('fatto');
          }}
        />
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
  // Di un altro account: non si associa, ma si può chiedere (nodo 2)
  const altrui = hit.holder === 'taken';

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
      {(libero || altrui) && (
        <button
          type="button"
          onClick={onChoose}
          className="shrink-0 rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:border-gray-400"
        >
          {libero ? d.link.choose : d.link.claimTaken}
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

// «CONFERMA CHE IL LOCALE È TUO» (19/09): i dati dell'azienda, detti con il
// perché. La prima volta si scrivono; dalla seconda si sceglie un'azienda già
// inserita. Poi si prova ad associare, e se serve il nostro team si passa alla
// richiesta — il ristoratore non deve capire da solo quale delle due strade.
function Azienda({
  venueId,
  hit,
  onBack,
  onLinked,
  onRequest,
}: {
  venueId: string;
  hit: RestaurantHit;
  onBack: () => void;
  onLinked: () => void;
  onRequest: (companyId: string, motivo: Motivo) => void;
}) {
  const { d, locale } = useI18n();
  const { companies, reload } = useCompanies();
  // L'azienda scelta: un id, 'nuova', o null finché non si sa se ce ne sono
  const [scelta, setScelta] = useState<string | null>(null);
  // Il paese parte da quello del ristorante: quasi sempre è lo stesso
  const [paese, setPaese] = useState(hit.countryCode || 'IT');
  const [ragione, setRagione] = useState('');
  const [piva, setPiva] = useState('');
  const [dichiaro, setDichiaro] = useState(false);
  const [inCorso, setInCorso] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);
  const elenco = useMemo(() => countries(locale), [locale]);

  useEffect(() => {
    if (companies && scelta === null) setScelta(companies[0]?.id ?? 'nuova');
  }, [companies, scelta]);

  const nuova = scelta === 'nuova';
  const pronto =
    scelta !== null &&
    dichiaro &&
    !inCorso &&
    (!nuova || (ragione.trim().length >= 2 && piva.trim().length >= 4));

  async function conferma(e: React.FormEvent) {
    e.preventDefault();
    if (!pronto || scelta === null) return;
    setInCorso(true);
    setErrore(null);

    let companyId = scelta;
    if (nuova) {
      const salvata = await saveCompany(paese, ragione.trim(), piva.trim());
      if ('error' in salvata) {
        setErrore(salvata.error);
        setInCorso(false);
        return;
      }
      companyId = salvata.ok.companyId;
      reload();
    }

    // Già gestito da un altro account: niente da provare, si chiede
    if (hit.holder === 'taken') {
      onRequest(companyId, 'taken');
      return;
    }

    const esito = await linkRestaurant(venueId, hit.id, companyId);
    if ('ok' in esito) {
      onLinked();
      return;
    }
    const motivo: Motivo | null =
      esito.error === 'restaurant_taken'
        ? 'taken'
        : esito.error === 'restaurant_revoked'
          ? 'revoked'
          : null;
    if (motivo) {
      onRequest(companyId, motivo);
      return;
    }
    setErrore(esito.error);
    setInCorso(false);
  }

  return (
    <form onSubmit={conferma} className={cardClass}>
      <h2 className="text-base font-medium text-gray-900">{d.link.companyTitle}</h2>
      <p className="mt-1 text-sm text-gray-600">{d.link.companyIntro}</p>

      {companies && companies.length > 0 && (
        <fieldset className="mt-5 space-y-2">
          {companies.map((c) => (
            <label key={c.id} className="flex cursor-pointer items-start gap-2.5 text-sm text-gray-700">
              <input
                type="radio"
                name="azienda"
                checked={scelta === c.id}
                onChange={() => setScelta(c.id)}
                className="mt-0.5 h-4 w-4 shrink-0 accent-gray-900"
              />
              <span>
                {fill(d.link.companyUse, { name: c.legalName })}
                <span className="text-gray-500">
                  {' · '}
                  {c.countryCode} {c.vatNumber}
                </span>
              </span>
            </label>
          ))}
          <label className="flex cursor-pointer items-start gap-2.5 text-sm text-gray-700">
            <input
              type="radio"
              name="azienda"
              checked={nuova}
              onChange={() => setScelta('nuova')}
              className="mt-0.5 h-4 w-4 shrink-0 accent-gray-900"
            />
            {d.link.companyOther}
          </label>
        </fieldset>
      )}

      {nuova && (
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className={labelClass} htmlFor="azienda-ragione">
              {d.link.legalName}
            </label>
            <input
              id="azienda-ragione"
              value={ragione}
              onChange={(e) => setRagione(e.target.value)}
              placeholder={d.link.legalNamePlaceholder}
              autoComplete="organization"
              maxLength={200}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="azienda-paese">
              {d.link.country}
            </label>
            <select
              id="azienda-paese"
              value={paese}
              onChange={(e) => setPaese(e.target.value)}
              className={inputClass}
            >
              {elenco.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass} htmlFor="azienda-piva">
              {d.link.vatNumber}
            </label>
            <input
              id="azienda-piva"
              value={piva}
              onChange={(e) => setPiva(e.target.value)}
              placeholder={d.link.vatPlaceholder}
              autoComplete="off"
              maxLength={30}
              className={inputClass}
            />
          </div>
        </div>
      )}

      <label className="mt-5 flex cursor-pointer gap-2.5 text-sm text-gray-700">
        <input
          type="checkbox"
          checked={dichiaro}
          onChange={(e) => setDichiaro(e.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0 accent-gray-900"
        />
        <span>{d.link.declaration}</span>
      </label>

      {errore && <p className="mt-4 text-sm text-[#C0392B]">{messaggio(errore, d)}</p>}

      <div className="mt-5 flex flex-wrap justify-end gap-2">
        <button type="button" onClick={onBack} className={secondaryClass}>
          {d.link.companyBack}
        </button>
        <button type="submit" disabled={!pronto} className={primaryClass}>
          {inCorso ? d.link.submitting : d.link.submit}
        </button>
      </div>
    </form>
  );
}

// LA RICHIESTA AL NOSTRO TEAM. Due motivi, una strada (724): il ristorante
// di un altro account, il ritorno dopo una revoca. Il testo dice quale dei
// due, perché «serve un controllo» da solo sembrerebbe un sospetto.
function Richiesta({
  venueId,
  hit,
  companyId,
  motivo,
  onSent,
}: {
  venueId: string;
  hit: RestaurantHit;
  companyId: string;
  motivo: Motivo;
  onSent: () => void;
}) {
  const { d } = useI18n();
  const [testo, setTesto] = useState('');
  const [inCorso, setInCorso] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);
  const spiegazione = motivo === 'taken' ? d.link.requestTaken : d.link.requestRevoked;

  async function invia(e: React.FormEvent) {
    e.preventDefault();
    if (!testo.trim() || inCorso) return;
    setInCorso(true);
    setErrore(null);
    const esito = await requestRestaurant(venueId, hit.id, companyId, testo.trim());
    if ('ok' in esito) {
      onSent();
      return;
    }
    setErrore(esito.error);
    setInCorso(false);
  }

  return (
    <form onSubmit={invia} className={cardClass}>
      <h2 className="text-base font-medium text-gray-900">{d.link.requestTitle}</h2>
      <p className="mt-1 text-sm text-gray-600">{spiegazione}</p>
      <p className="mt-4 text-sm font-medium text-gray-900">{hit.name}</p>
      <p className="mt-0.5 text-sm text-gray-600">{hit.address || hit.city}</p>

      <label className={`mt-5 ${labelClass}`} htmlFor="richiesta-testo">
        {d.link.requestLabel}
      </label>
      <textarea
        id="richiesta-testo"
        value={testo}
        onChange={(e) => setTesto(e.target.value)}
        placeholder={d.link.requestPlaceholder}
        rows={4}
        maxLength={2000}
        className={inputClass}
      />

      {errore && <p className="mt-4 text-sm text-[#C0392B]">{messaggio(errore, d)}</p>}

      <div className="mt-5 flex justify-end">
        <button type="submit" disabled={!testo.trim() || inCorso} className={primaryClass}>
          {inCorso ? d.link.submitting : d.link.requestSend}
        </button>
      </div>
    </form>
  );
}

function Fatto({
  venueId,
  hit,
  slug,
  esito,
  senzaPiatti,
}: {
  venueId: string;
  hit: RestaurantHit;
  slug: string;
  esito: 'linked' | 'requested';
  senzaPiatti: boolean;
}) {
  const { d } = useI18n();
  // Il nome del ristorante è un link: si spezza la frase sul segnaposto
  const frase = d.link.doneLinked.split('{restaurant}');
  return (
    <div className={cardClass}>
      <h2 className="text-base font-medium text-gray-900">{d.link.doneTitle}</h2>
      <p className="mt-1 text-sm text-gray-600">
        {esito === 'linked' ? (
          <>
            {frase[0]}
            {slug ? (
              <a
                href={restaurantPageUrl(slug)}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-gray-900 underline"
              >
                {hit.name}
              </a>
            ) : (
              <span className="font-medium text-gray-900">{hit.name}</span>
            )}
            {frase[1]}
          </>
        ) : (
          d.link.doneRequested
        )}
      </p>
      {/* La scheda si vede con abbonamento, collegamento, il controllo del
          nostro team (724) E almeno un piatto: va detto, o «associato»
          sembra «visibile». */}
      {esito === 'linked' && <p className="mt-2 text-sm text-gray-600">{d.link.doneReview}</p>}
      {esito === 'linked' && senzaPiatti && (
        <p className="mt-2 text-sm text-gray-600">{d.link.doneNeedsDishes}</p>
      )}
      <div className="mt-5 flex justify-end">
        <Link href={`/locale/${venueId}`} className={primaryClass}>
          {d.link.doneBack}
        </Link>
      </div>
    </div>
  );
}
