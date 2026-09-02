'use client';

// Pagina amministrativa (tappo): collegamento locale → ristorante su AllergiApp e stato
// abbonamento. Ricerca del locale e pagamenti arriveranno qui.
import Link from 'next/link';
import { useI18n } from '@/lib/i18n';
import { useVenues } from '@/lib/venues';

export default function SubscriptionsPage() {
  const { d } = useI18n();
  const { venues } = useVenues();

  return (
    <div>
      {/* Ci si arriva da Account (e dai due richiami alla scheda): la via
          del ritorno va detta, o si resta in una pagina senza uscite */}
      <Link
        href="/account"
        className="mb-3 inline-flex items-center gap-1 text-sm font-medium text-gray-500 hover:text-gray-900"
      >
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M15 6l-6 6 6 6" />
        </svg>
        {d.subs.back}
      </Link>
      <div className="mb-2 flex items-center gap-3">
        <h1 className="text-xl font-semibold md:text-2xl">{d.subs.title}</h1>
        <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-500">
          {d.common.comingSoon}
        </span>
      </div>
      <p className="mb-8 text-balance text-sm text-gray-600">{d.subs.intro}</p>

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
              <span className="rounded-full border border-gray-300 bg-gray-50 px-3 py-1 text-xs font-medium text-gray-600">
                {d.subs.notLinked}
              </span>
              <span className="rounded-full border border-gray-300 bg-gray-50 px-3 py-1 text-xs font-medium text-gray-600">
                {d.subs.noSubscription}
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
