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
// LE DUE COSE NON SONO PARI NELLA SOSTANZA — il menù è il prodotto che si usa
// subito, la scheda aspetta ancora l'associazione al ristorante
// (/abbonamenti è un tappo) — ma da qui in poi condividono la riga IN PARI
// PESO VISIVO: stessa larghezza, stesso bottone nero (decisione dell'utente,
// 12/09, dopo aver provato la versione 2/3-1/3 con CTA diseguali). La
// differenza resta leggibile solo nel pallino di stato e nel testo sotto.
//
// E LO STATO DEL MENÙ NON È PIÙ "quanti piatti ci sono dentro". Da quando lo
// scatto pubblicato esiste (Tema 24), pieno e pubblicato sono due cose: questa
// home leggeva la prima e taceva la seconda, cioè taceva l'unica che può fare
// del male — allergeni corretti nella bozza e non ancora arrivati in sala.
//
// NON è un percorso a tappe numerato: le due cose sono indipendenti e c'è chi
// farà solo il menù senza mai voler entrare nell'app (Temi 10 e 16).
import { useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { fill, useI18n } from '@/lib/i18n';
import { useVenues, useVenueChoice, currentVenue, countLinks, type Venue } from '@/lib/venues';
import { menuItems, useMenus, type Menu } from '@/lib/menus';
import { dishThumb, useDishes, type Dish } from '@/lib/dishes';
import { usePublishState } from '@/lib/publish';
import { usePartnerProfile } from '@/lib/partnerProfile';
import { MENU_DOMINIO } from '@/lib/slug';
import { scaricaQrPng } from '@/lib/qr';
import NewVenueDialog from '@/components/NewVenueDialog';
import DeleteVenueDialog from '@/components/DeleteVenueDialog';
import UndoToast from '@/components/UndoToast';
import { ANCORA_INDIRIZZO } from '@/components/menus/MenuAddress';

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

// La pallina di un piatto: la foto ritagliata in tondo, come le mostra l'app,
// col nome sotto su due righe. Senza foto resta l'iniziale — un cerchio vuoto
// sembrerebbe un'immagine che non è arrivata, e queste palline servono proprio
// a far riconoscere il catalogo a colpo d'occhio.
//
// Si preme e si apre la maschera del piatto, in /piatti: la matita che compare
// sopra la foto dice che si va a correggere, non a guardare. La maschera resta
// una sola, là dove i piatti si gestiscono — qui c'è solo l'indirizzo per
// aprirla (?piatto=<id>).
function DishBubble({ dish }: { dish: Dish }) {
  const { d } = useI18n();
  const foto = dishThumb(dish);
  const nome = dish.name.trim();
  return (
    <Link
      href={`/piatti?piatto=${dish.id}`}
      title={nome}
      className="group flex w-20 shrink-0 flex-col items-center gap-1.5"
    >
      <span className="relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border border-gray-200 bg-white">
        {foto !== '' ? (
          // eslint-disable-next-line @next/next/no-img-element -- foto del partner (o data-URL sulle righe vecchie): next/image non le ottimizzerebbe
          <img src={foto} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="text-lg font-medium text-gray-400">
            {nome === '' ? '·' : nome.charAt(0).toUpperCase()}
          </span>
        )}
        {/* Il velo con la matita: compare anche col fuoco da tastiera, o chi
            non usa il mouse non saprebbe mai che quella pallina si preme */}
        <span className="absolute inset-0 flex items-center justify-center bg-gray-900/45 text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z" />
          </svg>
        </span>
      </span>
      <span className="line-clamp-2 text-center text-xs leading-tight text-gray-600 transition-colors group-hover:text-gray-900">
        {nome === '' ? d.dashboard.dishUnnamed : nome}
      </span>
    </Link>
  );
}

// IL SALUTO, col marchio accanto. Il logo non è decorazione: da telefono il
// portale non ha nessuna testata — c'è solo la barra in fondo con le icone —
// e questa è l'unica schermata che può dire di chi è il sito che si sta
// usando. Su desktop ripete quello che la barra laterale dice già, e va bene
// così: è la prima cosa che si vede aprendo, e costa una riga.
function Saluto({ saluto, intro }: { saluto: string; intro: string }) {
  return (
    <>
      <div className="flex items-center gap-3">
        <Image
          src="/icons/icon-192.png"
          alt=""
          width={40}
          height={40}
          priority
          className="h-10 w-10 shrink-0 rounded-2xl shadow-sm ring-1 ring-black/5"
        />
        <h1 className="min-w-0 text-xl font-semibold md:text-2xl">{saluto}</h1>
      </div>
      {/* Sotto e non accanto: è una frase lunga, e in colonna accanto al logo
          si spezzerebbe in tre righe strette su telefono. */}
      <p className="mt-2 text-balance text-sm text-gray-600">{intro}</p>
    </>
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
  const router = useRouter();
  // Se quello che i clienti leggono al tavolo è aggiornato. Lo stesso gancio
  // dell'editor: la home non deve avere una seconda idea di cosa sia
  // pubblicato — sarebbe la prima a dire una cosa e il menù un'altra.
  const { stato: pubblicazione, online } = usePublishState(venue?.id ?? null);

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
        <Saluto saluto={saluto} intro={d.dashboard.intro} />
        <div className="mt-8 max-w-xl rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center">
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
  // Ha senso dirlo solo con più menù: con uno solo il ritiro (v. /menu) non
  // si può nemmeno fare, quindi "attivo" sarebbe sempre vero e mai una notizia.
  const menuAttivi = suoiMenu.filter((menu) => menu.active).length;

  // MENÙ. Prima lo stato era "c'è almeno un piatto dentro": vero ma
  // insufficiente, perché un menù pieno può non essere mai uscito dalla bozza,
  // e uno online può avere in sospeso proprio la correzione di un allergene.
  // Quindi si guarda prima se il menù esiste ed è pieno (cosa che dipende solo
  // da questa pagina), poi cosa dice la pubblicazione (che arriva dopo, e
  // finché non arriva NON si inventa niente: si resta sul conto dei piatti).
  const menuVuoto = suoiMenu.length > 0 && piattiNeiMenu === 0;
  const inSospeso = online && pubblicazione?.hasChanges === true;
  const allergeniInSospeso = inSospeso && pubblicazione?.allergensChanged === true;

  // Il pallino dice SOLO se è live adesso, mai se ci sono modifiche in sospeso:
  // le due notizie mescolate ("da pubblicare" quando in realtà è già online)
  // facevano dubitare se il menù fosse raggiungibile o no (feedback utente,
  // 12/09). Le modifiche non pubblicate le dice solo l'avviso qui sotto.
  const statoMenu: Stato = suoiMenu.length === 0 || menuVuoto ? 'todo' : online ? 'ready' : 'draft';
  const etichettaMenu =
    suoiMenu.length === 0
      ? d.dashboard.statusTodo
      : menuVuoto
        ? d.dashboard.statusDraft
        : online
          ? d.dashboard.liveOn
          : d.dashboard.liveNever;

  // La frase per esteso sotto il pallino: SOLO le modifiche in sospeso, mai il
  // "non è ancora pubblicato" — quello lo dice già il pallino, e ripeterlo qui
  // sarebbe la stessa notizia due volte. Nessuna modifica in sospeso, niente
  // riga (richiesta dell'utente, 12/09). Quella degli allergeni si vede in
  // ambra: è l'unica riga di questa schermata che, se ignorata, arriva
  // addosso a un cliente.
  const avvisoMenu =
    suoiMenu.length === 0 || menuVuoto
      ? null
      : allergeniInSospeso
        ? d.menuEditor.publishAllergens
        : inSospeso
          ? d.menuEditor.publishPending
          : null;

  // Le palline del catalogo: gli ULTIMI arrivati, il più recente per primo.
  // La lista scende ordinata per sort_order e poi per data di creazione, e
  // sort_order oggi nessuno lo scrive: quindi la coda è davvero l'ultimo che
  // il ristoratore ha aggiunto. Se un giorno i piatti si riordineranno a mano,
  // questa riga andrà rifatta guardando la data.
  const ultimiPiatti = dishes.slice(-6).reverse();
  // Serve solo qui, per il link "Apri online" e per il QR: la scatola verde
  // con dentro il codice e l'indirizzo resta nell'editor (LiveBox), dove è
  // davvero "la cosa di tutti i giorni". Qui, in un riassunto, sarebbe stata
  // la sezione più vistosa della pagina per l'azione meno frequente.
  const indirizzoMenu = `https://${MENU_DOMINIO}${venue.slug}`;

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
      <Saluto saluto={saluto} intro={d.dashboard.intro} />

      {/* Di quale locale parla tutto quello che c'è sotto. Il nome si corregge
          da qui: è quello che i clienti leggono in cima al menù, non
          un'etichetta interna, e non deve costare una schermata.

          CON PIÙ LOCALI SONO CAPITOLI, non una tendina. La tendina nasconde
          quanti locali ci sono e come si chiamano finché non la si apre, e per
          cambiare chiede due gesti; i capitoli dicono tutto stando fermi e ne
          chiedono uno. Il nome del locale aperto non si ripete sotto: il
          capitolo acceso è già il titolo, e la matita corregge quello. */}
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
        ) : venues.length > 1 ? (
          <>
            {/* Non è una fila di linguette da tastiera (role=tablist): sono
                bottoni che scelgono, e aria-pressed dice quale è acceso. */}
            <div className="flex min-w-0 flex-wrap items-center gap-2" aria-label={d.dashboard.switchLabel} role="group">
              {venues.map((v) => {
                const acceso = v.id === venue.id;
                return (
                  <button
                    key={v.id}
                    onClick={() => cambiaLocale(v.id)}
                    aria-pressed={acceso}
                    className={`max-w-[14rem] truncate rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
                      acceso
                        ? 'bg-gray-900 text-white'
                        : 'border border-gray-300 bg-white text-gray-600 hover:border-gray-400 hover:text-gray-900'
                    }`}
                  >
                    {v.venueName.trim() || d.home.unnamed}
                  </button>
                );
              })}
            </div>
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
      </div>

      {/* MENÙ e SCHEDA condividono la riga a pari peso: stessa larghezza,
          stesso bottone nero. Su schermo stretto tornano una sopra l'altra,
          nello stesso ordine. */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* IL MENÙ: come sta messo, cosa manca perché arrivi in sala, e — se
            in sala c'è davvero — l'indirizzo, il codice e la pagina da
            aprire. */}
        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-900">
                {d.dashboard.menusTitle}
              </h2>
              {/* Quanti sono, non quali: i nomi si vedono aprendo "Vedi i
                  menù" qui sotto. */}
              {suoiMenu.length > 1 && (
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                  {suoiMenu.length}
                </span>
              )}
            </div>
            {/* Il pallino è anche un link: porta dritto alla sezione
                indirizzo nell'editor, dove "pubblicato"/"non pubblicato" si
                legge e si cambia (richiesta dell'utente, 13/09). Senza un
                menù non c'è editor da aprire, quindi resta solo testo. */}
            {suoiMenu.length > 0 ? (
              <Link
                href={`/menu/${suoiMenu[0].id}#${ANCORA_INDIRIZZO}`}
                title={d.dashboard.menusAddressHint}
                className="rounded transition-opacity hover:opacity-70"
              >
                <StatusPill stato={statoMenu} label={etichettaMenu} />
              </Link>
            ) : (
              <StatusPill stato={statoMenu} label={etichettaMenu} />
            )}
          </div>

          {/* Il posto dov'era il conteggio ("3 sezioni · 5 piatti") e la
              frase fissa su come i clienti lo aprono. Con più di un menù
              c'è una notizia vera da dare — quanti sono ATTIVI, che è del
              singolo menù e non del locale come "pubblicato" nel pallino
              sopra. Con zero o un menù solo quella notizia non esiste (il
              ritiro parte da due in su), e uno spazio vuoto lì non diceva a
              cosa serve il box: resta la frase d'apertura, incisiva apposta
              per chi il box non l'ha ancora usato (richiesta dell'utente,
              13/09). */}
          {suoiMenu.length > 1 ? (
            <p className="mt-1.5 text-sm text-gray-900">
              {menuAttivi === 0
                ? d.dashboard.menusNoneActive
                : menuAttivi === suoiMenu.length
                  ? fill(d.dashboard.menusAllActive, { count: menuAttivi })
                  : fill(d.dashboard.menusSomeActive, {
                      active: menuAttivi,
                      total: suoiMenu.length,
                    })}
            </p>
          ) : (
            <p className="mt-1.5 text-sm text-gray-900">{d.dashboard.menusHint}</p>
          )}

          {avvisoMenu !== null && (
            <p
              className={`mt-3 text-xs leading-snug ${
                allergeniInSospeso ? 'font-medium text-amber-800' : 'text-gray-600'
              }`}
            >
              {avvisoMenu}
            </p>
          )}

          {suoiMenu.length === 0 ? (
            <div className="mt-4">
              <PrimaryLink href={`/menu?nuovo=${venue.id}`}>{d.dashboard.menusCreate}</PrimaryLink>
            </div>
          ) : (
            <>
              {/* Con un solo menù si apre direttamente l'editor; con più di
                  uno "Apri l'editor" non saprebbe quale scegliere, quindi
                  diventa "Vedi i menù" e porta all'elenco. Per lo stesso
                  motivo, con più menù spariscono anche "Anteprima"/"Apri
                  online" e il download del QR (richiesta dell'utente,
                  13/09): restano solo col menù singolo, da pubblicato come
                  link vero — non ha senso un'anteprima di una pagina che si
                  può aprire per davvero. L'icona del QR accanto sostituisce
                  la scatola verde di prima: qui basta il gesto rapido di
                  scaricarlo, il dettaglio (codice grande, link da copiare,
                  modifica indirizzo) resta nell'editor. */}
              <div className="mt-4 flex flex-wrap items-center gap-3">
                {suoiMenu.length > 1 ? (
                  <PrimaryLink href="/menu">{d.dashboard.menusAll}</PrimaryLink>
                ) : (
                  <PrimaryLink href={`/menu/${suoiMenu[0].id}`}>{d.dashboard.menusOpen}</PrimaryLink>
                )}
                {suoiMenu.length === 1 &&
                  (online ? (
                    <a
                      href={indirizzoMenu}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium text-gray-600 underline transition-colors hover:text-gray-900"
                    >
                      {d.menuEditor.openLive}
                    </a>
                  ) : (
                    <SecondaryLink href={`/menu/${suoiMenu[0].id}/anteprima`}>
                      {d.menuEditor.previewTitle}
                    </SecondaryLink>
                  ))}
                {suoiMenu.length === 1 && online && (
                  <button
                    onClick={() => void scaricaQrPng(indirizzoMenu, venue.slug)}
                    aria-label={d.menuEditor.qrPng}
                    title={d.menuEditor.qrPng}
                    className="shrink-0 text-gray-400 transition-colors hover:text-gray-900"
                  >
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M12 3v12m0 0l-4-4m4 4l4-4M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2" />
                    </svg>
                  </button>
                )}
              </div>

              {/* Le due situazioni d'attesa restano dette, ma in una riga sola
                  e senza riquadro tratteggiato: qui è un riassunto, non il
                  posto in cui si agisce davvero. */}
              {!online && (
                <p className="mt-3 text-xs leading-relaxed text-gray-500">
                  {venue.slug === '' ? d.menuEditor.liveNoAddress : d.menuEditor.liveNotYet}{' '}
                  <button
                    onClick={() => router.push(`/menu/${suoiMenu[0].id}#${ANCORA_INDIRIZZO}`)}
                    className="font-medium text-gray-700 underline transition-colors hover:text-gray-900"
                  >
                    {venue.slug === '' ? d.menuEditor.liveChoose : d.common.edit}
                  </button>
                </p>
              )}
            </>
          )}
        </section>

        {/* LA SCHEDA: c'è, si prepara, ma finché non si può associare il
            locale a un ristorante non è una cosa che si "fa" — lo dice il
            pallino di stato e il testo, non più la forma della card. I link
            e i contatti stanno qui perché è qui che si vanno a scrivere. */}
        <section className="flex h-full flex-col rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-900">
              {d.dashboard.cardTitle}
            </h2>
            <StatusPill
              stato={venue.cardId === null ? 'todo' : 'ready'}
              label={venue.cardId === null ? d.dashboard.statusOff : d.dashboard.statusOn}
            />
          </div>
          <p className="mt-1.5 text-sm text-gray-900">{dettaglioScheda}</p>
          <p className="mt-0.5 text-xs text-gray-500">{d.dashboard.cardHint}</p>

          <div className="mt-auto flex flex-wrap items-center gap-3 pt-4">
            <PrimaryLink href={`/locale/${venue.id}`}>{d.dashboard.cardOpen}</PrimaryLink>
            <SecondaryLink href={`/locale/${venue.id}#link`}>{d.dashboard.quickLinks}</SecondaryLink>
          </div>
        </section>
      </div>

      {/* Il catalogo sta FUORI dalle due: è il substrato, non una terza cosa
          da fare, ed è del partner — lo stesso piatto vale per tutti i suoi
          locali. Perciò riga più leggera e staccata.

          LE PALLINE sono lì per far riconoscere il catalogo senza aprirlo: si
          vede a colpo d'occhio se c'è dentro il proprio lavoro, e quali sono
          gli ultimi piatti aggiunti. Sono un'anteprima, non comandi: non si
          può aprire un piatto dal suo indirizzo (in /piatti la maschera è un
          pannello, non una pagina), e una pallina che porta a un elenco
          generico prometterebbe una cosa e ne farebbe un'altra.

          "NUOVO PIATTO" è diventato l'ultima pallina, col più: sta dove
          finisce la fila di quelle che ci sono, che è il posto in cui uno
          pensa "ne manca uno". Da bottone in fila con "Vedi tutti" erano due
          comandi accanto, e il più importante dei due era il meno frequente. */}
      <div className="mt-4 rounded-2xl border border-gray-200 bg-gray-50 px-5 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            {/* Anche il titolo porta al catalogo: è la prima cosa che si prova
                a premere, e un titolo che non fa niente costringe a cercare il
                comando che invece c'è già in fondo alla riga. */}
            <Link
              href="/piatti"
              className="group inline-flex items-center gap-1 text-sm font-medium text-gray-900"
            >
              <span>
                {d.dashboard.catalogTitle} — {dishes.length}{' '}
                {dishes.length === 1 ? d.home.dishOne : d.home.dishOther}
              </span>
              <svg
                className="h-3.5 w-3.5 shrink-0 text-gray-400 transition-transform group-hover:translate-x-0.5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M9 6l6 6-6 6" />
              </svg>
            </Link>
            <p className="mt-0.5 text-xs text-gray-500">{d.dashboard.catalogHint}</p>
          </div>
          {/* "Vedi tutti" solo se c'è qualcosa da vedere: a catalogo vuoto
              porterebbe a una pagina che dice soltanto che è vuota, e la
              pallina col più lì accanto è già la cosa giusta da premere. */}
          {dishes.length > 0 && (
            <SecondaryLink href="/piatti">{d.dashboard.catalogOpen}</SecondaryLink>
          )}
        </div>

        <div className="mt-4 flex flex-wrap items-start gap-3">
          {ultimiPiatti.map((dish) => (
            <DishBubble key={dish.id} dish={dish} />
          ))}
          {/* Stessa forma delle altre — cerchio e nome sotto — perché è una
              della fila: il posto del piatto che non c'è ancora. */}
          <Link
            href="/piatti?nuovo"
            className="group flex w-20 shrink-0 flex-col items-center gap-1.5"
          >
            <span className="flex h-16 w-16 items-center justify-center rounded-full border border-dashed border-gray-300 bg-white text-gray-400 transition-colors group-hover:border-gray-400 group-hover:text-gray-900">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <path d="M12 5v14M5 12h14" />
              </svg>
            </span>
            <span className="line-clamp-2 text-center text-xs leading-tight text-gray-500 transition-colors group-hover:text-gray-900">
              {d.dashboard.quickDish}
            </span>
          </Link>
        </div>
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
