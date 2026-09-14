'use client';

// Pagina amministrativa (tappo): abbonamento e collegamento locale → ristorante
// su AllergiApp, in quest'ordine (15/09). Pagamenti e ricerca del locale
// arriveranno qui.
import { useRouter } from 'next/navigation';
import { useI18n } from '@/lib/i18n';
import { useVenues } from '@/lib/venues';
import { PageIntro, PageTitle } from '@/components/PageHeading';

export default function SubscriptionsPage() {
  const { d } = useI18n();
  const { venues } = useVenues();
  const router = useRouter();

  // Si torna da dove si è venuti. Ci si arriva da Account, dalla home (il
  // riquadro della scheda) e dalla pagina della scheda (in cima e in fondo):
  // un "← Account" fisso riportava in Account anche chi arrivava dalla scheda.
  // Aperta da un link esterno o in una scheda nuova non c'è un "prima", e si
  // ripiega su Account, che è la voce della barra laterale che la contiene.
  function indietro() {
    if (window.history.length > 1) router.back();
    else router.push('/account');
  }

  return (
    <div>
      {/* La via del ritorno va detta, o si resta in una pagina senza uscite */}
      <button
        type="button"
        onClick={indietro}
        className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-gray-500 hover:text-gray-900"
      >
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M15 6l-6 6 6 6" />
        </svg>
        {d.subs.back}
      </button>
      <div className="flex items-center gap-3">
        <PageTitle>{d.subs.title}</PageTitle>
        <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-500">
          {d.common.comingSoon}
        </span>
      </div>
      <PageIntro className="mb-10 md:mb-12">{d.subs.intro}</PageIntro>

      {!venues ? (
        <p className="text-sm text-gray-500">{d.common.loading}</p>
      ) : venues.length === 0 ? (
        <p className="max-w-xl text-sm text-gray-500">{d.subs.empty}</p>
      ) : (
        <div className="max-w-xl space-y-3">
          {venues.map((s) => (
            <div
              key={s.id}
              className="flex flex-wrap items-center gap-3 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
            >
              <p className="min-w-0 flex-1 truncate text-sm font-medium text-gray-900">
                {s.venueName.trim() || d.home.unnamed}
              </p>
              {/* Nell'ordine in cui si fanno: prima l'abbonamento, poi
                  l'associazione (decisione dell'utente, 15/09) */}
              <span className="rounded-full border border-gray-300 bg-gray-50 px-3 py-1 text-xs font-medium text-gray-600">
                {d.subs.noSubscription}
              </span>
              <span className="rounded-full border border-gray-300 bg-gray-50 px-3 py-1 text-xs font-medium text-gray-600">
                {d.subs.notLinked}
              </span>
              <button
                disabled
                className="rounded-lg bg-gray-900 px-3 py-1.5 text-sm font-medium text-white opacity-40"
              >
                {d.subs.linkCta}
              </button>
            </div>
          ))}
          <p className="text-xs text-gray-500">{d.subs.notFoundBridge}</p>
        </div>
      )}
    </div>
  );
}
