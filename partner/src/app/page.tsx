'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useI18n } from '@/lib/i18n';
import { useShowcases, countLinks, type Showcase } from '@/lib/showcases';
import NewShowcaseDialog from '@/components/NewShowcaseDialog';
import DeleteShowcaseDialog from '@/components/DeleteShowcaseDialog';

// Quanto resta annullabile un'eliminazione, dal toast in fondo alla lista
const UNDO_MS = 8000;

export default function ShowcasesPage() {
  const { d } = useI18n();
  const router = useRouter();
  const { showcases, create, rename, remove, restore } = useShowcases();
  const [creating, setCreating] = useState(false);
  // Rinomina in riga sulla card: nessuna schermata a parte
  const [renaming, setRenaming] = useState<string | null>(null);
  const [nameDraft, setNameDraft] = useState('');
  const [deleting, setDeleting] = useState<Showcase | null>(null);
  // Vetrina appena eliminata, con la posizione che aveva: finché il toast è
  // in piedi si può rimettere dov'era
  const [undoable, setUndoable] = useState<{ showcase: Showcase; index: number } | null>(null);

  // Scaduto il tempo il toast sparisce e l'eliminazione diventa definitiva
  useEffect(() => {
    if (!undoable) return;
    const timer = setTimeout(() => setUndoable(null), UNDO_MS);
    return () => clearTimeout(timer);
  }, [undoable]);

  function confirmDelete(showcase: Showcase) {
    const index = (showcases ?? []).findIndex((s) => s.id === showcase.id);
    remove(showcase.id);
    setDeleting(null);
    setUndoable({ showcase, index: index < 0 ? 0 : index });
  }

  function undoDelete() {
    if (!undoable) return;
    restore(undoable.showcase, undoable.index);
    setUndoable(null);
  }

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
                      {s.dishIds.length}{' '}
                      {s.dishIds.length === 1 ? d.home.dishOne : d.home.dishOther} ·{' '}
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
                  onClick={() => setDeleting(s)}
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

      {deleting && (
        <DeleteShowcaseDialog
          showcase={deleting}
          onCancel={() => setDeleting(null)}
          onConfirm={() => confirmDelete(deleting)}
        />
      )}

      {/* Toast di annullamento: l'eliminazione resta reversibile per qualche
          secondo, la rete che serve davvero contro il click sbagliato */}
      {undoable && (
        <div
          role="status"
          className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-4 rounded-xl bg-gray-900 px-4 py-3 shadow-lg"
        >
          <span className="text-sm text-white">{d.home.deleted}</span>
          <button
            onClick={undoDelete}
            className="text-sm font-medium text-white underline underline-offset-2 transition-opacity hover:opacity-80"
          >
            {d.home.undo}
          </button>
        </div>
      )}
    </div>
  );
}
