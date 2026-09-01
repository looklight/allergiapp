'use client';

// L'elenco dei menù del ristoratore. Un menù appartiene al LOCALE, non alla
// scheda AllergiApp (DIGITAL_MENU.md, Tema 16): con un locale solo non si
// chiede niente, con più d'uno si raggruppa per locale, perché "Carta" e
// "Carta" di due ristoranti diversi sono indistinguibili in una lista piatta.
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { fill, useI18n } from '@/lib/i18n';
import { useDishes } from '@/lib/dishes';
import { useVenues, type Venue } from '@/lib/venues';
import { menuItems, useMenus, type Menu } from '@/lib/menus';
import ConfirmDialog from '@/components/menus/ConfirmDialog';
import NewMenuDialog from '@/components/menus/NewMenuDialog';

export default function MenusPage() {
  const { d } = useI18n();
  const router = useRouter();
  const { dishes } = useDishes();
  const { menus, create, remove, rename } = useMenus();
  const { venues, create: createVenue } = useVenues();
  const [deleting, setDeleting] = useState<Menu | null>(null);
  // il locale a cui si sta aggiungendo un menù; null = nessuna finestra aperta
  const [creating, setCreating] = useState(false);
  // Il locale già deciso da chi ci ha mandati qui: la finestra non lo chiede
  const [fissato, setFissato] = useState<Venue | null>(null);

  // La home ha un'azione rapida che porta qui con la maschera GIÀ APERTA: una
  // scorciatoia che ti lascia davanti alla pagina, a cercare il bottone, non è
  // una scorciatoia. Si legge l'indirizzo invece di useSearchParams, che
  // obbligherebbe a incartare la pagina in un <Suspense> per la generazione
  // statica — molto rumore per un parametro.
  //
  // Si aspetta che i DATI ci siano, e non basta il montaggio: aprendola subito
  // la finestra nasceva con le liste ancora vuote e proponeva di creare un
  // locale nuovo a chi ce l'aveva già. Una volta sola, o riaprirebbe la
  // maschera a ogni ricarica delle liste.
  const nuovoChiesto = useRef(false);
  useEffect(() => {
    if (nuovoChiesto.current || !venues || !menus) return;
    const chiesto = new URLSearchParams(window.location.search).get('nuovo');
    if (chiesto === null) return;
    nuovoChiesto.current = true;

    // Il parametro si consuma SUBITO: senza, tornando indietro dall'editor si
    // ricadrebbe su /menu?nuovo=… e partirebbe un secondo menù per sbaglio.
    window.history.replaceState(null, '', '/menu');

    // ?nuovo=<id> arriva dalla home, che il locale ce l'ha già scelto. Se non
    // resta niente da chiedere — il locale ha un nome e non ha ancora menù —
    // il menù si fa e basta: una finestra con dentro una domanda sola, di cui
    // si conosce già la risposta, è solo un clic in mezzo.
    const locale = chiesto === '' ? null : (venues.find((v) => v.id === chiesto) ?? null);
    if (locale === null) {
      setCreating(true);
      return;
    }
    if (locale.venueName.trim() !== '' && !menus.some((m) => m.venueId === locale.id)) {
      void handleCreate(locale.id, locale.venueName, '');
      return;
    }
    setFissato(locale);
    setCreating(true);
    // handleCreate e d sono stabili quanto basta: la guardia qui sopra fa
    // partire tutto questo una volta sola
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [venues, menus]);
  const createButton = useRef<HTMLButtonElement>(null);

  // Il ristorante può essere uno dei suoi o uno nuovo: nel secondo caso nasce
  // qui, col nome scritto nella finestra. È l'unico posto da cui quel nome può
  // arrivare per chi non associa nessuna scheda AllergiApp.
  async function handleCreate(
    venueId: string | null,
    venueName: string,
    menuName: string,
    // il menù che c'era già e non aveva nome: adesso ne ha uno, e va scritto
    // PRIMA di creare il secondo, o per un istante due linguette sarebbero
    // una senza nome e una no proprio mentre si guarda la pagina
    battezza?: { id: string; name: string }
  ) {
    setCreating(false);
    setFissato(null);
    if (battezza) await rename(battezza.id, battezza.name);
    let id = venueId;
    if (id === null) {
      const locale = await createVenue(venueName);
      if (!locale) return;
      id = locale.id;
    }
    const creato = await create(id, menuName);
    if (creato) router.push(`/menu/${creato.id}`);
  }

  const loading = !venues || !dishes || !menus;
  // Solo i locali che hanno almeno un menù: un locale esiste anche per la
  // sola scheda AllergiApp, e qui elencare un ristorante vuoto vorrebbe dire
  // mostrare in questa pagina una cosa che con i menù non c'entra.
  const conMenu = (venues ?? []).filter((v) =>
    (menus ?? []).some((m) => m.venueId === v.id)
  );

  const bottoneNuovo = (
    <button
      ref={createButton}
      onClick={() => setCreating(true)}
      className="inline-flex items-center gap-1.5 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-700"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M12 5v14M5 12h14" />
      </svg>
      {d.menus.create}
    </button>
  );

  return (
    <div>
      <h1 className="mb-2 text-xl font-semibold md:text-2xl">{d.menus.title}</h1>
      <p className="mb-8 max-w-2xl text-balance text-sm text-gray-600">{d.menus.intro}</p>

      {loading ? (
        <p className="text-sm text-gray-500">{d.common.loading}</p>
      ) : conMenu.length === 0 ? (
        // Nessun menù: non si chiede più di creare prima un locale, il
        // ristorante lo si dice nella finestra che si apre da qui
        <div className="max-w-xl rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center">
          <p className="text-sm font-medium text-gray-900">{d.menus.empty}</p>
          <p className="mt-1 text-sm text-gray-500">{d.menus.emptyHint}</p>
          <div className="mt-4 flex justify-center">{bottoneNuovo}</div>
        </div>
      ) : (
        <div className="max-w-xl space-y-8">
          {conMenu.map((venue) => (
            <div key={venue.id} className="space-y-3">
              {/* Il nome del ristorante c'è SEMPRE, anche con un locale solo:
                  è lui l'intestazione di questi menù, non un'etichetta di
                  servizio. Un menù si chiama "Carta" — ma è la carta DI
                  qualcuno, e senza quel nome sopra non si sa di chi. */}
              <h2 className="text-sm font-semibold text-gray-900">
                {venue.venueName.trim() || d.home.unnamed}
              </h2>

              {menus
                .filter((menu) => menu.venueId === venue.id)
                .map((menu) => {
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
                          {menu.name.trim() || d.menus.unnamed}
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
            </div>
          ))}

          {/* Uno solo, in fondo: il ristorante si sceglie nella finestra,
              quindi non serve più un bottone per ognuno */}
          {bottoneNuovo}
        </div>
      )}

      {creating && (
        <NewMenuDialog
          venues={venues ?? []}
          fixed={fissato}
          menusOf={(venueId) => (menus ?? []).filter((m) => m.venueId === venueId)}
          onCancel={() => {
            setCreating(false);
            setFissato(null);
          }}
          onCreate={handleCreate}
        />
      )}

      {deleting && (
        <ConfirmDialog
          title={d.menus.deleteTitle}
          body={d.menus.deleteBody}
          subject={deleting.name.trim() || d.menus.unnamed}
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
