'use client';

import { useI18n } from '@/lib/i18n';

export default function HomePage() {
  const { d } = useI18n();

  const cards = [
    { title: d.home.dishesCard, description: d.home.dishesCardDescription },
    { title: d.home.linksCard, description: d.home.linksCardDescription },
  ];

  return (
    <div>
      <div className="mb-2 flex items-center gap-3">
        <h1 className="text-xl font-semibold md:text-2xl">{d.home.title}</h1>
        <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">
          {d.home.draftBadge}
        </span>
      </div>
      <p className="mb-8 max-w-xl text-sm text-gray-600">{d.home.intro}</p>

      <div className="grid gap-4 sm:grid-cols-2">
        {cards.map(({ title, description }) => (
          <div
            key={title}
            className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
          >
            <div className="mb-1 flex items-center justify-between">
              <h2 className="font-medium text-gray-900">{title}</h2>
              <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-500">
                {d.common.comingSoon}
              </span>
            </div>
            <p className="text-sm text-gray-600">{description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
