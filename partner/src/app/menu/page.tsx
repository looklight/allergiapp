'use client';

// L'elenco dei menù del ristoratore. Un menù appartiene al LOCALE, non alla
// scheda AllergiApp (DIGITAL_MENU.md, Tema 16): con un locale solo non si
// chiede niente, con più d'uno si raggruppa per locale, perché "Carta" e
// "Carta" di due ristoranti diversi sono indistinguibili in una lista piatta.
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { fill, useI18n } from '@/lib/i18n';
import { MULTI_MENU } from '@/lib/features';
import { useDishes } from '@/lib/dishes';
import { useVenues, type Venue } from '@/lib/venues';
import { menuItems, useMenus, type Menu } from '@/lib/menus';
import ConfirmDialog from '@/components/menus/ConfirmDialog';
import Interruttore from '@/components/menus/Interruttore';
import NewMenuDialog from '@/components/menus/NewMenuDialog';
import UndoToast from '@/components/UndoToast';
import { StatusDot } from '@/components/StatusPill';
import ProTag from '@/components/ProTag';
import { abbonamentoDi, useSubscriptions } from '@/lib/subscriptions';
import { usePublishStates } from '@/lib/publish';
import { CreateButton, PageIntro, PageTitleRow } from '@/components/PageHeading';

