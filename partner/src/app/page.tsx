'use client';

// La home del portale.
//
// Prima era l'elenco delle vetrine: chiedeva al ristoratore di sapere già
// cos'era una vetrina per capire dove mettere le mani, e la voce di menù si
// chiamava "Locali" — cioè un archivio, non una home. Adesso è una home vera:
// dice ciao, dice di quale locale si sta parlando, mostra a che punto sono le
// due cose che il ristoratore può accendere e offre le azioni che farà più
// spesso, senza fargliele cercare dentro le pagine.
//
// LE COSE SONO DUE, non tre: il menù al tavolo e la scheda AllergiApp. I link
// e i contatti non sono una terza cosa a sé — vivono DENTRO la scheda, che è
// la pagina dove si va a definirli (decisione dell'utente, 01/09). Sul
// database restano appesi al locale, perché domani serviranno anche al menù
// pubblico: è il posto in cui si modificano che è uno solo.
//
// NON è un percorso a tappe numerato: le due cose sono indipendenti e c'è chi
// farà solo il menù senza mai voler entrare nell'app (Temi 10 e 16).
import { useRef, useState } from 'react';
import Link from 'next/link';
import { fill, useI18n } from '@/lib/i18n';
import { MULTI_MENU } from '@/lib/features';
import { useVenues, useVenueChoice, currentVenue, countLinks, type Venue } from '@/lib/venues';
import { menuItems, useMenus, type Menu } from '@/lib/menus';
import { useDishes } from '@/lib/dishes';
import { usePartnerProfile } from '@/lib/partnerProfile';
import NewVenueDialog from '@/components/NewVenueDialog';
import DeleteVenueDialog from '@/components/DeleteVenueDialog';
import UndoToast from '@/components/UndoToast';

type Stato = 'ready' | 'draft' | 'todo';

// Il pallino di stato: verde fatto, ambra cominciato, grigio da fare. Il
// colore da solo non basta — chi non lo distingue legge la parola accanto.
function StatusPill({ stato, label }: { stato: Stato; label: string }) {
  const dot =
    stato === 'ready' ? 'bg-[#4CAF50]' : stato === 'draft' ? 'bg-[#E8A33D]' : 'bg-gray-300';
  return (
    <span className="flex shrink-0 items-center gap-1.5 text-xs text-gray-500">
      <span className={`h-2 w-2 rounded-full ${dot}`} />
      {label}
    </span>
  );
}

// Una delle due cose: titolo con lo stato a destra, una riga che dice come sta
// messa, una riga che spiega a cosa serve, e i comandi in fondo. Le card sono
// alte uguale (flex + mt-auto sui comandi) perché affiancate si guardano.
function ThingCard({
  title,
  stato,
  statusLabel,
  detail,
  hint,
  children,
}: {
  title: string;
  stato: Stato;
  statusLabel: string;
  detail: string;
  hint: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-900">{title}</h2>
        <StatusPill stato={stato} label={statusLabel} />
      </div>
      <p className="mt-1.5 text-sm text-gray-900">{detail}</p>
      <p className="mt-0.5 text-xs text-gray-500">{hint}</p>
      <div className="mt-4 flex flex-wrap items-center gap-3">{children}</div>
    </div>
  );
}

function PrimaryLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-700"
    >
      {children}
    </Link>
  );
}

function SecondaryLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="text-sm font-medium text-gray-600 underline transition-colors hover:text-gray-900"
    >
      {children}
    </Link>
  );
}

// Le azioni rapide: quello che si fa spesso, a portata di clic dalla home e
// non da cercare dentro una pagina. Portano dove la cosa SUCCEDE — la
// maschera già aperta — non alla pagina che la contiene.
function QuickAction({
  href,
  label,
  crea = true,
}: {
  href: string;
  label: string;
  // il "+" vale solo per chi crea qualcosa: su "Link e contatti" prometterebbe
  // una cosa nuova mentre si va a correggere quelle che ci sono
  crea?: boolean;
}) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1.5 rounded-full border border-gray-300 bg-white px-3.5 py-2 text-sm font-medium text-gray-700 transition-colors hover:border-gray-400 hover:text-gray-900"
    >
      {crea && (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M12 5v14M5 12h14" />
        </svg>
      )}
      {label}
    </Link>
  );
}

