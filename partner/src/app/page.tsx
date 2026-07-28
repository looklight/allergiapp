'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useI18n } from '@/lib/i18n';
import { useShowcases, countLinks } from '@/lib/draft';

export default function ShowcasesPage() {
  const { d } = useI18n();
  const router = useRouter();
  const { showcases, create, remove } = useShowcases();

  function handleCreate() {
    const created = create();
    router.push(`/vetrina/${created.id}`);
  }

  return (
    <div>
      <h1 className="mb-2 text-xl font-semibold md:text-2xl">{d.home.title}</h1>
      <p className="mb-8 max-w-xl text-sm text-gray-600">{d.home.intro}</p>

      {!showcases ? (
        <p className="text-sm text-gray-500">{d.common.loading}</p>
      ) : (
        <div className="max-w-xl space-y-3">
          {showcases.length === 0 && (
            <p className="text-sm text-gray-500">{d.home.empty}</p>
          )}

          {showcases.map((s) => {
            const links = countLinks(s.links);
            return (
              <div
                key={s.id}
                className="flex items-center gap-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
              >
                <Link href={`/vetrina/${s.id}`} className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-gray-900">
                    {s.venueName.trim() || d.home.unnamed}
                  </p>
                  <p className="mt-0.5 text-xs text-gray-500">
                    {s.dishes.length}{' '}
                    {s.dishes.length === 1 ? d.home.dishOne : d.home.dishOther} ·{' '}
                    {links} {links === 1 ? d.home.linkOne : d.home.linkOther}
                  </p>
                </Link>
                <Link
                  href={`/vetrina/${s.id}`}
                  className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
                >
                  {d.home.open}
                </Link>
                <button
                  onClick={() => {
                    if (window.confirm(d.home.deleteConfirm)) remove(s.id);
                  }}
                  className="text-sm font-medium text-red-600 hover:text-red-700"
                >
                  {d.common.delete}
                </button>
              </div>
            );
          })}

          <button
            onClick={handleCreate}
            className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-700"
          >
            + {d.home.create}
          </button>
        </div>
      )}
    </div>
  );
}
