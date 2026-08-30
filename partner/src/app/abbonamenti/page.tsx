'use client';

// Pagina amministrativa (tappo): collegamento vetrina → locale e stato
// abbonamento. Ricerca del locale e pagamenti arriveranno qui.
import { useI18n } from '@/lib/i18n';
import { useShowcases } from '@/lib/showcases';

export default function SubscriptionsPage() {
  const { d } = useI18n();
  const { showcases } = useShowcases();

  return (
    <div>
      <div className="mb-2 flex items-center gap-3">
        <h1 className="text-xl font-semibold md:text-2xl">{d.subs.title}</h1>
        <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-500">
          {d.common.comingSoon}
        </span>
      </div>
      <p className="mb-8 max-w-2xl text-balance text-sm text-gray-600">{d.subs.intro}</p>

      {!showcases ? (
        <p className="text-sm text-gray-500">{d.common.loading}</p>
      ) : showcases.length === 0 ? (
        <p className="max-w-xl text-sm text-gray-500">{d.subs.empty}</p>
      ) : (
        <div className="max-w-xl space-y-3">
          {showcases.map((s) => (
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