export default function MenusPage() {
  const { d } = useI18n();
  const router = useRouter();
  const { dishes } = useDishes();
  const { menus, create, remove, rename, setActive, restore } = useMenus();
  const { venues, create: createVenue } = useVenues();
  const { subs } = useSubscriptions();
  const [deleting, setDeleting] = useState<Menu | null>(null);
  // Menù appena eliminato: finché il toast è in piedi si può rimettere.
  //
  // Qui il rischio è più alto che altrove, non più basso: un menù sono le
  // sezioni, l'ordine e i prezzi — il lavoro di un pomeriggio — mentre un
  // piatto, che l'annulla ce l'ha da sempre, si riscrive in un minuto. Era
  // l'unica eliminazione del portale protetta dalla sola finestra di
  // conferma, ed era quella che pesava di più.
  //
  // Si tiene il MENÙ INTERO e non il suo id: dal database è già sparito
  // (sezioni e righe con lui, per cascata), quindi questa copia è l'unico
  // posto da cui può tornare.
  const [undoable, setUndoable] = useState<Menu | null>(null);
  // il locale a cui si sta aggiungendo un menù; null = nessuna finestra aperta
  const [creating, setCreating] = useState(false);
  // QUESTA PAGINA È DI PASSAGGIO, e allora non si mostra.
  //
  // Due strade portano dritte all'editor senza fermarsi qui: la scorciatoia
  // della home (?nuovo=…) e il bottone "Nuovo menù" appena la finestra si
  // chiude. In tutt'e due, fra la partenza e l'arrivo c'è la creazione sul
  // server — mezzo secondo in cui questa pagina restava lì con l'elenco di
  // tutti i menù, cioè un lampo che racconta un passaggio che non esiste.
  //
  // Si legge l'indirizzo SUBITO, nell'inizializzatore: è già alla seconda
  // resa — quella in cui i dati arrivano — che l'elenco comparirebbe. Sul
  // server `window` non c'è, ma lì la pagina è comunque quella d'attesa
  // (i dati non sono ancora arrivati), quindi non c'è niente da idratare
  // in modo diverso.
  const [diPassaggio, setDiPassaggio] = useState(
    () => typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('nuovo')
  );
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
      // Qui non si va da nessuna parte: la finestra chiede il locale e
      // l'elenco è quello che ci sta dietro. La pagina torna a vedersi.
      setDiPassaggio(false);
      setCreating(true);
      return;
    }
    // Con i menù multipli spenti un locale ne ha uno: se ce l'ha già, la
    // scorciatoia lo APRE. Portare a una finestra che propone di crearne un
    // secondo vorrebbe dire offrire una cosa che poi non si può fare.
    const suo = menus.find((m) => m.venueId === locale.id);
    if (!MULTI_MENU && suo) {
      router.push(`/menu/${suo.id}`);
      return;
    }
    if (locale.venueName.trim() !== '' && !menus.some((m) => m.venueId === locale.id)) {
      void handleCreate(locale.id, locale.venueName, '');
      return;
    }
    setDiPassaggio(false);
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
    // Da qui in poi si finisce nell'editor: l'elenco non si mostra mentre il
    // menù nasce sul server (v. diPassaggio). Se qualcosa va storto si resta
    // qui, e allora la pagina torna a vedersi.
    setDiPassaggio(true);
    if (battezza) await rename(battezza.id, battezza.name);
    let id = venueId;
    if (id === null) {
      const locale = await createVenue(venueName);
      if (!locale) {
        setDiPassaggio(false);
        return;
      }
      id = locale.id;
    }
    const creato = await create(id, menuName);
    if (!creato) {
      setDiPassaggio(false);
      return;
    }
    router.push(`/menu/${creato.id}`);
  }

  const loading = !venues || !dishes || !menus;
  // Come si chiama un menù che non ha nome. "Menù senza nome" suona come una
  // cosa da sistemare, ed è giusto così finché un nome glielo si può dare:
  // con i menù multipli spenti il nome non si chiede più a nessuno, quindi
  // rimproverare chi non l'ha scritto sarebbe rimproverarlo di una scelta
  // nostra.
  const ripiego = MULTI_MENU ? d.menus.unnamed : d.menus.genericTab;
  // Solo i locali che hanno almeno un menù: un locale esiste anche per la
  // sola scheda AllergiApp, e qui elencare un ristorante vuoto vorrebbe dire
  // mostrare in questa pagina una cosa che con i menù non c'entra.
  const conMenu = (venues ?? []).filter((v) =>
    (menus ?? []).some((m) => m.venueId === v.id)
  );
  // Con un locale solo il distintivo del piano non distingue niente: qui
  // serve a dire QUALE dei tuoi ha il Pro.
  const piùLocali = conMenu.length > 1;
  // Se ogni locale è online: il pallino accanto al suo nome
  const pubblicazioni = usePublishStates(conMenu.map((v) => v.id));

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

  // Di passaggio: solo l'attesa, senza titolo e senza elenco. Il titolo di
  // una pagina che si sta lasciando è un'altra cosa che lampeggia.
  if (diPassaggio) {
    return <p className="text-sm text-gray-500">{d.common.loading}</p>;
  }

  return (
    <div>
      {/* "Nuovo menù" sulla riga del titolo, come "Nuovo piatto" (v.
          PageTitleRow): prima stava in fondo all'elenco. Senza menù resta il
          bottone al centro dello stato vuoto, e qui non si ripete. */}
      <PageTitleRow
        action={
          !loading && conMenu.length > 0 ? (
            <CreateButton label={d.menus.create} onClick={() => setCreating(true)} buttonRef={createButton} />
          ) : undefined
        }
      >
        {d.menus.title}
      </PageTitleRow>
      <PageIntro className="mb-10 md:mb-12">{d.menus.intro}</PageIntro>

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
              {/* IL PALLINO DELLA PUBBLICAZIONE, prima del nome (richiesta
                  dell'utente, 15/09). Sta sul LOCALE e non sul singolo menù:
                  si pubblica il locale — un indirizzo, un QR, tutte le
                  linguette insieme — mentre il menù è "attivo" o no, e quello
                  lo dice già l'interruttore sulla sua riga (13/09). Stesso
                  colore e stessa parola del riquadro in home: verde
                  "pubblicato", ambra "non pubblicato". Finché lo stato non è
                  arrivato il pallino è uno spazio vuoto e la parola non c'è:
                  indovinare "non pubblicato" e poi cambiarlo sotto gli occhi è
                  il difetto già corretto in home (14/09). */}
              {(() => {
                const stato = pubblicazioni[venue.id];
                const online = stato?.publishedAt != null;
                return (
                  // Il nome del locale nella stessa pill che si usa in home e
                  // nella scheda: qui non si sceglie niente (è l'intestazione
                  // del gruppo), ma la forma è la stessa, e il pallino dello
                  // stato resta dov'era, dentro.
                  <h2 className="flex min-w-0 flex-wrap items-center gap-2">
                    <span className="inline-flex min-w-0 max-w-[16rem] items-center gap-1.5 rounded-full border border-gray-300 bg-white px-3.5 py-1.5 text-sm font-medium text-gray-900">
                      <StatusDot stato={stato === null ? null : online ? 'ready' : 'draft'} />
                      <span className="truncate">{venue.venueName.trim() || d.home.unnamed}</span>
                      {/* DENTRO la pill, come in home: il piano appartiene al
                          locale, non alla riga. Solo con PIÙ LOCALI (richiesta
                          dell'utente, 16/09): con un locale solo non c'è niente
                          da distinguere. Mai il viola: questa è una lista, non
                          il posto dove si decide di comprare. */}
                      {piùLocali && abbonamentoDi(subs, venue.id) !== null && (
                        <ProTag variant="active" />
                      )}
                    </span>
                    {stato !== null && (
                      <span className="shrink-0 text-xs font-normal text-gray-500">
                        {online ? d.dashboard.liveOn : d.dashboard.liveNever}
                      </span>
                    )}
                  </h2>
                );
              })()}

              {(() => {
                const delloStessoLocale = menus.filter((menu) => menu.venueId === venue.id);
                // Con tutti spenti, pubblicare non farebbe niente (il
                // database rifiuta uno scatto vuoto): meglio non farci
                // arrivare che scoprirlo dopo. Stesso principio del menù
                // singolo, che il toggle non lo vede proprio (richiesta
                // dell'utente, 14/09).
                const attivi = delloStessoLocale.filter((menu) => menu.active).length;
                return delloStessoLocale.map((menu) => {
                  const piatti = menuItems(menu).length;
                  const sezioni = menu.sections.length;
                  const ultimoAttivo = menu.active && attivi === 1;
                  return (
                    // L'INTERA RIGA apre l'editor, non solo un bottone "Apri":
                    // è la card a essere il link, come nelle liste moderne
                    // (richiesta dell'utente, 13/09). Resta un div e non
                    // un'ancora vera perché dentro ci sono controlli
                    // interattivi (interruttore, cestino) che un browser non
                    // annida in un link — i loro onClick fermano la
                    // propagazione prima che arrivi qui.
                    <div
                      key={menu.id}
                      role="link"
                      tabIndex={0}
                      onClick={() => router.push(`/menu/${menu.id}`)}
                      onKeyDown={(e) => {
                        // Solo se il fuoco è sulla riga: il tasto sale anche
                        // dai comandi che ci sono dentro, e un Invio sul
                        // cestino apriva la conferma E l'editor insieme
                        if (e.target !== e.currentTarget) return;
                        if (e.key === 'Enter') router.push(`/menu/${menu.id}`);
                      }}
                      className="group flex cursor-pointer items-center gap-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition-colors hover:border-gray-300 focus-visible:outline-2 focus-visible:outline-gray-900"
                    >
                      <div className="min-w-0 flex-1">
                        {/* LA MATITA ACCANTO AL NOME, al passaggio del mouse,
                            come nel catalogo dei piatti (richiesta
                            dell'utente, 15/09): la riga intera apre l'editor,
                            e la matita è il segno che lo dice. Solo
                            decorativa, e solo dove c'è un mouse. Via la
                            sottolineatura al passaggio: con la matita sarebbero
                            stati due segni per la stessa cosa, e il catalogo
                            non ce l'ha. */}
                        <Link
                          href={`/menu/${menu.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="flex min-w-0 items-center gap-1.5 text-sm font-medium text-gray-900"
                        >
                          <span className="truncate">{menu.name.trim() || ripiego}</span>
                          <svg
                            className="h-3.5 w-3.5 shrink-0 text-gray-400 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100 group-has-[a:focus-visible]:opacity-100"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            aria-hidden="true"
                          >
                            <path d="M12 20h9" />
                            <path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z" />
                          </svg>
                        </Link>
                        <p className="mt-0.5 text-xs text-gray-500">
                          {sezioni === 0
                            ? fill(d.menus.countsNoSections, { dishes: piatti })
                            : fill(d.menus.counts, { dishes: piatti, sections: sezioni })}{' '}
                          · {menu.currency}
                        </p>
                      </div>
                      {/* ATTIVO, con lo stesso interruttore dell'indirizzo
                          online nell'editor (componente condiviso, prima
                          duplicato a mano qui): etichetta FISSA — non più
                          "Attivo"/"Inattivo" che cambiava — perché lì un
                          testo che si muove insieme al colore si legge come
                          un'etichetta di stato e non come una cosa da
                          premere, e la stessa ragione vale qui (censimento
                          richiesto dall'utente, 14/09). Si vede solo da due
                          carte in su: con una sola, spegnerla vorrebbe dire
                          togliere il menù dal tavolo — e per quello c'è il
                          ritiro, che è un gesto diverso e sta nell'editor. Il
                          menù spento resta apribile e modificabile: è il
                          menù dell'inverno che aspetta ottobre. Lo
                          stopPropagation sta sul contenitore e non dentro
                          l'interruttore: qui non arriva l'evento del click,
                          solo il cambiamento di stato.
                          BLOCCATO sull'ultimo rimasto acceso: spento anche
                          quello, pubblicare non farebbe niente (il database
                          rifiuta uno scatto senza nessuna carta), e la carta
                          resterebbe con "modifiche non pubblicate" per
                          sempre, senza modo di risolverle premendo Pubblica
                          (richiesta dell'utente, 14/09). */}
                      {delloStessoLocale.length > 1 && (
                        <div onClick={(e) => e.stopPropagation()}>
                          <Interruttore
                            acceso={menu.active}
                            disabilitato={ultimoAttivo}
                            etichetta={d.menus.activeLabel}
                            titolo={
                              ultimoAttivo
                                ? d.menus.lastActiveHint
                                : menu.active
                                  ? d.menus.activeHint
                                  : d.menus.parkedHint
                            }
                            onChange={() => setActive(menu.id, !menu.active)}
                          />
                        </div>
                      )}
                      {/* Niente più "Apri" (l'intera riga fa il suo lavoro) né
                          "Elimina" scritto per esteso: il cestino, a comparsa
                          come le altre icone della riga in queste pagine,
                          basta da solo (richiesta dell'utente, 13/09).
                          Il blur prima di aprire la finestra è voluto: senza,
                          useModal la richiude restituendo il fuoco proprio a
                          questo bottone, e "a fuoco" per il CSS vale come
                          "sotto il mouse" — restava visibile anche ad
                          "Annulla" premuto e mouse altrove (bug segnalato
                          dall'utente, 13/09). */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          e.currentTarget.blur();
                          setDeleting(menu);
                        }}
                        aria-label={d.common.delete}
                        title={d.common.delete}
                        className="-my-2 shrink-0 p-2 text-gray-300 opacity-100 transition-opacity hover:text-red-600 md:opacity-0 md:group-focus-within:opacity-100 md:group-hover:opacity-100"
                      >
                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M4 7h16M9 7V5a2 2 0 012-2h2a2 2 0 012 2v2M10 11v6M14 11v6M6 7l1 12a2 2 0 002 2h6a2 2 0 002-2l1-12" />
                        </svg>
                      </button>
                    </div>
                  );
                });
              })()}
            </div>
          ))}

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
          // Cosa succede AL TAVOLO, se il menù è online (729): l'ultimo
          // menù attivo porta il locale offline; gli altri restano al tavolo
          // finché non si ripubblica, come ogni modifica
          body={(() => {
            const online = pubblicazioni[deleting.venueId]?.publishedAt != null;
            const attivi = (menus ?? []).filter((m) => m.venueId === deleting.venueId && m.active).length;
            if (!online || !deleting.active) return d.menus.deleteBody;
            return `${attivi === 1 ? d.menus.deleteLastOnline : d.menus.deleteOnline} ${d.menus.deleteBody}`;
          })()}
          subject={deleting.name.trim() || ripiego}
          confirmLabel={d.common.delete}
          onCancel={() => setDeleting(null)}
          onConfirm={() => {
            remove(deleting.id);
            setDeleting(null);
            setUndoable(deleting);
          }}
        />
      )}

      {undoable && (
        <UndoToast
          key={undoable.id}
          message={d.menus.deleted}
          undoLabel={d.menus.undo}
          // Il toast sparisce SUBITO, prima che il ripristino sia finito: le
          // scritture sono tre in fila (il menù, le sezioni, le righe) e
          // lasciare a schermo un "Annulla" ancora premibile vorrebbe dire
          // farlo partire due volte.
          onUndo={() => {
            const tornato = undoable;
            setUndoable(null);
            void restore([tornato]);
          }}
          onExpire={() => setUndoable(null)}
          returnFocusTo={createButton}
        />
      )}
    </div>
  );
}
