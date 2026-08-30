'use client';

import { useId, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useI18n } from '@/lib/i18n';
import { useModal } from '@/lib/useModal';
import { showcaseDishes, useDishes } from '@/lib/dishes';
import { hasBooking, normalizeUrl, useShowcases, type ShowcaseDraft } from '@/lib/showcases';
import { ALLERGENS } from '@/lib/allergens';
import { DIETS } from '@/lib/diets';
import { DISH_CATEGORIES } from '@/lib/categories';
import { MENU_LANGUAGES } from '@/lib/languages';
import { DELIVERY_PROVIDERS } from '@/lib/providers';
import { LINK_COLORS, LINK_ORDER, type LinkKind } from '@/lib/linkKinds';
import LinkPill from '@/components/LinkPill';
import PhoneFrame from '@/components/preview/PhoneFrame';
import SchedaPreview, { NO_VIEWER, type ViewerNeeds } from '@/components/preview/SchedaPreview';

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

export default function ShowcaseEditorPage() {
  const { d, locale } = useI18n();
  const params = useParams<{ id: string }>();
  const { showcases, update, setDishOn } = useShowcases();
  // Il catalogo è del partner: la vetrina dice solo quali piatti sono accesi
  const { dishes: catalog } = useDishes();
  const [showMobilePreview, setShowMobilePreview] = useState(false);
  const [viewer, setViewer] = useState<ViewerNeeds>(NO_VIEWER);
  const [simOpen, setSimOpen] = useState(false);
  // Link accesi in questa sessione ma ancora vuoti: quelli con contenuto
  // si riconoscono dalla bozza, questi no (e sparirebbero al reload).
  const [activated, setActivated] = useState<LinkKind[]>([]);
  // Campi della prenotazione aperti o chiusi a mano in questa sessione:
  // null = lascia decidere alla bozza (v. showBookingUrl/showBookingPhone)
  // Link aperto in modifica: gli altri restano pill. null = tutti chiusi
  const [openKind, setOpenKind] = useState<LinkKind | null>(null);
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

  const showcase = showcases?.find((s) => s.id === params.id);

  // Prima lettura di localStorage ancora in corso
  if (!showcases || !catalog) {
    return <p className="text-sm text-gray-500">{d.common.loading}</p>;
  }
  if (!showcase) {
    return (
      <div>
        <p className="mb-3 text-sm text-gray-600">{d.home.notFound}</p>
        <Link href="/" className="text-sm font-medium text-gray-900 underline">
          {d.home.backToList}
        </Link>
      </div>
    );
  }

  const draft: ShowcaseDraft = showcase;
  const showcaseId = showcase.id;
  const setDraft = (next: ShowcaseDraft) => update(showcaseId, next);

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
    setOpenKind(kind);
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

  // Tutto il catalogo, accesi e spenti: se mostrasse solo gli accesi, una
  // vetrina nuova non avrebbe niente da accendere.
  // Senza categoria per primi, poi le categorie nell'ordine del set
  const dishGroups = [
    { cat: null, dishes: catalog.filter((dish) => dish.category === '') },
    ...DISH_CATEGORIES.map((cat) => ({
      cat: cat as (typeof DISH_CATEGORIES)[number] | null,
      dishes: catalog.filter((dish) => dish.category === cat.code),
    })),
  ].filter((g) => g.dishes.length > 0);

  function toggleViewer(kind: 'allergens' | 'diets', code: string) {
    setViewer((prev) => ({
      ...prev,
      [kind]: prev[kind].includes(code)
        ? prev[kind].filter((c) => c !== code)
        : [...prev[kind], code],
    }));
  }

  const preview = <SchedaPreview draft={draft} dishes={showcaseDishes(catalog, draft)} viewer={viewer} />;

  return (
    // Scorre la pagina, non un pannello interno: così niente bordi che
    // tagliano le card a metà. L'anteprima resta in vista perché è sticky.
    <div className="lg:flex lg:items-start lg:gap-8">
      {/* Colonna editor */}
      <div className="min-w-0 flex-1">
        <Link
          href="/"
          className="mb-3 inline-flex items-center gap-1 text-sm font-medium text-gray-500 hover:text-gray-900"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M15 6l-6 6 6 6" />
          </svg>
          {d.home.backToList}
        </Link>
        <div className="mb-2 flex items-center gap-3">
          <h1 className="text-xl font-semibold md:text-2xl">{d.editor.title}</h1>
          <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">
            {d.editor.draftBadge}
          </span>
        </div>
        <p className="mb-2 max-w-xl text-sm text-gray-600">{d.editor.intro}</p>
        <Link
          href="/abbonamenti"
          className="mb-8 inline-block text-sm font-medium text-gray-700 underline hover:text-gray-900"
        >
          {d.editor.subsLink}
        </Link>

        <div className="space-y-4">
          {/* Link */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="mb-1 font-medium text-gray-900">{d.editor.linksTitle}</h2>
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

                    {/* Salva qui non "invia" niente (la bozza è già scritta):
                        chiude il link e lo riporta a pill, come nel form piatto */}
                    <div className="mt-3 flex justify-end">
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
                      <LinkPill kind={kind} label={LINK_LABELS[kind]} active={false} />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Piatti: qui si sceglie solo cosa mostrare in questa vetrina.
              Il piatto in sé (foto, allergeni, categoria) si cura nel
              gestionale, che è del partner e non della singola vetrina. */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="mb-1 flex items-start justify-between gap-3">
              <h2 className="font-medium text-gray-900">{d.editor.dishesTitle}</h2>
              <Link
                href="/piatti"
                className="shrink-0 text-sm font-medium text-gray-700 underline hover:text-gray-900"
              >
                {d.editor.manageDishes}
              </Link>
            </div>
            <p className="mb-4 text-xs text-gray-500">{d.editor.dishesHint}</p>

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
                <p className="mb-3 text-xs text-gray-500">
                  {draft.dishIds.length} {d.editor.dishesOnOf} {catalog.length}{' '}
                  {d.editor.dishesOnLabel}
                </p>
                <div className="space-y-4">
                  {dishGroups.map(({ cat, dishes }) => (
                    <div key={cat?.code ?? 'none'}>
                      {cat && (
                        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-400">
                          {cat[locale]}
                        </p>
                      )}
                      <div className="grid grid-cols-[repeat(auto-fill,minmax(84px,1fr))] gap-3">
                        {dishes.map((dish) => {
                          const on = draft.dishIds.includes(dish.id);
                          return (
                            <button
                              key={dish.id}
                              type="button"
                              role="switch"
                              aria-checked={on}
                              onClick={() => setDishOn(showcaseId, dish.id, !on)}
                              className="flex flex-col items-center gap-1.5"
                            >
                              <span className="relative block">
                                {/* Spento: foto smorzata e nome grigio. Si legge
                                    a colpo d'occhio senza etichette da leggere. */}
                                {dish.photoUrl !== '' ? (
                                  <img
                                    src={dish.photoUrl}
                                    alt=""
                                    className={`h-16 w-16 rounded-full object-cover transition ${
                                      on ? '' : 'opacity-40 grayscale'
                                    }`}
                                  />
                                ) : (
                                  <span
                                    className={`flex h-16 w-16 items-center justify-center rounded-full border border-dashed text-gray-400 transition ${
                                      on ? 'border-gray-400' : 'border-gray-300 opacity-50'
                                    }`}
                                  >
                                    <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                      <path d="M4 8h3l1.5-2h7L17 8h3a1 1 0 011 1v9a1 1 0 01-1 1H4a1 1 0 01-1-1V9a1 1 0 011-1z" />
                                      <circle cx="12" cy="13" r="3.5" />
                                    </svg>
                                  </span>
                                )}
                                {/* Il segno di stato: acceso pieno, spento un
                                    cerchio vuoto che dice che si può accendere */}
                                <span
                                  className={`absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white transition-colors ${
                                    on ? 'bg-[#4CAF50] text-white' : 'bg-gray-200 text-transparent'
                                  }`}
                                >
                                  <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M5 12.5l4.5 4.5L19 7" />
                                  </svg>
                                </span>
                              </span>
                              <span
                                className={`w-full truncate text-center text-xs ${
                                  on ? 'font-medium text-gray-900' : 'text-gray-400'
                                }`}
                                title={dish.name}
                              >
                                {dish.name}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
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
