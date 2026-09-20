'use client';

import { useEffect, useId, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useParams } from 'next/navigation';
import { useI18n } from '@/lib/i18n';
import { useModal } from '@/lib/useModal';
import { venueDishes, useDishes } from '@/lib/dishes';
import { cardHasChanges, countLinks, hasBooking, normalizeUrl, useVenueChoice, useVenues, type DraftLinks, type VenueDraft } from '@/lib/venues';
import { abbonamentoDi, useSubscriptions } from '@/lib/subscriptions';
import { ALLERGENS } from '@/lib/allergens';
import { DIETS } from '@/lib/diets';
import { MENU_LANGUAGES } from '@/lib/languages';
import { DELIVERY_PROVIDERS } from '@/lib/providers';
import { LINK_COLORS, LINK_ORDER, type LinkKind } from '@/lib/linkKinds';
import LinkPill from '@/components/LinkPill';
import ProTag from '@/components/ProTag';
import { CARD_TONE, cardState, setCardPaused, unlinkCard } from '@/lib/association';
import StatusPill from '@/components/StatusPill';
import CardStateNotice from '@/components/CardStateNotice';
import RestaurantPhrase from '@/components/RestaurantPhrase';
import ConfirmDialog from '@/components/menus/ConfirmDialog';
import PhoneFrame from '@/components/preview/PhoneFrame';
import SchedaPreview, { NO_VIEWER, type ViewerNeeds } from '@/components/preview/SchedaPreview';
import CardDishesSelector from '@/components/CardDishesSelector';
import CardPublishBar from '@/components/CardPublishBar';
import { PageIntro, PageTitle } from '@/components/PageHeading';