export default function HomePage() {
  const { d } = useI18n();
  const profile = usePartnerProfile();
  const { venues, create, rename, remove, restore } = useVenues();
  // I menù servono qui per due motivi, e nessuno dei due è elencarli: dire a
  // che punto è il menù di questo locale, e — eliminandolo — dire quanti se
  // ne perdono e rimetterli se si annulla (se ne vanno per cascata).
  const { menus, forgetVenue, restore: restoreMenus } = useMenus();
  // Il catalogo è del partner e non del locale: serve per il conteggio nella
  // riga in fondo
  const { dishes } = useDishes();

  // Quale locale si sta guardando: condiviso con la barra laterale, che ci
  // punta la voce "Scheda AllergiApp" (v. useVenueChoice)
  const { venueId, scegli } = useVenueChoice();
  const [creating, setCreating] = useState(false);
  // Rinomina in riga: nessuna schermata a parte
  const [renaming, setRenaming] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [deleting, setDeleting] = useState<Venue | null>(null);
  // Locale appena eliminato: finché il toast è in piedi si può rimettere.
  // Col locale si tiene da parte anche la copia dei suoi menù: dal database
  // sono già spariti, e l'unico posto da cui possono tornare è questa.
  const [undoable, setUndoable] = useState<{ venue: Venue; menus: Menu[] } | null>(null);
  // Punto fermo dove torna il fuoco quando il toast se ne va
  const addButton = useRef<HTMLButtonElement>(null);

  const venue = currentVenue(venues ?? null, venueId);

  function cambiaLocale(id: string) {
    scegli(id);
    // la rinomina aperta era di un altro locale
    setRenaming(false);
  }

  // Creato il locale si RESTA qui. Prima si finiva dritti nella scheda
  // AllergiApp, che è solo una delle cose che ci si possono fare — e per la
  // maggioranza dei ristoratori nemmeno la prima: chi vuole il menù al tavolo
  // non deve passare da una schermata che parla dell'app.
  async function handleCreate(venueName: string) {
    const created = await create(venueName);
    setCreating(false);
    if (created) cambiaLocale(created.id);
  }

  function confirmDelete(target: Venue) {
    // La finestra non lascia confermare finché i menù non sono arrivati,
    // quindi qui la lista c'è davvero
    const suoi = (menus ?? []).filter((menu) => menu.venueId === target.id);
    remove(target.id);
    forgetVenue(target.id);
    setDeleting(null);
    setUndoable({ venue: target, menus: suoi });
  }

  async function undoDelete() {
    if (!undoable) return;
    const { venue: tornato, menus: suoi } = undoable;
    setUndoable(null);
    // Prima il locale, poi i menù: al contrario la chiave esterna li rifiuta
    await restore(tornato);
    await restoreMenus(suoi);
    cambiaLocale(tornato.id);
  }

  function commitRename() {
    if (venue) rename(venue.id, nameDraft.trim());
    setRenaming(false);
  }

  // Il saluto: il nome arriva dal profilo che il guard ha già letto. Senza
  // nome si saluta e basta, che è meglio di un "Ciao ," con la virgola sola.
  const nome = profile?.firstName.trim() ?? '';
  const saluto = nome === '' ? d.dashboard.greetingPlain : fill(d.dashboard.greeting, { name: nome });

  if (!venues || !menus || !dishes) {
    return <p className="text-sm text-gray-500">{d.common.loading}</p>;
  }

  // Nessun locale: non c'è niente da riassumere, si chiede il primo
  if (!venue) {
    return (
      <div>
        <h1 className="mb-2 text-xl font-semibold md:text-2xl">{saluto}</h1>
        <p className="mb-8 text-balance text-sm text-gray-600">{d.dashboard.intro}</p>
        <div className="max-w-xl rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center">
          <p className="text-sm font-medium text-gray-900">{d.dashboard.emptyTitle}</p>
          <p className="mt-1 text-sm text-gray-500">{d.dashboard.emptyHint}</p>
          <button
            ref={addButton}
            onClick={() => setCreating(true)}
            className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-700"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
            {d.home.create}
          </button>
        </div>
        {creating && (
          <NewVenueDialog onCancel={() => setCreating(false)} onCreate={handleCreate} />
        )}
      </div>
    );
  }

  const suoiMenu = menus.filter((menu) => menu.venueId === venue.id);
  const piattiNeiMenu = suoiMenu.reduce((tot, menu) => tot + menuItems(menu).length, 0);
  const links = countLinks(venue.links);
  const inScheda = venue.dishIds.length;

  // MENÙ: fatto quando c'è almeno un piatto dentro. Un menù creato e vuoto
  // non è "pronto" — è la carta bianca che il cliente si troverebbe davanti.
  const statoMenu: Stato =
    suoiMenu.length === 0 ? 'todo' : piattiNeiMenu === 0 ? 'draft' : 'ready';
  // I nomi dei menù solo quando sono più d'uno: il nome di un menù serve a
  // distinguerlo dagli altri, e da solo, sotto una card che si chiama già
  // "Menù al tavolo", direbbe soltanto "Menù senza nome".
  const nomiMenu =
    suoiMenu.length > 1
      ? `${suoiMenu.map((menu) => menu.name.trim() || d.menus.unnamed).join(' · ')} — `
      : '';
  const dettaglioMenu =
    suoiMenu.length === 0
      ? d.dashboard.menusEmpty
      : `${nomiMenu}${piattiNeiMenu} ${piattiNeiMenu === 1 ? d.home.dishOne : d.home.dishOther}`;

  // SCHEDA: si dice cosa c'è già dentro. Lo stato invece è l'unica cosa che
  // il ristoratore non decide da solo — senza claim la scheda non è nell'app.
  const pezziScheda = [
    links > 0 ? `${links} ${links === 1 ? d.home.linkOne : d.home.linkOther}` : null,
    inScheda > 0
      ? `${inScheda} ${inScheda === 1 ? d.dashboard.dishChosen : d.dashboard.dishesChosen}`
      : null,
  ].filter((pezzo): pezzo is string => pezzo !== null);
  const dettaglioScheda = pezziScheda.length === 0 ? d.dashboard.cardEmpty : pezziScheda.join(' · ');

  return (
    <div>
      <h1 className="text-xl font-semibold md:text-2xl">{saluto}</h1>
      <p className="mt-2 text-balance text-sm text-gray-600">{d.dashboard.intro}</p>

      {/* Di quale locale parla tutto quello che c'è sotto. Il nome si corregge
          da qui: è quello che i clienti leggono in cima al menù, non
          un'etichetta interna, e non deve costare una schermata. */}
      <div className="mb-3 mt-8 flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-gray-200 pb-3">
        {renaming ? (
          <input
            type="text"
            value={nameDraft}
            autoFocus
            onChange={(e) => setNameDraft(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitRename();
              if (e.key === 'Escape') setRenaming(false);
            }}
            placeholder={d.editor.venueNamePlaceholder}
            className="min-w-0 flex-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium focus:border-gray-900 focus:outline-none"
          />
        ) : (
          <>
            <h2 className="min-w-0 truncate text-base font-semibold text-gray-900">
              {venue.venueName.trim() || d.home.unnamed}
            </h2>
            <button
              onClick={() => {
                setNameDraft(venue.venueName);
                setRenaming(true);
              }}
              aria-label={d.home.rename}
              title={d.home.rename}
              className="shrink-0 text-gray-300 transition-colors hover:text-gray-700"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z" />
              </svg>
            </button>
          </>
        )}

        {/* La tendina compare solo se c'è davvero una scelta da fare */}
        {venues.length > 1 && (
          <select
            value={venue.id}
            onChange={(e) => cambiaLocale(e.target.value)}
            aria-label={d.dashboard.switchLabel}
            className="ml-auto max-w-[12rem] rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-sm focus:border-gray-900 focus:outline-none"
          >
            {venues.map((v) => (
              <option key={v.id} value={v.id}>
                {v.venueName.trim() || d.home.unnamed}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Le due cose, affiancate: sono pari, e una sopra l'altra sembrerebbero
          un ordine da seguire */}
      <div className="grid gap-3 md:grid-cols-2">
        <ThingCard
          title={d.dashboard.menusTitle}
          stato={statoMenu}
          statusLabel={
            statoMenu === 'ready'
              ? d.dashboard.statusReady
              : statoMenu === 'draft'
                ? d.dashboard.statusDraft
                : d.dashboard.statusTodo
          }
          detail={dettaglioMenu}
          hint={d.dashboard.menusHint}
        >
          {suoiMenu.length === 0 ? (
            <PrimaryLink href={`/menu?nuovo=${venue.id}`}>{d.dashboard.menusCreate}</PrimaryLink>
          ) : (
            <>
              <PrimaryLink href={`/menu/${suoiMenu[0].id}`}>{d.dashboard.menusOpen}</PrimaryLink>
              <SecondaryLink href={`/menu/${suoiMenu[0].id}/anteprima`}>
                {d.menuEditor.previewTitle}
              </SecondaryLink>
              {suoiMenu.length > 1 && (
                <SecondaryLink href="/menu">{d.dashboard.menusAll}</SecondaryLink>
              )}
            </>
          )}
        </ThingCard>

        <ThingCard
          title={d.dashboard.cardTitle}
          stato={venue.cardId === null ? 'todo' : 'ready'}
          statusLabel={venue.cardId === null ? d.dashboard.statusOff : d.dashboard.statusOn}
          detail={dettaglioScheda}
          hint={d.dashboard.cardHint}
        >
          <PrimaryLink href={`/locale/${venue.id}`}>{d.dashboard.cardOpen}</PrimaryLink>
          {venue.cardId === null && (
            <SecondaryLink href="/abbonamenti">{d.dashboard.cardLink}</SecondaryLink>
          )}
        </ThingCard>
      </div>

      <div className="mt-8">
        <p className="mb-2.5 text-xs font-medium uppercase tracking-wide text-gray-400">
          {d.dashboard.quickTitle}
        </p>
        <div className="flex flex-wrap gap-2">
          <QuickAction href="/piatti?nuovo" label={d.dashboard.quickDish} />
          {/* col locale in coda: da qui è già scelto, e la finestra non deve
              richiederlo (con un menù già fatto chiederà solo il nome).
              Sparisce quando non c'è nessun menù da fare: con i menù multipli
              spenti (features.ts) un locale che ce l'ha già non può averne un
              altro, e la card qui sopra ha già "Apri". */}
          {(MULTI_MENU || suoiMenu.length === 0) && (
            <QuickAction href={`/menu?nuovo=${venue.id}`} label={d.dashboard.quickMenu} />
          )}
          <QuickAction href={`/locale/${venue.id}#link`} label={d.dashboard.quickLinks} crea={false} />
        </div>
      </div>

      {/* Il catalogo sta FUORI dalle due: è il substrato, non una terza cosa
          da accendere, ed è del partner — lo stesso piatto vale per tutti i
          suoi locali. Perciò riga più leggera e staccata. */}
      <div className="mt-8 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-gray-50 px-5 py-4">
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-900">
            {d.dashboard.catalogTitle} — {dishes.length}{' '}
            {dishes.length === 1 ? d.home.dishOne : d.home.dishOther}
          </p>
          <p className="mt-0.5 text-xs text-gray-500">{d.dashboard.catalogHint}</p>
        </div>
        <Link
          href="/piatti"
          className="shrink-0 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
        >
          {d.dashboard.catalogOpen}
        </Link>
      </div>

      {/* In fondo e sottovoce: aggiungere un locale è raro, eliminarlo di più */}
      <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 pt-4">
        <button
          ref={addButton}
          onClick={() => setCreating(true)}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 transition-colors hover:text-gray-900"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
          {d.dashboard.addVenue}
        </button>
        <button
          onClick={() => setDeleting(venue)}
          className="text-sm font-medium text-red-600 transition-colors hover:text-red-700"
        >
          {d.dashboard.deleteVenue}
        </button>
      </div>

      {creating && (
        <NewVenueDialog onCancel={() => setCreating(false)} onCreate={handleCreate} />
      )}

      {deleting && (
        <DeleteVenueDialog
          venue={deleting}
          menus={menus.filter((menu) => menu.venueId === deleting.id).length}
          onCancel={() => setDeleting(null)}
          onConfirm={() => confirmDelete(deleting)}
        />
      )}

      {undoable && (
        <UndoToast
          key={undoable.venue.id}
          message={d.home.deleted}
          undoLabel={d.home.undo}
          onUndo={() => void undoDelete()}
          onExpire={() => setUndoable(null)}
          returnFocusTo={addButton}
        />
      )}
    </div>
  );
}
