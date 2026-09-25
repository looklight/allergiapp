'use client';

// LE RECENSIONI DEL LOCALE (25/09): leggerle e rispondere.
//
// Una voce a sé della barra, come Piatti e Menù, che compare solo quando il
// locale scelto può rispondere (abbonamento che vale + ristorante associato e
// approvato: `canManageReviews`, la stessa regola della 733). Chi ci arriva
// comunque — un link salvato, un abbonamento appena scaduto — trova una
// frase che dice cosa manca, non una pagina rotta.
//
// Il ristoratore vede quello che l'app mostra già a tutti: nome (o «Utente
// anonimo»), voto, testo, foto ed esigenze dichiarate nella recensione.
// Niente altro sull'autore. Una risposta per recensione; quella tolta dal
// nostro team resta visibile qui, col motivo, e non si tocca più.
import { useCallback, useEffect, useId, useState } from 'react';
import Link from 'next/link';
import { fill, useI18n } from '@/lib/i18n';
import { currentVenue, useVenueChoice, useVenues, type Venue } from '@/lib/venues';
import { useSubscriptions } from '@/lib/subscriptions';
import {
  REPLY_MAX,
  canManageReviews,
  deleteReply,
  loadVenueReviews,
  saveReply,
  type VenueReview,
} from '@/lib/reviews';
import { ALLERGENS, allergenName } from '@/lib/allergens';
import { otherFoodName } from '@/lib/otherFoods';
import { DIETS } from '@/lib/diets';
import { quandoLeggibile } from '@/lib/dates';
import { PageIntro, PageTitle } from '@/components/PageHeading';
import RestaurantPhrase from '@/components/RestaurantPhrase';
import ConfirmDialog from '@/components/menus/ConfirmDialog';
import LogoPicker from '@/components/menus/LogoPicker';

const primaryBtn =
  'rounded-lg bg-gray-900 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-40';
const secondaryBtn =
  'rounded-lg px-3 py-1.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900';

// Il nome di un'esigenza: uno dei 15 allergeni, uno degli altri alimenti
// dell'app, o — se l'app ne ha aggiunto uno che qui non c'è ancora — il
// codice reso leggibile («bell_pepper» → «Bell pepper»), mai il codice nudo.
function needName(code: string, locale: 'it' | 'en'): string {
  if (ALLERGENS.some((a) => a.code === code)) return allergenName(code, locale);
  const other = otherFoodName(code, locale);
  if (other) return other;
  const leggibile = code.replace(/_/g, ' ');
  return leggibile.charAt(0).toUpperCase() + leggibile.slice(1);
}

function Stars({ rating }: { rating: number }) {
  return (
    <span className="text-sm tracking-tight text-amber-500" aria-label={`${rating}/5`}>
      {'★'.repeat(rating)}
      <span className="text-gray-300">{'★'.repeat(Math.max(0, 5 - rating))}</span>
    </span>
  );
}

// Il nome con cui le risposte sono firmate nell'app (25/09): quello del
// RISTORANTE su AllergiApp, lo stesso in cima alla scheda — non il nome del
// locale nel portale, che può essere un altro.
function firmaRisposte(venue: Venue): string {
  return venue.cardRestaurant?.name ?? venue.venueName;
}

// Il logo del locale accanto alla risposta, come nell'app. Senza logo, la
// stessa icona di posate che l'app mostra al suo posto.
function VenueAvatar({ venue }: { venue: Venue }) {
  if (venue.logoUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={venue.logoUrl} alt="" className="h-7 w-7 shrink-0 rounded-full border border-gray-200 object-cover" />;
  }
  return (
    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-gray-50 text-gray-500">
      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M7 3v8M5 3v5a2 2 0 0 0 4 0V3M7 11v10M17 3c-1.7 1.2-2.5 3.2-2.5 6v3H17v9" />
      </svg>
    </span>
  );
}