function ViewerChips({
  viewer,
  onToggle,
  compact = false,
}: {
  viewer: ViewerNeeds;
  onToggle: (kind: 'allergens' | 'diets', code: string) => void;
  compact?: boolean;
}) {
  const { d, locale } = useI18n();

  const groups = [
    { kind: 'allergens' as const, label: d.editor.simulatorAllergies, items: ALLERGENS },
    {
      kind: 'diets' as const,
      label: d.editor.simulatorDiets,
      // nel simulatore si descrive l'esigenza del visitatore, non il tag
      items: DIETS.map((t) => ({ code: t.code, it: t.needIt, en: t.needEn })),
    },
  ];

  if (compact) {
    return (
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {groups.flatMap(({ kind, items }) =>
          items.map((item) => {
            const selected = viewer[kind].includes(item.code);
            return (
              <button
                key={`${kind}-${item.code}`}
                onClick={() => onToggle(kind, item.code)}
                className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-medium ${
                  selected
                    ? 'border-[#C8E6C9] bg-[#E8F5E9] text-[#2E7D32]'
                    : 'border-gray-400 bg-white text-gray-600'
                }`}
              >
                {item[locale]}
              </button>
            );
          })
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      {groups.map(({ kind, label, items }) => (
        <div key={kind}>
          <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-gray-400">
            {label}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {items.map((item) => {
              const selected = viewer[kind].includes(item.code);
              return (
                <button
                  key={item.code}
                  onClick={() => onToggle(kind, item.code)}
                  className={`rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
                    selected
                      ? 'border-[#C8E6C9] bg-[#E8F5E9] text-[#2E7D32]'
                      : 'border-gray-300 bg-white text-gray-600 hover:border-gray-400'
                  }`}
                >
                  {item[locale]}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// Aggiunge una riga dentro un link già attivo (un servizio di delivery,
// un menù in un'altra lingua): stesso colore della pill, forma da bottone.
function AddRowButton({
  kind,
  label,
  onClick,
}: {
  kind: LinkKind;
  label: string;
  onClick: () => void;
}) {
  const { bg, fg } = LINK_COLORS[kind];
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-lg border border-dashed px-3 py-1.5 text-sm font-medium transition-colors hover:bg-[var(--pill-bg)]"
      style={{ '--pill-bg': bg, borderColor: `${fg}66`, color: fg } as React.CSSProperties}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M12 5v14M5 12h14" />
      </svg>
      {label}
    </button>
  );
}

// Campo della prenotazione: etichetta sopra, ✕ per toglierlo come nelle
// righe dei menù. Link e telefono hanno la stessa forma.
function BookingField({
  label,
  type,
  value,
  autoFocus,
  placeholder,
  removeLabel,
  onChange,
  onBlur,
  onRemove,
}: {
  label: string;
  type: 'url' | 'tel';
  value: string;
  autoFocus: boolean;
  placeholder: string;
  removeLabel: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  onRemove: () => void;
}) {
  const id = useId();
  return (
    <div>
      <div className="flex items-center gap-2">
        {/* etichetta dentro al campo, come prefisso: niente colonna vuota
            accanto a "Link" e le due righe restano allineate comunque */}
        <div className="flex w-full items-stretch overflow-hidden rounded-lg border border-gray-300 focus-within:border-gray-900">
          <label
            htmlFor={id}
            className="flex shrink-0 items-center border-r border-gray-200 bg-gray-50 px-3 text-xs font-medium text-gray-500"
          >
            {label}
          </label>
          <input
            id={id}
            type={type}
            autoFocus={autoFocus}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onBlur={onBlur}
            placeholder={placeholder}
            className="w-full bg-transparent px-3 py-2 text-sm focus:outline-none"
          />
        </div>
        <button
          onClick={onRemove}
          aria-label={removeLabel}
          className="shrink-0 text-gray-400 transition-colors hover:text-red-600"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </div>
    </div>
  );
}

// L'anteprima a schermo intero su telefono. È una finestra come le altre, e
// come le altre deve chiudersi con Esc e non lasciare il fuoco sull'editor
// che sta coprendo: per questo vive in un componente suo, montato solo
// mentre è aperta.
function MobilePreview({
  viewer,
  onToggleViewer,
  onClose,
  children,
}: {
  viewer: ViewerNeeds;
  onToggleViewer: (kind: 'allergens' | 'diets', code: string) => void;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const { d } = useI18n();
  const panel = useModal<HTMLDivElement>(onClose);

  return (
    <div
      ref={panel}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-label={d.editor.previewButton}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/75 p-4 outline-none lg:hidden"
    >
      <div className="w-full max-w-[380px]">
        <ViewerChips viewer={viewer} onToggle={onToggleViewer} compact />
      </div>
      <div className="max-h-full origin-center scale-[0.85] overflow-visible sm:scale-100">
        <PhoneFrame>{children}</PhoneFrame>
      </div>
      <button
        onClick={onClose}
        className="mt-1 rounded-full bg-white px-5 py-2 text-sm font-medium text-gray-900 shadow-lg"
      >
        {d.common.close}
      </button>
    </div>
  );
}

export default function VenueEditorPage() {
  const { d } = useI18n();
  const params = useParams<{ id: string }>();
  const { venues, update, setDishesOn, reload: rileggiLocali, publishCard, revertCard } = useVenues();
  // La scelta del locale è la stessa della home e del menù laterale
  const { scegli } = useVenueChoice();
  // Se il locale è abbonato l'etichetta Pro sparisce: non c'è più niente da
  // sbloccare, e il distintivo ambra in home dice già che ce l'ha.
  const { subs } = useSubscriptions();
  // Il catalogo è del partner: la scheda dice solo quali piatti sono accesi
  const { dishes: catalog } = useDishes();
  const [showMobilePreview, setShowMobilePreview] = useState(false);
  // I gesti sull'associazione (pausa, riattiva, scollega): uno alla volta
  const [gesto, setGesto] = useState(false);
  const [erroreGesto, setErroreGesto] = useState(false);
  // La finestra aperta: pausa o scollega, ciascuno si spiega prima di farlo
  const [conferma, setConferma] = useState<'pausa' | 'scollega' | null>(null);
  const [viewer, setViewer] = useState<ViewerNeeds>(NO_VIEWER);
  const [simOpen, setSimOpen] = useState(false);
  // Link accesi in questa sessione ma ancora vuoti: quelli con contenuto
  // si riconoscono dalla bozza, questi no (e sparirebbero al reload).
  const [activated, setActivated] = useState<LinkKind[]>([]);
  // Campi della prenotazione aperti o chiusi a mano in questa sessione:
  // null = lascia decidere alla bozza (v. showBookingUrl/showBookingPhone)
  // Link aperto in modifica: gli altri restano pill. null = tutti chiusi
  const [openKind, setOpenKind] = useState<LinkKind | null>(null);
  // Com'erano i link quando si è aperto quello in modifica: «Annulla» nel
  // riquadro rimette quel link così e lo chiude
  const [linkPrima, setLinkPrima] = useState<DraftLinks | null>(null);
  const [bookingUrlOpen, setBookingUrlOpen] = useState<boolean | null>(null);
  const [bookingPhoneOpen, setBookingPhoneOpen] = useState<boolean | null>(null);
  const viewerCount = viewer.allergens.length + viewer.diets.length;

  const LINK_LABELS: Record<LinkKind, string> = {
    booking: d.editor.linkBooking,
    delivery: d.editor.linkDelivery,
    menu: d.editor.linkMenu,
    website: d.editor.linkWebsite,
  };
  // Una riga sola per spiegare cosa fa il link nella scheda
  const LINK_HINTS: Record<LinkKind, string> = {
    booking: d.editor.bookingHint,
    delivery: d.editor.deliveryHint,
    menu: d.editor.menuLangHint,
    website: d.editor.websiteHint,
  };

  // La panoramica manda qui con #link o #scheda. Quando la navigazione
  // arriva, però, la pagina sta ancora leggendo dal database e il bersaglio
  // non esiste: il browser non ha su cosa saltare e si resta in cima. Quindi
  // si salta quando i dati ci sono — UNA volta sola, o ogni salvataggio
  // (che rifà la lista) riporterebbe la pagina su per conto suo.
  const saltoFatto = useRef(false);
  useEffect(() => {
    if (saltoFatto.current || !venues || !catalog) return;
    saltoFatto.current = true;
    const bersaglio = window.location.hash.slice(1);
    if (bersaglio !== '') document.getElementById(bersaglio)?.scrollIntoView({ block: 'start' });
  }, [venues, catalog]);

  const venue = venues?.find((s) => s.id === params.id);
  const abbonato = venue ? abbonamentoDi(subs, venue.id) !== null : false;

  // Prima lettura dal database ancora in corso: null vuol dire "non lo so
  // ancora", che è diverso da "non c'è" (v. useRemoteList in storage.ts)
  if (!venues || !catalog) {
    return <p className="text-sm text-gray-500">{d.common.loading}</p>;
  }
  if (!venue) {
    return (
      <div>
        <p className="mb-3 text-sm text-gray-600">{d.home.notFound}</p>
        <Link href="/" className="text-sm font-medium text-gray-900 underline">
          {d.home.backToList}
        </Link>
      </div>
    );
  }

  const draft: VenueDraft = venue;
  // Nella scheda c'è già qualcosa da mostrare: da qui il passo che manca è
  // l'associazione, e lo dice la riga in cima invece del richiamo.
  const haContenuto = countLinks(venue.links) > 0 || venue.dishIds.length > 0;
  // Lo stato della scheda, la stessa regola di home e Abbonamenti
  const stato = cardState(venue, abbonato);
  // Link o piatti diversi da quello che l'app mostra (728)
  const modifiche = cardHasChanges(venue);
  const mostraRichiamo = stato === 'none' && !haContenuto;
  const verso = abbonato ? `/locale/${venue.id}/collega` : '/abbonamenti';
  const ristorante = {
    name: venue.cardRestaurant?.name ?? '',
    slug: venue.cardRestaurant?.slug ?? '',
  };

  // Pausa, riattiva, scollega: il database decide se si può (721), qui si
  // chiede e si rilegge. Un errore non cambia niente, e lo si dice.
  async function eseguiGesto(fai: () => Promise<{ ok: true } | { error: string }>) {
    setGesto(true);
    setErroreGesto(false);
    const esito = await fai();
    if ('error' in esito) setErroreGesto(true);
    await rileggiLocali();
    setGesto(false);
  }
  const pausa = (paused: boolean) =>
    venue.cardId && eseguiGesto(() => setCardPaused(venue.cardId!, paused));
  const scollega = () => {
    setConferma(null);
    if (venue.cardId) void eseguiGesto(() => unlinkCard(venue.cardId!));
  };
  const venueId = venue.id;
  const setDraft = (next: VenueDraft) => update(venueId, next);

  function setBooking(patch: Partial<{ url: string; phone: string }>) {
    setDraft({ ...draft, links: { ...draft.links, booking: { ...draft.links.booking, ...patch } } });
  }

  function updateDelivery(index: number, patch: Partial<{ provider: string; label: string; url: string }>) {
    setDraft({
      ...draft,
      links: {
        ...draft.links,
        deliveries: draft.links.deliveries.map((del, i) => (i === index ? { ...del, ...patch } : del)),
      },
    });
  }

  function addDelivery() {
    setDraft({
      ...draft,
      links: {
        ...draft.links,
        deliveries: [...draft.links.deliveries, { provider: '', label: '', url: '' }],
      },
    });
  }

  function removeDelivery(index: number) {
    setDraft({
      ...draft,
      links: { ...draft.links, deliveries: draft.links.deliveries.filter((_, i) => i !== index) },
    });
  }

  function updateMenu(index: number, patch: Partial<{ language: string; url: string }>) {
    setDraft({
      ...draft,
      links: {
        ...draft.links,
        menus: draft.links.menus.map((m, i) => (i === index ? { ...m, ...patch } : m)),
      },
    });
  }

  function addMenu() {
    setDraft({
      ...draft,
      links: { ...draft.links, menus: [...draft.links.menus, { language: '', url: '' }] },
    });
  }

  function removeMenu(index: number) {
    setDraft({
      ...draft,
      links: { ...draft.links, menus: draft.links.menus.filter((_, i) => i !== index) },
    });
  }

  // Un link ha un dato solo se c'è un indirizzo scritto: righe delivery o
  // menù aggiunte e lasciate vuote non contano
  const filled: Record<LinkKind, boolean> = {
    booking: hasBooking(draft.links.booking),
    delivery: draft.links.deliveries.some((del) => del.url.trim() !== ''),
    menu: draft.links.menus.some((menu) => menu.url.trim() !== ''),
    website: draft.links.website.trim() !== '',
  };
  // È attivo se ha un dato oppure se è stato appena acceso (e non ancora chiuso)
  const activeKinds = LINK_ORDER.filter((k) => filled[k] || activated.includes(k));
  // Il link è il campo di partenza; sparisce se la bozza ha solo il telefono
  const showBookingUrl =
    bookingUrlOpen ??
    (draft.links.booking.url !== '' || draft.links.booking.phone.trim() === '');
  const showBookingPhone = bookingPhoneOpen ?? draft.links.booking.phone !== '';
  const addableKinds = LINK_ORDER.filter((k) => !activeKinds.includes(k));

  // Aprire un altro link (o accenderne uno nuovo) chiude quello in corso:
  // se era rimasto vuoto lo spegne, così negli attivi resta solo ciò che ha un dato
  function openLink(kind: LinkKind) {
    if (openKind && openKind !== kind && !filled[openKind]) removeLink(openKind);
    setLinkPrima(draft.links);
    setOpenKind(kind);
  }

  // ANNULLA nel riquadro di un link: quel link torna com'era quando lo si è
  // aperto (gli altri non si toccano) e il riquadro si chiude. Se prima era
  // vuoto, torna fra quelli da aggiungere.
  function cancelLink(kind: LinkKind) {
    const prima = linkPrima ?? draft.links;
    const parte =
      kind === 'delivery'
        ? { deliveries: prima.deliveries }
        : kind === 'menu'
          ? { menus: prima.menus }
          : kind === 'booking'
            ? { booking: prima.booking }
            : { website: prima.website };
    setDraft({ ...draft, links: { ...draft.links, ...parte } });
    setActivated((prev) => prev.filter((k) => k !== kind));
    if (kind === 'booking') {
      setBookingUrlOpen(null);
      setBookingPhoneOpen(null);
    }
    setOpenKind(null);
    setLinkPrima(null);
  }

  function closeLink(kind: LinkKind) {
    if (filled[kind]) setOpenKind(null);
    else removeLink(kind);
  }

  function activateLink(kind: LinkKind) {
    setActivated((prev) => (prev.includes(kind) ? prev : [...prev, kind]));
    openLink(kind);
    // delivery e menù nascono con la prima riga già pronta da compilare
    if (kind === 'delivery' && draft.links.deliveries.length === 0) addDelivery();
    if (kind === 'menu' && draft.links.menus.length === 0) addMenu();
  }

  // Spegnere un link ne svuota il contenuto: si rimette dalle pill "Aggiungi"
  function removeLink(kind: LinkKind) {
    setActivated((prev) => prev.filter((k) => k !== kind));
    if (openKind === kind) setOpenKind(null);
    if (kind === 'booking') {
      setBookingUrlOpen(null);
      setBookingPhoneOpen(null);
    }
    const cleared =
      kind === 'delivery'
        ? { deliveries: [] }
        : kind === 'menu'
          ? { menus: [] }
          : kind === 'booking'
            ? { booking: { url: '', phone: '' } }
            : { [kind]: '' };
    setDraft({ ...draft, links: { ...draft.links, ...cleared } });
  }

  function toggleViewer(kind: 'allergens' | 'diets', code: string) {
    setViewer((prev) => ({
      ...prev,
      [kind]: prev[kind].includes(code)
        ? prev[kind].filter((c) => c !== code)
        : [...prev[kind], code],
    }));
  }

  // La frase d'apertura col nome del locale in mezzo, in grassetto: fill()
  // darebbe solo testo piano, quindi si spezza sul segnaposto
  const fraseIntro = d.editor.intro.split('{venue}');

  const preview = <SchedaPreview draft={draft} dishes={venueDishes(catalog, draft)} viewer={viewer} />;

  return (
    // Scorre la pagina, non un pannello interno: così niente bordi che
    // tagliano le card a metà. L'anteprima resta in vista perché è sticky.
    <div className="lg:flex lg:items-start lg:gap-8">
      {/* Colonna editor */}
      <div className="min-w-0 flex-1">
        {/* LA RIGA DELL'ASSOCIAZIONE, come quella di «Pubblica» nei menù
            (richiesta dell'utente, 19/09): appena nella scheda c'è qualcosa
            — un link, un piatto — e il locale non è associato, il passo che
            manca resta in vista mentre si lavora, invece di stare solo in
            fondo alla pagina. Sparisce ad associazione fatta. Senza
            abbonamento porta prima agli abbonamenti. Stessa riga sticky e
            stesse misure dell'editor del menù, così è riconoscibile. */}
        {/* Una riga sola, la cosa più urgente: prima «Pubblica» se ci
            sono modifiche che l'app non ha ancora (728), altrimenti
            «Associa» se il locale non è associato. */}
        {(modifiche || (stato === 'none' && haContenuto)) && (
          <div className="sticky top-0 z-30 -mx-4 mb-6 flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-gray-100 bg-gray-50/95 px-4 py-2 backdrop-blur md:-mx-8 md:px-8">
            {modifiche ? (
              <CardPublishBar
                venue={venue}
                onPublish={() => publishCard(venue.id)}
                onRevert={() => revertCard(venue.id)}
              />
            ) : (
              <>
                <p className="min-w-0 flex-1 text-xs text-gray-600 sm:text-sm">{d.editor.linkBar}</p>
                <Link
                  href={verso}
                  className="ml-auto shrink-0 rounded-lg bg-gray-900 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-gray-700"
                >
                  {d.editor.linkBoxCta}
                </Link>
              </>
            )}
          </div>
        )}
        {/* LO STATO, QUANDO C'È QUALCOSA DA DIRE (richiesta dell'utente,
            19/09): in verifica, richiesta in attesa o respinta, sospesa, in
            pausa, abbonamento finito, revocata. Nello stesso posto della
            riga «Associa», così chi apre la scheda trova qui il perché non si
            vede. La regola è cardState(), la stessa di home e Abbonamenti. */}
        <CardStateNotice
          state={stato}
          venue={venue}
          linkHref={verso}
          onResume={() => void pausa(false)}
          onChanged={() => void rileggiLocali()}
          busy={gesto}
        />
        {/* L'INTESTAZIONE COME LE ALTRE PAGINE PRINCIPALI (richiesta
            dell'utente, 15/09): titolo in cima, frase sotto, poi il lavoro.
            Prima sopra al titolo c'erano "← Home" e il nome del locale in
            maiuscoletto, e il titolo partiva più in basso che in Menù e
            Piatti. "← Home" non serviva: la scheda è una voce della barra
            laterale, come le altre. Il nome del locale invece serve — il
            portale regge più schede e "Scheda AllergiApp" da solo non dice
            di quale — e ora sta DENTRO la frase d'apertura, in grassetto.

            Resta nella colonna dell'editor e non sopra le due: l'anteprima
            accanto parte dall'alto della pagina, alla pari del titolo
            (provato a spostarla sopra e scartato dall'utente, 15/09). */}
        {/* I LOCALI, con più d'uno (19/09): le stesse pill della home, per
            passare da una scheda all'altra senza tornare indietro. Solo per
            spostarsi: rinominare ed eliminare restano in home. */}
        {venues.length > 1 && (
          <div className="mb-5 flex flex-wrap items-center gap-2" aria-label={d.dashboard.switchLabel} role="group">
            {venues.map((v) => {
              const acceso = v.id === venue.id;
              return (
                <Link
                  key={v.id}
                  href={`/locale/${v.id}`}
                  onClick={() => scegli(v.id)}
                  aria-current={acceso ? 'page' : undefined}
                  className={`max-w-[16rem] rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
                    acceso
                      ? 'bg-gray-900 text-white'
                      : 'border border-gray-300 bg-white text-gray-600 hover:border-gray-400 hover:text-gray-900'
                  }`}
                >
                  <span className="inline-flex items-center gap-1.5">
                    <span className="truncate">{v.venueName.trim() || d.home.unnamed}</span>
                    {abbonamentoDi(subs, v.id) !== null && <ProTag variant="active" />}
                  </span>
                </Link>
              );
            })}
          </div>
        )}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <PageTitle>{d.editor.title}</PageTitle>
          {/* Com'è la scheda nell'app: lo stesso pallino e la stessa parola
              della home (cardState). Fino al 19/09 qui c'era «Bozza
              privata» fisso, che restava anche a scheda attiva nell'app. */}
          <StatusPill stato={CARD_TONE[stato]} label={d.cardState.pill[stato]} />
          {/* Due pastiglie che dicono due cose diverse: com'è la scheda
              adesso e cosa servirà perché esca (Pro). La
              seconda sparisce per chi è abbonato — non ha più niente da
              sbloccare, e il distintivo ambra accanto al nome del locale in
              home dice già che ce l'ha. Non è un lucchetto: la scheda si
              compila tutta e l'anteprima la mostra. */}
          {!abbonato && <ProTag variant="needed" contesto="card" venueId={venue.id} />}
          {/* L'associazione sta in fondo, dopo link e piatti: con tanti piatti
              la pagina è lunga, e da qui ci si arriva con un tocco */}
          <a
            href="#associazione"
            onClick={(e) => {
              e.preventDefault();
              document.getElementById('associazione')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }}
            className="ml-auto inline-flex items-center gap-1 text-sm font-medium text-gray-600 underline-offset-2 transition-colors hover:text-gray-900 hover:underline"
          >
            {d.editor.goToLink}
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 5v14M6 13l6 6 6-6" />
            </svg>
          </a>
        </div>
        {/* Senza il richiamo qui sotto, lo stacco dal contenuto lo dà la frase */}
        <PageIntro className={mostraRichiamo ? '' : 'mb-10 md:mb-12'}>
          {fraseIntro[0]}
          <span className="font-medium text-gray-900">{venue.venueName.trim() || d.home.unnamed}</span>
          {fraseIntro[1]}
        </PageIntro>
        {/* IL RICHIAMO ALL'ASSOCIAZIONE, detto con garbo (richiesta
            dell'utente, 15/09). La scheda si prepara subito e resta salvata
            (715), ma senza dirlo chi la compila non capisce perché in app non
            si vede niente. Si nomina solo l'associazione al ristorante: è il
            passo che il ristoratore capisce ("la mia scheda dev'essere
            collegata al mio locale"). L'abbonamento, che viene prima, lo
            spiega la pagina a cui porta il link — qui un "attiva
            l'abbonamento" suonava come un "paga" messo in cima al lavoro.
            Una volta associato il locale il richiamo non serve più, e non
            serve nemmeno quando c'è la riga in cima (19/09): direbbero la
            stessa cosa due volte.

            TRE PASSI (19/09): la frase lunga di prima non si capiva, e il suo
            «Come funziona» portava agli abbonamenti senza spiegare niente.
            L'abbonamento è nominato fra i passi, ma il collegamento resta
            neutro («Vedi l'abbonamento», non «Attiva»): per la scelta del
            15/09. Il passo fatto ha la spunta. */}
        {mostraRichiamo && (
          <div className="mb-10 mt-5 flex items-start gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm md:mb-12">
            <svg className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
            <div className="min-w-0 flex-1 text-sm">
              <p className="font-medium text-gray-900">{d.editor.stepsTitle}</p>
              <ol className="mt-1.5 space-y-1 text-gray-600">
                {[
                  { testo: d.editor.stepPrepare, fatto: false },
                  { testo: d.editor.stepSubscribe, fatto: abbonato },
                  { testo: d.editor.stepLink, fatto: false },
                ].map(({ testo, fatto }, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="flex w-4 shrink-0 justify-center text-gray-400">
                      {fatto ? (
                        <svg className="mt-0.5 h-4 w-4 text-[#4CAF50]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="M5 12.5l4.5 4.5L19 7.5" />
                        </svg>
                      ) : (
                        `${i + 1}.`
                      )}
                    </span>
                    {testo}
                  </li>
                ))}
              </ol>
              <Link
                href={verso}
                className="mt-2 inline-block font-medium text-gray-700 underline transition-colors hover:text-gray-900"
              >
                {abbonato ? d.editor.linkBoxCta : d.editor.stepsSeeSubscription}
              </Link>
            </div>
          </div>
        )}

        {/* TRE AREE, come i tre passi della scheda — i link, i piatti, il
            ristorante a cui associarla — separate da una riga sottile, lo
            stesso segno dell'editor del menù fra aspetto, contenuto e
            pubblicazione (richiesta dell'utente, 15/09). 32px sopra e sotto. */}
        <div>
          {/* Link. L'id è il bersaglio della panoramica: da lì "Modifica"
              deve arrivare QUI e non in cima alla pagina, o si atterra su una
              schermata lunga senza sapere cosa si era chiesto. */}
          <div id="link" className="scroll-mt-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="mb-1 text-sm font-medium text-gray-900">{d.editor.linksTitle}</h2>
            <p className="mb-4 text-xs text-gray-500">{d.editor.linksHint}</p>
            {activeKinds.length > 0 && (
              <div className="space-y-3">
                <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                  {d.editor.linksActive}
                </p>
                {/* A regime si vedono solo le pill: si tocca quella da
                    cambiare, si compila, si salva e torna una pill */}
                <div className="flex flex-wrap gap-2">
                  {activeKinds.map((kind) => (
                    <button
                      key={kind}
                      onClick={() => (openKind === kind ? closeLink(kind) : openLink(kind))}
                      className="rounded-full transition-opacity hover:opacity-70"
                    >
                      <LinkPill
                        kind={kind}
                        label={LINK_LABELS[kind]}
                        active
                        selected={openKind === kind}
                        action="edit"
                      />
                    </button>
                  ))}
                </div>
                {activeKinds
                  .filter((kind) => kind === openKind)
                  .map((kind) => (
                  <div key={kind} className="rounded-xl border border-gray-200 p-3.5">
                    <div className="mb-2 flex items-start justify-between gap-2">
                      <span className="min-w-0 text-[11px] leading-snug text-gray-400">
                        {LINK_HINTS[kind]}
                      </span>
                      <button
                        onClick={() => removeLink(kind)}
                        aria-label={d.editor.removeLink}
                        title={d.editor.removeLink}
                        className="-mt-0.5 shrink-0 text-gray-400 transition-colors hover:text-red-600"
                      >
                        {/* cestino = si butta via il link intero; la ✕ delle
                            righe qui sotto toglie solo quella riga */}
                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M4 7h16M9 7V5a2 2 0 012-2h2a2 2 0 012 2v2M10 11v6M14 11v6M6 7l1 12a2 2 0 002 2h6a2 2 0 002-2l1-12" />
                        </svg>
                      </button>
                    </div>

                    {kind === 'website' && (
                      <input
                        type="url"
                        value={draft.links.website}
                        onChange={(e) =>
                          setDraft({ ...draft, links: { ...draft.links, website: e.target.value } })
                        }
                        onBlur={() =>
                          setDraft({
                            ...draft,
                            links: { ...draft.links, website: normalizeUrl(draft.links.website) },
                          })
                        }
                        placeholder={d.editor.linkPlaceholder}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none"
                      />
                    )}

                    {/* Prenotazione: link e telefono, tutti e due facoltativi
                        e tutti e due eliminabili (c'è chi prende solo al
                        telefono). Nessuna validazione sul numero: i formati
                        veri sono troppo vari e un falso errore blocca il
                        ristoratore su un dato che è suo. */}
                    {kind === 'booking' && (
                      <div className="space-y-2.5">
                        {showBookingUrl && (
                          <BookingField
                            label={d.editor.linkFieldLabel}
                            type="url"
                            value={draft.links.booking.url}
                            autoFocus={bookingUrlOpen === true && draft.links.booking.url === ''}
                            placeholder={d.editor.linkPlaceholder}
                            removeLabel={d.common.delete}
                            onChange={(value) => setBooking({ url: value })}
                            onBlur={() => setBooking({ url: normalizeUrl(draft.links.booking.url) })}
                            onRemove={() => {
                              setBookingUrlOpen(false);
                              setBooking({ url: '' });
                            }}
                          />
                        )}
                        {showBookingPhone && (
                          <BookingField
                            label={d.editor.phoneFieldLabel}
                            type="tel"
                            value={draft.links.booking.phone}
                            autoFocus={bookingPhoneOpen === true && draft.links.booking.phone === ''}
                            placeholder={d.editor.phonePlaceholder}
                            removeLabel={d.common.delete}
                            onChange={(value) => setBooking({ phone: value })}
                            onRemove={() => {
                              setBookingPhoneOpen(false);
                              setBooking({ phone: '' });
                            }}
                          />
                        )}
                        <div className="flex flex-wrap gap-2">
                          {!showBookingUrl && (
                            <AddRowButton
                              kind="booking"
                              label={d.editor.addLink}
                              onClick={() => setBookingUrlOpen(true)}
                            />
                          )}
                          {!showBookingPhone && (
                            <AddRowButton
                              kind="booking"
                              label={d.editor.addPhone}
                              onClick={() => setBookingPhoneOpen(true)}
                            />
                          )}
                        </div>
                      </div>
                    )}

                    {/* Delivery: più servizi (nella scheda un solo bottone,
                        con più link l'app apre un bottom sheet di scelta) */}
                    {kind === 'delivery' && (
                      <div className="space-y-2">
                        {draft.links.deliveries.map((del, i) => (
                          <div key={i} className="space-y-2">
                            <div className="flex items-center gap-2">
                              <select
                                value={del.provider}
                                onChange={(e) => updateDelivery(i, { provider: e.target.value })}
                                className="shrink-0 rounded-lg border border-gray-300 bg-white px-2 py-2 text-sm focus:border-gray-900 focus:outline-none"
                              >
                                <option value="">{d.editor.deliveryProviderPlaceholder}</option>
                                {DELIVERY_PROVIDERS.map((p) => (
                                  <option key={p.code} value={p.code}>
                                    {p.name}
                                  </option>
                                ))}
                                <option value="other">{d.editor.providerOther}</option>
                              </select>
                              <input
                                type="url"
                                value={del.url}
                                onChange={(e) => updateDelivery(i, { url: e.target.value })}
                              onBlur={() => updateDelivery(i, { url: normalizeUrl(del.url) })}
                                placeholder={d.editor.linkPlaceholder}
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none"
                              />
                              {draft.links.deliveries.length > 1 && (
                                <button
                                  onClick={() => removeDelivery(i)}
                                  className="shrink-0 text-gray-400 transition-colors hover:text-red-600"
                                  aria-label={d.common.delete}
                                >
                                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                    <path d="M6 6l12 12M18 6L6 18" />
                                  </svg>
                                </button>
                              )}
                            </div>
                            {del.provider === 'other' && (
                              <input
                                type="text"
                                value={del.label}
                                onChange={(e) => updateDelivery(i, { label: e.target.value })}
                                placeholder={d.editor.providerOtherName}
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none"
                              />
                            )}
                          </div>
                        ))}
                        <AddRowButton
                          kind="delivery"
                          label={d.editor.addDeliveryProvider}
                          onClick={addDelivery}
                        />
                      </div>
                    )}

                    {/* Menù: più link, uno per lingua */}
                    {kind === 'menu' && (
                      <div className="space-y-2">
                        {draft.links.menus.map((menu, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <select
                              value={menu.language}
                              onChange={(e) => updateMenu(i, { language: e.target.value })}
                              className="shrink-0 rounded-lg border border-gray-300 bg-white px-2 py-2 text-sm focus:border-gray-900 focus:outline-none"
                            >
                              <option value="">{d.editor.menuLanguageDefault}</option>
                              {MENU_LANGUAGES.map((lang) => (
                                <option key={lang.code} value={lang.code}>
                                  {lang.native}
                                </option>
                              ))}
                            </select>
                            <input
                              type="url"
                              value={menu.url}
                              onChange={(e) => updateMenu(i, { url: e.target.value })}
                              onBlur={() => updateMenu(i, { url: normalizeUrl(menu.url) })}
                              placeholder={d.editor.linkPlaceholder}
                              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none"
                            />
                            {draft.links.menus.length > 1 && (
                              <button
                                onClick={() => removeMenu(i)}
                                className="shrink-0 text-gray-400 transition-colors hover:text-red-600"
                                aria-label={d.common.delete}
                              >
                                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                  <path d="M6 6l12 12M18 6L6 18" />
                                </svg>
                              </button>
                            )}
                          </div>
                        ))}
                        <AddRowButton
                          kind="menu"
                          label={d.editor.addMenuLanguage}
                          onClick={addMenu}
                        />
                      </div>
                    )}

                    {/* Salva tiene il link nella bozza e lo riporta a pill;
                        Annulla lo rimette com'era quando l'hai aperto. Nell'app
                        va solo con Pubblica, in cima alla pagina (728). */}
                    <div className="mt-3 flex justify-end gap-2">
                      <button
                        onClick={() => cancelLink(kind)}
                        className="rounded-lg px-3 py-1.5 text-sm font-medium text-gray-600 transition-colors hover:text-gray-900"
                      >
                        {d.common.cancel}
                      </button>
                      <button
                        onClick={() => setOpenKind(null)}
                        disabled={!filled[kind]}
                        className="rounded-lg bg-gray-900 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {d.common.save}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {addableKinds.length > 0 && (
              <div className={activeKinds.length > 0 ? 'mt-4' : ''}>
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-400">
                  {d.editor.linksAdd}
                </p>
                <div className="flex flex-wrap gap-2">
                  {addableKinds.map((kind) => (
                    <button
                      key={kind}
                      onClick={() => activateLink(kind)}
                      className="rounded-full transition-opacity hover:opacity-70"
                    >
                      <LinkPill kind={kind} label={LINK_LABELS[kind]} active={false} action="add" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <hr className="my-8 border-gray-200" aria-hidden="true" />

          {/* Piatti: qui si sceglie solo cosa mostrare su questa scheda.
              Il piatto in sé (foto, allergeni, categoria) si cura nel
              gestionale, che è del partner e non del singolo locale. */}
          <div id="scheda" className="scroll-mt-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="mb-1 flex items-start justify-between gap-3">
              <h2 className="text-sm font-medium text-gray-900">{d.editor.dishesTitle}</h2>
              <Link
                href="/piatti"
                className="shrink-0 text-sm font-medium text-gray-700 underline hover:text-gray-900"
              >
                {d.editor.manageDishes}
              </Link>
            </div>
            <p className="mb-4 text-xs text-gray-500">{d.editor.dishesHint}</p>

            {/* Si scelgono anche SENZA scheda (715): prima dell'associazione
                la scelta si prepara e resta salvata, e in app compare solo
                con l'abbonamento. Fino al 15/09 qui c'era un tappo che
                mandava ad associare il locale. */}
            {catalog.length === 0 ? (
              <div className="rounded-xl border border-dashed border-gray-300 p-6 text-center">
                <p className="text-sm font-medium text-gray-900">{d.dishes.empty}</p>
                <p className="mt-1 text-sm text-gray-500">{d.dishes.emptyHint}</p>
                <Link
                  href="/piatti"
                  className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-700"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                  {d.dishes.create}
                </Link>
              </div>
            ) : (
              <>
                {/* Nessun piatto acceso: si dice qui, dove si sceglie, cosa
                    comporta — nell'app la sezione dei piatti non c'è. È
                    un'informazione, non un errore: la scheda con i soli
                    link va benissimo (728) */}
                {/* In evidenza (richiesta dell'utente): è l'effetto di una
                    scelta che si fa qui, e va visto prima di pubblicare */}
                {draft.dishIds.length === 0 && (
                  <p className="mb-3 flex items-start gap-2 rounded-lg bg-gray-50 px-3 py-2 text-[13px] text-gray-700">
                    <svg className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <circle cx="12" cy="12" r="9" />
                      <path d="M12 8v5M12 16.5v.01" />
                    </svg>
                    {d.editor.noDishesSelected}
                  </p>
                )}
                <CardDishesSelector
                  catalog={catalog}
                  chosen={draft.dishIds}
                  onChange={(dishIds, on) => setDishesOn(venueId, dishIds, on)}
                />
              </>
            )}
          </div>

          <hr className="my-8 border-gray-200" aria-hidden="true" />

          {/* L'ULTIMO PASSO, IN FONDO AL LAVORO (richiesta dell'utente, 15/09):
              la pagina si legge nell'ordine in cui la scheda si fa — i link,
              i piatti, poi il ristorante a cui associarla. Il richiamo in cima
              dice che si può lavorare adesso; questo, arrivati in fondo, dice
              cosa fare del lavoro finito, quando la voglia di farlo vedere è
              più forte. Col marchio dell'app perché è lì che la scheda andrà.
              Come il richiamo in cima, nomina l'associazione e non il
              pagamento: l'ordine dei due passi lo spiega /abbonamenti.
              Associato il locale, il box dice solo che è fatto.
              `scroll-mt-20`: il rimando in cima ci scorre, e la riga fissa
              in alto non deve coprirne il titolo. */}
          {/* Lo stesso colore della sezione «Online» dell'editor del menù
              (MenuAddress): verde quando la scheda si vede davvero nell'app,
              tratteggiata finché non ci siamo. Due superfici che dicono la
              stessa cosa — «questo è quello che vedono fuori» — si
              riconoscono dallo stesso fondo. */}
          <div
            id="associazione"
            className={`scroll-mt-20 rounded-2xl border p-5 ${
              stato === 'live'
                ? 'border-emerald-200 bg-emerald-50/60'
                : 'border-dashed border-gray-300 bg-gray-100/70'
            }`}
          >
            <div className="flex items-start gap-3">
              <Image
                src="/icons/icon-192.png"
                alt=""
                width={40}
                height={40}
                className="h-10 w-10 shrink-0 rounded-xl shadow-sm ring-1 ring-black/5"
              />
              <div className="min-w-0">
                <h2 className="flex flex-wrap items-center gap-2 text-sm font-medium text-gray-900">
                  {d.editor.linkBoxTitle}
                  {/* Qui l'abbonamento è il passo che manca prima
                      dell'associazione: l'invito sta accanto al titolo */}
                  {!abbonato && <ProTag variant="needed" contesto="card" venueId={venue.id} />}
                </h2>
                <p className="mt-1 text-sm text-gray-600">
                  {stato === 'none' || stato === 'rejected' || stato === 'closed' ? (
                    d.editor.linkBoxText
                  ) : stato === 'requested' ? (
                    <RestaurantPhrase
                      template={d.cardState.line.requested}
                      name={venue.request?.restaurantName ?? ''}
                      slug=""
                    />
                  ) : (
                    <RestaurantPhrase template={d.cardState.linkedTo} {...ristorante} />
                  )}
                </p>
              </div>
            </div>
            {/* IL POSTO DOVE SI GESTISCE L'ASSOCIAZIONE (19/09): associare
                finché non c'è; poi pausa o riattiva, e scollega. Una scheda
                sospesa non si tocca (la sospensione la toglie chi l'ha messa,
                721), e mentre c'è una richiesta in attesa si aspetta. Senza
                abbonamento il bottone porta prima di là: viene prima (15/09). */}
            {(stato === 'none' || stato === 'rejected' || stato === 'closed') && (
              <div className="mt-4 flex justify-end">
                <Link
                  href={verso}
                  className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-700"
                >
                  {d.editor.linkBoxCta}
                </Link>
              </div>
            )}
            {(venue.cardStatus === 'active' || venue.cardStatus === 'paused') && (
              <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setConferma('scollega')}
                  disabled={gesto}
                  className="rounded-lg px-3 py-1.5 text-sm font-medium text-gray-600 transition-colors hover:text-gray-900 disabled:opacity-40"
                >
                  {d.cardState.unlink}
                </button>
                <button
                  type="button"
                  // Pausa con la finestra che la spiega; riattivare no: annulla
                  // una pausa, e non c'è niente da sapere prima.
                  onClick={() => (venue.cardStatus === 'active' ? setConferma('pausa') : void pausa(false))}
                  disabled={gesto}
                  className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:border-gray-400 disabled:opacity-40"
                >
                  {venue.cardStatus === 'active' ? d.cardState.pause : d.cardState.resume}
                </button>
              </div>
            )}
            {erroreGesto && <p className="mt-3 text-sm text-[#C0392B]">{d.cardState.actionError}</p>}
          </div>
          {conferma === 'scollega' && (
            <ConfirmDialog
              title={d.cardState.unlinkTitle}
              subject={venue.cardRestaurant?.name}
              body={d.cardState.unlinkBody}
              confirmLabel={d.cardState.unlink}
              onCancel={() => setConferma(null)}
              onConfirm={scollega}
            />
          )}
          {conferma === 'pausa' && (
            <ConfirmDialog
              title={d.cardState.pauseTitle}
              subject={venue.cardRestaurant?.name}
              body={d.cardState.pauseBody}
              confirmLabel={d.cardState.pause}
              tone="neutral"
              onCancel={() => setConferma(null)}
              onConfirm={() => {
                setConferma(null);
                void pausa(true);
              }}
            />
          )}
        </div>
      </div>

      {/* Anteprima desktop: resta in vista mentre l'editor scorre.
          max-h + overflow-hidden: su finestre basse il contenuto è già
          ridotto in scala (.preview-column) e non deve sbordare. */}
      <div className="sticky top-10 hidden max-h-[calc(100dvh-5rem)] w-[380px] shrink-0 overflow-hidden lg:block">
        <div className="preview-column space-y-3">
          <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <button
              onClick={() => setSimOpen(!simOpen)}
              className="flex w-full items-center justify-between gap-2"
            >
              <span className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-900">{d.editor.simulatorTitle}</span>
                {viewerCount > 0 && (
                  <span className="rounded-full bg-[#E8F5E9] px-2 py-0.5 text-xs font-medium text-[#2E7D32]">
                    {viewerCount}
                  </span>
                )}
              </span>
              <svg
                className={`h-4 w-4 text-gray-400 transition-transform ${simOpen ? 'rotate-180' : ''}`}
                viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
              >
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>
            {simOpen && (
              <div className="mt-3 max-h-52 overflow-y-auto">
                <p className="mb-3 text-xs text-gray-500">{d.editor.simulatorHint}</p>
                <ViewerChips viewer={viewer} onToggle={toggleViewer} />
              </div>
            )}
          </div>
          <div>
            <p className="mb-0.5 text-center text-sm font-medium text-gray-900">
              {d.editor.previewButton}
            </p>
            <p className="mx-auto mb-2 max-w-[340px] text-center text-xs text-gray-500">
              {d.editor.previewCaption}
            </p>
            <PhoneFrame>{preview}</PhoneFrame>
          </div>
        </div>
      </div>

      {/* Anteprima mobile: bottone flottante + overlay */}
      <button
        onClick={() => setShowMobilePreview(true)}
        className="fixed bottom-20 right-4 z-30 flex items-center gap-2 rounded-full bg-gray-900 px-4 py-2.5 text-sm font-medium text-white shadow-lg lg:hidden"
      >
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <rect x="7" y="2" width="10" height="20" rx="2.5" />
          <path d="M11 18.5h2" />
        </svg>
        {d.editor.previewButton}
      </button>

      {showMobilePreview && (
        <MobilePreview
          viewer={viewer}
          onToggleViewer={toggleViewer}
          onClose={() => setShowMobilePreview(false)}
        >
          {preview}
        </MobilePreview>
      )}
    </div>
  );
}
