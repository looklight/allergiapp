'use client';

import { useI18n } from '@/lib/i18n';

export default function VenuePage() {
  const { d } = useI18n();

  return (
    <div>
      <div className="mb-2 flex items-center gap-3">
        <h1 className="text-xl font-semibold md:text-2xl">{d.venue.title}</h1>
        <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-500">
          {d.common.comingSoon}
        </span>
      </div>
      <p className="mb-6 max-w-xl text-sm text-gray-600">{d.venue.intro}</p>

      <div className="max-w-xl rounded-2xl border border-gray-200 bg-white p-5 text-sm text-gray-600 shadow-sm">
        {d.venue.notFoundBridge}
      </div>
    </div>
  );
}
