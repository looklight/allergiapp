'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useI18n } from '@/lib/i18n';
import { useShowcases, type DraftDish, type ShowcaseDraft } from '@/lib/draft';
import { ALLERGENS } from '@/lib/allergens';
import { DIETS } from '@/lib/diets';
import { DISH_CATEGORIES } from '@/lib/categories';
import { fileToResizedDataUrl } from '@/lib/image';
import { MENU_LANGUAGES } from '@/lib/languages';
import { DELIVERY_PROVIDERS } from '@/lib/providers';
import { LINK_COLORS, LINK_ORDER, type LinkKind } from '@/lib/linkKinds';
import LinkPill from '@/components/LinkPill';
import PhoneFrame from '@/components/preview/PhoneFrame';
import SchedaPreview, { NO_VIEWER, type ViewerNeeds } from '@/components/preview/SchedaPreview';

// Testo di aiuto con una parola sottolineata, segnata tra graffe nel dizionario
function EmphasizedText({ text }: { text: string }) {
  return (
    <>
      {text.split(/\{|\}/).map((part, i) =>
        i % 2 === 1 ? (
          <span key={i} className="underline decoration-gray-400 underline-offset-2">
            {part}
          </span>
        ) : (
          part
        )
      )}
    </>
  );
}

function DishForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: DraftDish;
  // la disponibilità si gestisce col toggle sulla card, non dal form
  onSave: (dish: Omit<DraftDish, 'id' | 'available'>) => void;
  onCancel: () => void;
}) {
  const { d, locale } = useI18n();
  const [name, setName] = useState(initial?.name ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [category, setCategory] = useState(initial?.category ?? '');
  const [photoUrl, setPhotoUrl] = useState(initial?.photoUrl ?? '');
  const [allergens, setAllergens] = useState<string[]>(initial?.allergens ?? []);
  const [dietTags, setDietTags] = useState<string[]>(initial?.dietTags ?? []);
  const [photoError, setPhotoError] = useState<'read' | 'size' | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const container = useRef<HTMLDivElement>(null);

  // All'apertura porta il form in vista (la colonna editor scorre da sola su desktop)
  useEffect(() => {
    container.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  function toggle(list: string[], setList: (v: string[]) => void, code: string) {
    setList(list.includes(code) ? list.filter((c) => c !== code) : [...list, code]);
  }

  async function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoError(null);
    if (file.size > 10 * 1024 * 1024) {
      setPhotoError('size');
    } else {
      try {
        setPhotoUrl(await fileToResizedDataUrl(file));
      } catch {
        setPhotoError('read');
      }
    }
    e.target.value = '';
  }

  return (
    <div ref={container} className="scroll-mt-4 rounded-xl border border-gray-300 bg-gray-50 p-4">
      <div className="space-y-3">
        {/* Categoria a scelta singola: una riga sola, scorre se non ci sta.
            Ritoccare la pill accesa la spegne = nessuna categoria. */}
        <div className="-mx-0.5 flex gap-1.5 overflow-x-auto px-0.5 pb-0.5">
          {DISH_CATEGORIES.map((cat) => {
            const selected = category === cat.code;
            return (
              <button
                key={cat.code}
                type="button"
                onClick={() => setCategory(selected ? '' : cat.code)}
                className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
                  selected
                    ? 'border-gray-900 bg-gray-900 text-white'
                    : 'border-gray-300 bg-white text-gray-600 hover:border-gray-400'
                }`}
              >
                {cat[locale]}
              </button>
            );
          })}
        </div>

        {/* Foto tonda in linea col nome, come una foto profilo */}
        <div className="flex items-center gap-3">
          <div className="relative shrink-0">
            <input
              ref={fileInput}
              type="file"
              accept="image/*"
              onChange={handlePhoto}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              aria-label={photoUrl === '' ? d.editor.addPhoto : d.editor.changePhoto}
              title={photoUrl === '' ? d.editor.addPhoto : d.editor.changePhoto}
              className="block h-16 w-16 overflow-hidden rounded-full"
            >
              {photoUrl === '' ? (
                <span className="flex h-full w-full items-center justify-center rounded-full border border-dashed border-gray-400 bg-white text-gray-400 transition-colors hover:border-gray-600 hover:text-gray-600">
                  <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 8h3l1.5-2h7L17 8h3a1 1 0 011 1v9a1 1 0 01-1 1H4a1 1 0 01-1-1V9a1 1 0 011-1z" />
                    <circle cx="12" cy="13" r="3.5" />
                  </svg>
                </span>
              ) : (
                <img src={photoUrl} alt="" className="h-full w-full object-cover" />
              )}
            </button>
            {photoUrl !== '' && (
              <button
                type="button"
                onClick={() => setPhotoUrl('')}
                aria-label={d.editor.removePhoto}
                title={d.editor.removePhoto}
                className="absolute -right-0.5 -top-0.5 flex h-5 w-5 items-center justify-center rounded-full border border-gray-300 bg-white text-gray-500 shadow-sm transition-colors hover:text-red-600"
              >
                <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={d.editor.dishNamePlaceholder}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm focus:border-gray-900 focus:outline-none"
            />
          </div>
        </div>

        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={d.editor.dishDescriptionPlaceholder}
          rows={2}
          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm focus:border-gray-900 focus:outline-none"
        />

        {photoError && (
          <p className="text-xs text-red-600">
            {photoError === 'size' ? d.editor.photoTooBig : d.editor.photoError}
          </p>
        )}

        {/* Allergeni presenti */}
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            {d.editor.dishAllergens}
          </label>
          <p className="mb-2 text-xs text-gray-500">
            <EmphasizedText text={d.editor.dishAllergensHint} />
          </p>
          <div className="flex flex-wrap gap-1.5">
            {ALLERGENS.map((a) => {
              const selected = allergens.includes(a.code);
              return (
                <button
                  key={a.code}
                  type="button"
                  onClick={() => toggle(allergens, setAllergens, a.code)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                    selected
                      ? 'border-[#FFE082] bg-[#FFF8E1] text-[#8D6E00]'
                      : 'border-gray-300 bg-white text-gray-600 hover:border-gray-400'
                  }`}
                >
                  {a[locale]}
                </button>
              );
            })}
          </div>
        </div>

        {/* Compatibilità dichiarate */}
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            {d.editor.dishTags}
          </label>
          <p className="mb-2 text-xs text-gray-500">{d.editor.dishTagsHint}</p>
          <div className="flex flex-wrap gap-1.5">
            {DIETS.map((diet) => {
              const selected = dietTags.includes(diet.code);
              return (
                <button
                  key={diet.code}
                  type="button"
                  onClick={() => toggle(dietTags, setDietTags, diet.code)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                    selected
                      ? 'border-[#C8E6C9] bg-[#E8F5E9] text-[#2E7D32]'
                      : 'border-gray-300 bg-white text-gray-600 hover:border-gray-400'
                  }`}
                >
                  {diet[locale]}
                </button>
              );
            })}
          </div>
        </div>

        {/* Prima del salvataggio: quello che si dichiara resta dichiarazione del ristoratore */}
        <p className="border-t border-gray-200 pt-3 text-xs text-gray-500">
          {d.editor.declarationNotice}
        </p>

        <div className="flex gap-2">
          <button
            onClick={() =>
              onSave({ name: name.trim(), description, category, photoUrl, allergens, dietTags })
            }
            disabled={name.trim() === ''}
            className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-700 disabled:opacity-40"
          >
            {d.common.save}
          </button>
          <button
            onClick={onCancel}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            {d.common.cancel}
          </button>
        </div>
      </div>
    </div>
  );
}

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

export default function ShowcaseEditorPage() {
  const { d, locale } = useI18n();
  const params = useParams<{ id: string }>();
  const { showcases, update } = useShowcases();
  const [editing, setEditing] = useState<'new' | string | null>(null);
  const [showMobilePreview, setShowMobilePreview] = useState(false);
  const [viewer, setViewer] = useState<ViewerNeeds>(NO_VIEWER);
  const [simOpen, setSimOpen] = useState(false);
  // Link accesi in questa sessione ma ancora vuoti: quelli con contenuto
  // si riconoscono dalla bozza, questi no (e sparirebbero al reload).
  const [activated, setActivated] = useState<LinkKind[]>([]);
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
  if (!showcases) {
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
  const setDraft = (next: ShowcaseDraft) => update(showcase.id, next);

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

  // Un link è attivo se ha già contenuto in bozza oppure se è stato appena acceso
  const hasContent: Record<LinkKind, boolean> = {
    booking: draft.links.booking.trim() !== '',
    delivery: draft.links.deliveries.length > 0,
    menu: draft.links.menus.length > 0,
    website: draft.links.website.trim() !== '',
  };
  const activeKinds = LINK_ORDER.filter((k) => hasContent[k] || activated.includes(k));
  const addableKinds = LINK_ORDER.filter((k) => !activeKinds.includes(k));

  function activateLink(kind: LinkKind) {
    setActivated((prev) => (prev.includes(kind) ? prev : [...prev, kind]));
    // delivery e menù nascono con la prima riga già pronta da compilare
    if (kind === 'delivery' && draft.links.deliveries.length === 0) addDelivery();
    if (kind === 'menu' && draft.links.menus.length === 0) addMenu();
  }

  // Spegnere un link ne svuota il contenuto: si rimette dalle pill "Aggiungi"
  function removeLink(kind: LinkKind) {
    setActivated((prev) => prev.filter((k) => k !== kind));
    const cleared =
      kind === 'delivery'
        ? { deliveries: [] }
        : kind === 'menu'
          ? { menus: [] }
          : { [kind]: '' };
    setDraft({ ...draft, links: { ...draft.links, ...cleared } });
  }

  // Senza categoria per primi, poi le categorie nell'ordine del set
  const dishGroups = [
    { cat: null, dishes: draft.dishes.filter((dish) => dish.category === '') },
    ...DISH_CATEGORIES.map((cat) => ({
      cat: cat as (typeof DISH_CATEGORIES)[number] | null,
      dishes: draft.dishes.filter((dish) => dish.category === cat.code),
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

  function saveDish(data: Omit<DraftDish, 'id' | 'available'>) {
    if (editing === 'new') {
      setDraft({
        ...draft,
        dishes: [...draft.dishes, { ...data, id: crypto.randomUUID(), available: true }],
      });
    } else if (editing) {
      setDraft({
        ...draft,
        dishes: draft.dishes.map((dish) =>
          dish.id === editing ? { ...dish, ...data } : dish
        ),
      });
    }
    setEditing(null);
  }

  function deleteDish(id: string) {
    setDraft({ ...draft, dishes: draft.dishes.filter((dish) => dish.id !== id) });
  }

  function toggleDishAvailable(id: string) {
    setDraft({
      ...draft,
      dishes: draft.dishes.map((dish) =>
        dish.id === id ? { ...dish, available: !dish.available } : dish
      ),
    });
  }

  const preview = <SchedaPreview draft={draft} viewer={viewer} />;

  return (
    // Su desktop la pagina non scorre: scorre solo la colonna editor,
    // l'anteprima a destra è semplicemente ferma (pattern a due pannelli)
    <div className="lg:flex lg:h-[calc(100vh-5rem)] lg:gap-8">
      {/* Colonna editor (scrollabile) */}
      <div className="min-w-0 flex-1 lg:h-full lg:overflow-y-auto lg:pr-4">
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
          {/* Nome vetrina (per lista e anteprima) */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <label className="mb-1 block text-sm font-medium text-gray-700">
              {d.editor.venueNameLabel}
            </label>
            <input
              type="text"
              value={draft.venueName}
              onChange={(e) => setDraft({ ...draft, venueName: e.target.value })}
              placeholder={d.editor.venueNamePlaceholder}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-gray-900 focus:outline-none"
            />
            <p className="mt-1.5 text-xs text-gray-500">{d.editor.venueNameHint}</p>
          </div>

          {/* Link */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="mb-1 font-medium text-gray-900">{d.editor.linksTitle}</h2>
            <p className="mb-4 text-xs text-gray-500">{d.editor.linksHint}</p>
            {activeKinds.length > 0 && (
              <div className="space-y-3">
                <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                  {d.editor.linksActive}
                </p>
                {activeKinds.map((kind) => (
                  <div key={kind} className="rounded-xl border border-gray-200 p-3.5">
                    <div className="mb-2 flex items-start justify-between gap-2">
                      <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                        <LinkPill kind={kind} label={LINK_LABELS[kind]} active />
                        <span className="text-[11px] leading-snug text-gray-400">{LINK_HINTS[kind]}</span>
                      </div>
                      <button
                        onClick={() => removeLink(kind)}
                        aria-label={d.editor.removeLink}
                        title={d.editor.removeLink}
                        className="mt-1.5 shrink-0 text-gray-400 transition-colors hover:text-red-600"
                      >
                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                          <path d="M6 6l12 12M18 6L6 18" />
                        </svg>
                      </button>
                    </div>

                    {(kind === 'booking' || kind === 'website') && (
                      <input
                        type="url"
                        value={draft.links[kind]}
                        onChange={(e) =>
                          setDraft({ ...draft, links: { ...draft.links, [kind]: e.target.value } })
                        }
                        placeholder={d.editor.linkPlaceholder}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none"
                      />
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

          {/* Piatti */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="mb-1 font-medium text-gray-900">{d.editor.dishesTitle}</h2>
            <p className="mb-4 text-xs text-gray-500">{d.editor.dishesHint}</p>

            <div className="space-y-3">
              {dishGroups.map(({ cat, dishes }) => (
                <div key={cat?.code ?? 'none'}>
                  {cat && (
                    <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-400">
                      {cat[locale]}
                    </p>
                  )}
                  <div className="space-y-3">
                    {dishes.map((dish) =>
                      editing === dish.id ? (
                        <DishForm
                          key={dish.id}
                          initial={dish}
                          onSave={saveDish}
                          onCancel={() => setEditing(null)}
                        />
                      ) : (
                        <div
                          key={dish.id}
                          className="flex items-start justify-between gap-3 rounded-xl border border-gray-200 p-3.5"
                        >
                          <div className={`flex min-w-0 gap-3 ${dish.available ? '' : 'opacity-50'}`}>
                            {dish.photoUrl !== '' && (
                              <img
                                src={dish.photoUrl}
                                alt=""
                                className="h-11 w-11 shrink-0 rounded-full object-cover"
                              />
                            )}
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="truncate text-sm font-medium text-gray-900">{dish.name}</p>
                                {!dish.available && (
                                  <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-500">
                                    {d.editor.dishHidden}
                                  </span>
                                )}
                              </div>
                              {dish.allergens.length + dish.dietTags.length > 0 ? (
                                <div className="mt-1.5 flex flex-wrap gap-1">
                                  {dish.allergens.map((code) => {
                                    const info = ALLERGENS.find((a) => a.code === code);
                                    return (
                                      <span
                                        key={code}
                                        className="rounded-full bg-[#FFF8E1] px-2 py-0.5 text-[11px] font-medium text-[#8D6E00]"
                                      >
                                        {info ? info[locale] : code}
                                      </span>
                                    );
                                  })}
                                  {dish.dietTags.map((code) => {
                                    const info = DIETS.find((t) => t.code === code);
                                    return (
                                      <span
                                        key={code}
                                        className="rounded-full bg-[#E8F5E9] px-2 py-0.5 text-[11px] font-medium text-[#2E7D32]"
                                      >
                                        {info ? info[locale] : code}
                                      </span>
                                    );
                                  })}
                                </div>
                              ) : (
                                <p className="mt-1 text-xs text-gray-400">{d.editor.dishNoAllergens}</p>
                              )}
                            </div>
                          </div>
                          <div className="flex shrink-0 items-center gap-3 text-xs font-medium">
                            <button
                              type="button"
                              role="switch"
                              aria-checked={dish.available}
                              title={dish.available ? d.editor.dishAvailable : d.editor.dishHidden}
                              onClick={() => toggleDishAvailable(dish.id)}
                              className={`relative h-5 w-9 rounded-full transition-colors ${
                                dish.available ? 'bg-[#4CAF50]' : 'bg-gray-300'
                              }`}
                            >
                              <span
                                className={`absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
                                  dish.available ? 'translate-x-4' : ''
                                }`}
                              />
                            </button>
                            <button
                              onClick={() => setEditing(dish.id)}
                              className="text-gray-600 hover:text-gray-900"
                            >
                              {d.common.edit}
                            </button>
                            <button
                              onClick={() => deleteDish(dish.id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              {d.common.delete}
                            </button>
                          </div>
                        </div>
                      )
                    )}
                  </div>
                </div>
              ))}

              {editing === 'new' ? (
                <DishForm onSave={saveDish} onCancel={() => setEditing(null)} />
              ) : (
                <button
                  onClick={() => setEditing('new')}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-700"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                  {d.editor.addDish}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Anteprima desktop: colonna sticky con simulatore */}
      {/* overflow-hidden: se la colonna (in layout) supera l'altezza della
          riga non deve gonfiare la pagina — a quelle altezze il contenuto
          è comunque ridotto in scala e resta visibile intero */}
      <div className="hidden w-[380px] shrink-0 lg:block lg:overflow-hidden">
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
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/75 p-4 lg:hidden">
          <div className="w-full max-w-[380px]">
            <ViewerChips viewer={viewer} onToggle={toggleViewer} compact />
          </div>
          <div className="max-h-full origin-center scale-[0.85] overflow-visible sm:scale-100">
            <PhoneFrame>{preview}</PhoneFrame>
          </div>
          <button
            onClick={() => setShowMobilePreview(false)}
            className="mt-1 rounded-full bg-white px-5 py-2 text-sm font-medium text-gray-900 shadow-lg"
          >
            {d.common.close}
          </button>
        </div>
      )}
    </div>
  );
}
