'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useI18n } from '@/lib/i18n';
import { useShowcases, countLinks } from '@/lib/draft';
import NewShowcaseDialog from '@/components/NewShowcaseDialog';

export default function ShowcasesPage() {
  const { d } = useI18n();
  const router = useRouter();
  const { showcases, create, rename, remove } = useShowcases();
  const [creating, setCreating] = useState(false);
  // Rinomina in riga sulla card: nessuna schermata a parte
  const [renaming, setRenaming] = useState<string | null>(null);
  const [nameDraft, setNameDraft] = useState('');

  function handleCreate(venueName: string) {
    const created = create(venueName);
    setCreating(false);
    router.push(`/vetrina/${created.id}`);
  }

  function startRename(id: string, current: string) {
    setRenaming(id);
    setNameDraft(current);
  }

  function commitRename() {
    if (renaming) rename(renaming, nameDraft.trim());
    setRenaming(null);
  }

  return (
    <div>
      <h1 className="mb-2 text-xl font-semibold md:text-2xl">{d.home.title}</h1>
      <p className="mb-8 max-w-xl text-sm text-gray-600">{d.home.intro}</p>

      {!showcases ? (
        <p className="text-sm text-gray-500">{d.common.loading}</p>
      ) : (
        <div className="max-w-xl space-y-3">
          {showcases.map((s) => {
            const links = countLinks(s.links);
            return (
              <div
                key={s.id}
                className="flex items-center gap-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
              >
                {renaming === s.id ? (
                  <input
                    type="text"
                    value={nameDraft}
                    autoFocus
                    onChange={(e) => setNameDraft(e.target.value)}
                    onBlur={commitRename}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') commitRename();
                      if (e.key === 'Escape') setRenaming(null);
                    }}
                    placeholder={d.editor.venueNamePlaceholder}
                    className="min-w-0 flex-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-gray-900 focus:outline-none"
                  />
                ) : (
                  <div className="min-w-0 flex-1">
                    {/* matita accanto al nome, sempre visibile ma discreta */}
                    <div className="flex items-center gap-1.5">
                      <Link
                        href={`/vetrina/${s.id}`}
                        className="truncate text-sm font-medium text-gray-900"
                      >
                        {s.venueName.trim() || d.home.unnamed}
                      </Link>
                      <button
                        onClick={() => startRename(s.id, s.venueName)}
                        aria-label={d.home.rename}
                        title={d.home.rename}
                        className="shrink-0 text-gray-300 transition-colors hover:text-gray-700"
                      >
                        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 20h9" />
                          <path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z" />
                        </svg>
                      </button>
                    </div>
                    <p className="mt-0.5 text-xs text-gray-500">
                      {s.dishes.length}{' '}
                      {s.dishes.length === 1 ? d.home.dishOne : d.home.dishOther} ·{' '}
                      {links} {links === 1 ? d.home.linkOne : d.home.linkOther}
                    </p>
                  </div>
                )}
                <Link
                  href={`/vetrina/${s.id}`}
                  className="shrink-0 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
                >
                  {d.home.open}
                </Link>
                <button
                  onClick={() => {
                    if (window.confirm(d.home.deleteConfirm)) remove(s.id);
                  }}
                  className="shrink-0 text-sm font-medium text-red-600 hover:text-red-700"
                >
                  {d.common.delete}
                </button>
              </div>
            );
          })}

          <button
            onClick={() => setCreating(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-700"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
            {d.home.create}
          </button>
        </div>
      )}

      {creating && (
        <NewShowcaseDialog onCancel={() => setCreating(false)} onCreate={handleCreate} />
      )}
    </div>
  );
}
