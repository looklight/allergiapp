'use client';

// L'elenco dei menù del ristoratore. Un menù appartiene a una vetrina, cioè
// a un locale (DIGITAL_MENU.md, Tema 14): con una vetrina sola non si chiede
// niente, con più d'una si raggruppa per locale, perché "Carta" e "Carta" di
// due ristoranti diversi sono indistinguibili in una lista piatta.
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { fill, useI18n } from '@/lib/i18n';
import { useDishes } from '@/lib/dishes';
import { useShowcases } from '@/lib/showcases';
import { menuItems, useMenus, type Menu } from '@/lib/menus';
import ConfirmDialog from '@/components/menus/ConfirmDialog';
import NewMenuDialog from '@/components/menus/NewMenuDialog';

export default function MenusPage() {
  const { d } = useI18n();
  const router = useRouter();
  const { showcases } = useShowcases();
  const { dishes } = useDishes();
  const { menus, create, remove } = useMenus();
  const { rename } = useShowcases();
  const [deleting, setDeleting] = useState<Menu | null>(null);
  // il locale a cui si sta aggiungendo un menù; null = nessuna finestra aperta
  const [creating, setCreating] = useState<string | null>(null);
  const createButton = useRef<HTMLButtonElement>(null);

  // Il nome del locale si scrive solo se non c'era: la finestra lo chiede una
  // volta sola, e dal secondo menù in poi non lo domanda nemmeno.
  async function handleCreate(venueId: string, menuName: string, venueName: string) {
    const vetrina = (showcases ?? []).find((s) => s.id === venueId);
    if (vetrina && vetrina.venueName.trim() === '' && venueName !== '') {
      rename(venueId, venueName);
    }
    setCreating(null);
    const creato = await create(venueId, menuName);
    if (creato) router.push(`/menu/${creato.id}`);
  }

  const loading = !showcases || !dishes || !menus;
  // Il nome del locale accanto al menù serve solo a chi ne ha più d'uno: con
  // una vetrina sola è la stessa parola ripetuta su ogni riga.
  const multiVenue = (showcases ?? []).length > 1;

  return (
    <div>
      <h1 className="mb-2 text-xl font-semibold md:text-2xl">{d.menus.title}</h1>
      <p className="mb-8 max-w-2xl text-balance text-sm text-gray-600">{d.menus.intro}</p>


      {loading ? (
        <p className="text-sm text-gray-500">{d.common.loading}</p>
      ) : showcases.length === 0 ? (
        <div className="max-w-xl rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center">
          <p className="text-sm font-medium text-gray-900">{d.menus.noShowcase}</p>
          <p className="mt-1 text-sm text-gray-500">{d.menus.noShowcaseHint}</p>
          <Link
            href="/"
            className="mt-4 inline-flex items-center rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-700"
          >
            {d.nav.showcase}
          </Link>
        </div>
      ) : (
        <div className="max-w-xl space-y-8">
          {showcases.map((showcase) => {
            const suoi = menus.filter((menu) => menu.showcaseId === showcase.id);
            return (
              <div key={showcase.id} className="space-y-3">
                {multiVenue && (
                  <h2 className="text-xs font-medium uppercase tracking-wide text-gray-400">
                    {showcase.venueName.trim() || d.home.unnamed}
                  </h2>
                )}

                {suoi.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center">
                    <p className="text-sm font-medium text-gray-900">{d.menus.empty}</p>
                    <p className="mt-1 text-sm text-gray-500">{d.menus.emptyHint}</p>
                    <button
                      ref={createButton}
                      onClick={() => setCreating(showcase.id)}
                      className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-700"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <path d="M12 5v14M5 12h14" />
                      </svg>
                      {d.menus.create}
                    </button>
                  </div>
                ) : (
                  <>
                    {suoi.map((menu) => {
                      const piatti = menuItems(menu).length;
                      const sezioni = menu.sections.length;
                      return (
                        <div
                          key={menu.id}
                          className="flex items-center gap-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
                        >
                          <div className="min-w-0 flex-1">
                            <Link
                              href={`/menu/${menu.id}`}
                              className="block truncate text-sm font-medium text-gray-900"
                            >
                              {menu.name.trim() || d.menus.defaultName}
                            </Link>
                            <p className="mt-0.5 text-xs text-gray-500">
                              {sezioni === 0
                                ? fill(d.menus.countsNoSections, { dishes: piatti })
                                : fill(d.menus.counts, { dishes: piatti, sections: sezioni })}{' '}
                              · {menu.currency}
                            </p>
                          </div>
                          <Link
                            href={`/menu/${menu.id}`}
                            className="shrink-0 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
                          >
                            {d.home.open}
                          </Link>
                          <button
                            onClick={() => setDeleting(menu)}
                            className="shrink-0 text-sm font-medium text-red-600 hover:text-red-700"
                          >
                            {d.common.delete}
                          </button>
                        </div>
                      );
                    })}

                    <button
                      ref={createButton}
                      onClick={() => setCreating(showcase.id)}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-700"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <path d="M12 5v14M5 12h14" />
                      </svg>
                      {d.menus.create}
                    </button>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}

      {creating !== null && (
        <NewMenuDialog
          venueName={(showcases ?? []).find((s) => s.id === creating)?.venueName ?? ''}
          onCancel={() => setCreating(null)}
          onCreate={(menuName, venueName) => handleCreate(creating, menuName, venueName)}
        />
      )}

      {deleting && (
        <ConfirmDialog
          title={d.menus.deleteTitle}
          body={d.menus.deleteBody}
          subject={deleting.name.trim() || d.menus.defaultName}
          confirmLabel={d.common.delete}
          onCancel={() => setDeleting(null)}
          onConfirm={() => {
            remove(deleting.id);
            setDeleting(null);
          }}
        />
      )}
    </div>
  );
}