function ReviewItem({
  review,
  venue,
  onChanged,
}: {
  review: VenueReview;
  venue: Venue;
  onChanged: () => Promise<void>;
}) {
  const { d, locale } = useI18n();
  const fieldId = useId();
  const reply = review.reply;
  const removed = reply?.removedAt != null;

  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(reply?.body ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Le esigenze dell'autore come nell'app (ReviewCard): prima le diete,
  // poi gli allergeni. Qui non c'è un «chi guarda» con cui confrontarle,
  // quindi sono tutte ambra — nell'app diventano verdi quelle in comune.
  const needs = [
    ...review.diets.map((c) => {
      const diet = DIETS.find((t) => t.code === c);
      return diet ? (locale === 'en' ? diet.needEn : diet.needIt) : needName(c, locale);
    }),
    ...review.allergens.map((c) => needName(c, locale)),
  ];
  // La recensione cambiata dopo la risposta: la risposta potrebbe non
  // rispondere più a quello che c'è scritto
  const editedAfter =
    reply !== null && !removed && new Date(review.updatedAt) > new Date(reply.updatedAt);

  function startEditing() {
    setText(reply?.body ?? '');
    setError(null);
    setEditing(true);
  }

  async function publish() {
    setBusy(true);
    setError(null);
    const esito = await saveReply(venue.id, review.id, text);
    if ('error' in esito) {
      setError(d.reviews.saveError);
      setBusy(false);
      return;
    }
    await onChanged();
    setBusy(false);
    setEditing(false);
  }

  async function remove() {
    if (!reply) return;
    setConfirmDelete(false);
    setBusy(true);
    const esito = await deleteReply(reply.id);
    if ('error' in esito) setError(d.reviews.deleteError);
    else await onChanged();
    setBusy(false);
  }

  const trimmed = text.trim();

  return (
    <li className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <span className="text-sm font-semibold text-gray-900">
          {review.anonymous || !review.author ? d.reviews.anonymous : review.author}
        </span>
        <span className="text-xs text-gray-500">{quandoLeggibile(review.createdAt, locale)}</span>
      </div>
      {review.rating > 0 && <Stars rating={review.rating} />}
      {review.comment && (
        <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-gray-800">{review.comment}</p>
      )}
      {review.photos.length > 0 && (
        <div className="mt-3 flex gap-2 overflow-x-auto">
          {review.photos.map((p, i) => (
            <a key={i} href={p.url} target="_blank" rel="noopener noreferrer" className="shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.thumbnailUrl ?? p.url} alt="" className="h-16 w-16 rounded-lg object-cover" />
            </a>
          ))}
        </div>
      )}
      {needs.length > 0 && (
        <div className="mt-3">
          <p className="text-xs font-medium text-gray-600">{d.reviews.needs}</p>
          <ul className="mt-1.5 flex flex-wrap gap-1.5">
            {needs.map((label) => (
              // Pill ambra dell'app: #FFF8E1 / #8D6E00 (v. SchedaPreview)
              <li key={label} className="rounded-full bg-[#FFF8E1] px-2 py-0.5 text-[11px] font-medium text-[#8D6E00]">
                {label}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* LA RISPOSTA */}
      <div className="mt-4 border-t border-gray-100 pt-4">
        {removed && reply ? (
          <div className="rounded-lg bg-gray-50 p-3">
            <p className="text-sm font-semibold text-gray-900">{d.reviews.removedTitle}</p>
            <p className="mt-1 text-sm text-gray-700">{fill(d.reviews.removedReason, { note: reply.removedNote ?? '' })}</p>
            <p className="mt-2 whitespace-pre-line text-sm text-gray-400 line-through">{reply.body}</p>
            <p className="mt-2 text-xs text-gray-500">{d.reviews.removedHint}</p>
          </div>
        ) : editing ? (
          <div>
            <label htmlFor={fieldId} className="sr-only">
              {d.reviews.yourReply}
            </label>
            <textarea
              id={fieldId}
              value={text}
              onChange={(e) => setText(e.target.value.slice(0, REPLY_MAX))}
              rows={4}
              autoFocus
              placeholder={d.reviews.placeholder}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none"
            />
            <div className="mt-1 flex items-start justify-between gap-3">
              <p className="text-xs leading-snug text-gray-500">{d.reviews.tips}</p>
              <span className="shrink-0 text-xs tabular-nums text-gray-400">
                {fill(d.reviews.counter, { n: text.length, max: REPLY_MAX })}
              </span>
            </div>
            {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
            <div className="mt-3 flex items-center justify-end gap-2">
              <button type="button" onClick={() => setEditing(false)} className={secondaryBtn} disabled={busy}>
                {d.reviews.cancel}
              </button>
              <button
                type="button"
                onClick={publish}
                className={primaryBtn}
                disabled={busy || trimmed.length === 0 || trimmed === reply?.body}
              >
                {d.reviews.save}
              </button>
            </div>
          </div>
        ) : reply ? (
          <div>
            <div className="flex items-center gap-2">
              <VenueAvatar venue={venue} />
              <span className="text-sm font-semibold text-gray-900">{firmaRisposte(venue)}</span>
              <span className="text-xs text-gray-500">· {quandoLeggibile(reply.updatedAt, locale)}</span>
            </div>
            <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-gray-800">{reply.body}</p>
            {editedAfter && <p className="mt-2 text-xs font-medium text-amber-700">{d.reviews.edited}</p>}
            {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
            {review.canReply && (
              <div className="mt-3 flex gap-2">
                <button type="button" onClick={startEditing} className={secondaryBtn} disabled={busy}>
                  {d.reviews.edit}
                </button>
                <button type="button" onClick={() => setConfirmDelete(true)} className={secondaryBtn} disabled={busy}>
                  {d.reviews.delete}
                </button>
              </div>
            )}
          </div>
        ) : (
          review.canReply && (
            <button type="button" onClick={startEditing} className={primaryBtn}>
              {d.reviews.reply}
            </button>
          )
        )}
      </div>

      {confirmDelete && (
        <ConfirmDialog
          title={d.reviews.deleteTitle}
          body={d.reviews.deleteBody}
          confirmLabel={d.reviews.delete}
          onCancel={() => setConfirmDelete(false)}
          onConfirm={remove}
        />
      )}
    </li>
  );
}

// IL RIEPILOGO DEI VOTI, come su Google Maps (richiesta dell'utente,
// 25/09): la media in grande, le stelle, il totale, e una barra per voto
// dalla 5 alla 1. Su TUTTE le recensioni, non sulla linguetta scelta: è il
// quadro del locale. Ogni barra è anche il filtro per stelle — toccarla
// mostra solo quel voto, ritoccarla lo toglie. Una sola tinta (ambra, il
// colore delle stelle): la barra dice quante, non che cosa. I numeri stanno
// in grigio accanto, mai colorati.
function RatingSummary({
  reviews,
  selected,
  onSelect,
}: {
  reviews: VenueReview[];
  selected: number | null;
  onSelect: (stars: number | null) => void;
}) {
  const { d, locale } = useI18n();
  const votate = reviews.filter((r) => r.rating >= 1 && r.rating <= 5);
  const conteggi = [5, 4, 3, 2, 1].map((n) => ({ n, count: votate.filter((r) => r.rating === n).length }));
  const massimo = Math.max(1, ...conteggi.map((c) => c.count));
  const media = votate.length > 0 ? votate.reduce((s, r) => s + r.rating, 0) / votate.length : 0;

  return (
    <section className="flex items-center gap-5 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="shrink-0 text-center">
        <p className="text-4xl font-semibold tabular-nums leading-none text-gray-900">
          {media.toLocaleString(locale === 'en' ? 'en-GB' : 'it-IT', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
        </p>
        <div className="mt-1">
          <Stars rating={Math.round(media)} />
        </div>
        <p className="mt-0.5 text-xs text-gray-500">{fill(d.reviews.summaryCount, { n: votate.length })}</p>
      </div>
      <div className="min-w-0 flex-1 space-y-0.5" role="group" aria-label={d.reviews.starsLabel}>
        {conteggi.map(({ n, count }) => {
          const acceso = selected === n;
          const spento = selected !== null && !acceso;
          return (
            <button
              key={n}
              type="button"
              aria-pressed={acceso}
              disabled={count === 0}
              onClick={() => onSelect(acceso ? null : n)}
              title={fill(d.reviews.summaryRow, { n, count })}
              aria-label={fill(d.reviews.summaryRow, { n, count })}
              className={`flex w-full items-center gap-2 rounded-md px-1 py-1 text-left transition-colors hover:bg-gray-50 disabled:cursor-default disabled:hover:bg-transparent ${
                acceso ? 'bg-amber-50' : ''
              }`}
            >
              <span className="w-3 shrink-0 text-right text-xs tabular-nums text-gray-600">{n}</span>
              <span className="relative h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-gray-100">
                <span
                  className={`absolute inset-y-0 left-0 rounded-full transition-opacity ${spento ? 'bg-amber-400/40' : 'bg-amber-400'}`}
                  style={{ width: `${(count / massimo) * 100}%` }}
                />
              </span>
              <span className="w-6 shrink-0 text-right text-xs tabular-nums text-gray-500">{count}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

export default function ReviewsPage() {
  const { d } = useI18n();
  const { venues, setIdentity } = useVenues();
  const { venueId } = useVenueChoice();
  const { subs } = useSubscriptions();
  const venue = currentVenue(venues ?? null, venueId);
  const allowed = canManageReviews(venue, subs ?? null);

  const [reviews, setReviews] = useState<VenueReview[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [filter, setFilter] = useState<'todo' | 'all'>('todo');
  // Le stelle (richiesta dell'utente, 25/09): si combinano con «Da
  // rispondere / Tutte». null = tutte. L'ordine resta dalla più recente.
  const [stars, setStars] = useState<number | null>(null);

  const load = useCallback(async () => {
    if (!venue) return;
    const rows = await loadVenueReviews(venue.id);
    setFailed(rows === null);
    if (rows) setReviews(rows);
  }, [venue]);

  useEffect(() => {
    setReviews(null);
    if (allowed) void load();
    // venue.id e non venue: l'oggetto cambia a ogni rilettura dei locali
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [venue?.id, allowed]);

  if (venues === null || subs === null) {
    return <p className="text-sm text-gray-500">{d.common.loading}</p>;
  }

  if (!venue || !allowed) {
    return (
      <div>
        <PageTitle>{d.reviews.title}</PageTitle>
        <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold text-gray-900">{d.reviews.unavailableTitle}</p>
          <p className="mt-1 text-sm text-gray-600">{d.reviews.unavailableBody}</p>
          {venue && (
            <Link href={`/locale/${venue.id}`} className={`mt-4 inline-block ${primaryBtn}`}>
              {d.reviews.unavailableCta}
            </Link>
          )}
        </div>
      </div>
    );
  }

  // Da rispondere = senza nessuna risposta. Una tolta dal nostro team non
  // conta: lì il ristoratore non può più fare niente.
  const todo = (reviews ?? []).filter((r) => r.reply === null);
  const base = filter === 'todo' ? todo : reviews ?? [];
  const shown = stars === null ? base : base.filter((r) => r.rating === stars);

  return (
    <div>
      <PageTitle>{d.reviews.title}</PageTitle>
      <PageIntro>
        <RestaurantPhrase
          template={d.reviews.intro}
          name={venue.cardRestaurant?.name ?? venue.venueName}
          slug={venue.cardRestaurant?.slug ?? ''}
        />
      </PageIntro>

      {/* Due riquadri affiancati da md in su (richiesta dell'utente, 25/09):
          su schermo largo occupano una riga sola; su telefono uno sotto
          l'altro. */}
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {/* COME APPARI (richiesta dell'utente, 25/09): il logo si sceglie
            anche da qui, perché è qui che il ristoratore lo vede accanto alle
            sue parole. È lo stesso logo del locale che sta nell'editor del
            menù (un logo per locale, 703): nell'app lo legge vivo, al tavolo
            arriva con la pubblicazione. Nessun distintivo Pro: chi è qui è
            già Pro. */}
        {/* Titolo in cima, sotto logo e nome affiancati: come compaiono
            nell'app sopra la risposta (richiesta dell'utente, 25/09) */}
        <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
          <p className="text-sm font-semibold text-gray-900">{d.reviews.identityTitle}</p>
          <div className="mt-3 flex items-center gap-3">
            <LogoPicker logoUrl={venue.logoUrl} onChange={(logoUrl) => setIdentity(venue.id, { logoUrl })} />
            <p className="min-w-0 truncate text-base font-medium text-gray-900">{firmaRisposte(venue)}</p>
          </div>
        </section>

        {reviews !== null && reviews.length > 0 && (
          <RatingSummary reviews={reviews} selected={stars} onSelect={setStars} />
        )}
      </div>

      {reviews === null ? (
        failed ? (
          <div className="mt-6 text-sm text-gray-600">
            {d.reviews.loadError}{' '}
            <button type="button" onClick={() => void load()} className="font-medium underline">
              {d.reviews.retry}
            </button>
          </div>
        ) : (
          <p className="mt-6 text-sm text-gray-500">{d.common.loading}</p>
        )
      ) : reviews.length === 0 ? (
        <p className="mt-6 text-sm text-gray-600">{d.reviews.empty}</p>
      ) : (
        <>
          <div className="mt-6 flex flex-wrap items-center gap-2" role="tablist">
            {(['todo', 'all'] as const).map((f) => (
              <button
                key={f}
                type="button"
                role="tab"
                aria-selected={filter === f}
                onClick={() => setFilter(f)}
                className={`rounded-full border px-3 py-1 text-sm font-medium transition-colors ${
                  filter === f
                    ? 'border-gray-900 bg-gray-900 text-white'
                    : 'border-gray-300 bg-white text-gray-600 hover:border-gray-400'
                }`}
              >
                {f === 'todo'
                  ? fill(d.reviews.filterTodo, { n: todo.length })
                  : fill(d.reviews.filterAll, { n: reviews.length })}
              </button>
            ))}
            {/* Il filtro per stelle si sceglie dalle barre qui sopra; qui si
                vede che è acceso e si toglie */}
            {stars !== null && (
              <button
                type="button"
                onClick={() => setStars(null)}
                className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-sm font-medium text-amber-800"
              >
                {stars} ★
                <span aria-hidden="true">×</span>
                <span className="sr-only">{d.reviews.starsAll}</span>
              </button>
            )}
          </div>
          {shown.length === 0 ? (
            <p className="mt-6 text-sm text-gray-600">{stars === null ? d.reviews.emptyTodo : d.reviews.emptyStars}</p>
          ) : (
            <ul className="mt-4 space-y-4">
              {shown.map((r) => (
                <ReviewItem key={r.id} review={r} venue={venue} onChanged={load} />
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
