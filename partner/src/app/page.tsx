'use client';

import { useRef, useState } from 'react';
import { useI18n } from '@/lib/i18n';
import { useDraft, type DraftDish } from '@/lib/draft';
import { ALLERGENS } from '@/lib/allergens';
import { DIETS } from '@/lib/diets';
import { DISH_CATEGORIES } from '@/lib/categories';
import { fileToResizedDataUrl } from '@/lib/image';
import { MENU_LANGUAGES } from '@/lib/languages';
import { DELIVERY_PROVIDERS } from '@/lib/providers';
import PhoneFrame from '@/components/preview/PhoneFrame';
import SchedaPreview, { NO_VIEWER, type ViewerNeeds } from '@/components/preview/SchedaPreview';

function DishForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: DraftDish;
  onSave: (dish: Omit<DraftDish, 'id'>) => void;
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
    <div className="rounded-xl border border-gray-300 bg-gray-50 p-4">
      <div className="space-y-3">
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="mb-1 block text-sm font-medium text-gray-700">
              {d.editor.dishName}
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={d.editor.dishNamePlaceholder}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm focus:border-gray-900 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              {d.editor.dishCategory}
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm focus:border-gray-900 focus:outline-none"
            >
              <option value="">{d.editor.noCategory}</option>
              {DISH_CATEGORIES.map((cat) => (
                <option key={cat.code} value={cat.code}>
                  {cat[locale]}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            {d.editor.dishDescription}
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={d.editor.dishDescriptionPlaceholder}
            rows={2}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm focus:border-gray-900 focus:outline-none"
          />
        </div>

        {/* Foto */}
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            {d.editor.dishPhoto}
          </label>
          <p className="mb-2 text-xs text-gray-500">{d.editor.photoHint}</p>
          <div className="flex items-center gap-3">
            {photoUrl !== '' && (
              <img src={photoUrl} alt="" className="h-16 w-16 rounded-full object-cover" />
            )}
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
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              {photoUrl === '' ? d.editor.addPhoto : d.editor.changePhoto}
            </button>
            {photoUrl !== '' && (
              <button
                type="button"
                onClick={() => setPhotoUrl('')}
                className="text-sm font-medium text-red-600 hover:text-red-700"
              >
                {d.editor.removePhoto}
              </button>
            )}
          </div>
          {photoError && (
            <p className="mt-1 text-xs text-red-600">
              {photoError === 'size' ? d.editor.photoTooBig : d.editor.photoError}
            </p>
          )}
        </div>

        {/* Allergeni presenti */}
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            {d.editor.dishAllergens}
          </label>
          <p className="mb-2 text-xs text-gray-500">{d.editor.dishAllergensHint}</p>
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

        <div className="flex gap-2 pt-1">
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

export default function HomePage() {
  const { d, locale } = useI18n();
  const { draft, setDraft } = useDraft();
  const [editing, setEditing] = useState<'new' | string | null>(null);
  const [showMobilePreview, setShowMobilePreview] = useState(false);
  const [viewer, setViewer] = useState<ViewerNeeds>(NO_VIEWER);
  const [simOpen, setSimOpen] = useState(false);
  const viewerCount = viewer.allergens.length + viewer.diets.length;

  const singleLinkKinds = [{ key: 'booking' as const, label: d.editor.linkBooking }];

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

  function saveDish(data: Omit<DraftDish, 'id'>) {
    if (editing === 'new') {
      setDraft({
        ...draft,
        dishes: [...draft.dishes, { ...data, id: crypto.randomUUID() }],
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

  const preview = <SchedaPreview draft={draft} viewer={viewer} />;

  return (
    // Su desktop la pagina non scorre: scorre solo la colonna editor,
    // l'anteprima a destra è semplicemente ferma (pattern a due pannelli)
    <div className="lg:flex lg:h-[calc(100vh-5rem)] lg:gap-8">
      {/* Colonna editor (scrollabile) */}
      <div className="min-w-0 flex-1 lg:h-full lg:overflow-y-auto lg:pr-4">
        <div className="mb-2 flex items-center gap-3">
          <h1 className="text-xl font-semibold md:text-2xl">{d.home.title}</h1>
          <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">
            {d.home.draftBadge}
          </span>
        </div>
        <p className="mb-8 max-w-xl text-sm text-gray-600">{d.home.intro}</p>

        <div className="space-y-4">
          {/* Nome locale (per l'anteprima) */}
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
            <div className="space-y-3">
              {singleLinkKinds.map(({ key, label }) => (
                <div key={key} className="sm:flex sm:items-center sm:gap-3">
                  <label className="mb-1 block w-32 shrink-0 text-sm font-medium text-gray-700 sm:mb-0">
                    {label}
                  </label>
                  <input
                    type="url"
                    value={draft.links[key]}
                    onChange={(e) =>
                      setDraft({ ...draft, links: { ...draft.links, [key]: e.target.value } })
                    }
                    placeholder={d.editor.linkPlaceholder}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none"
                  />
                </div>
              ))}

              {/* Delivery: più servizi (nella scheda un solo bottone,
                  con più link l'app apre un bottom sheet di scelta) */}
              <div className="sm:flex sm:items-start sm:gap-3">
                <label className="mb-1 block w-32 shrink-0 text-sm font-medium text-gray-700 sm:mb-0 sm:pt-2">
                  {d.editor.linkDelivery}
                </label>
                <div className="w-full space-y-2">
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
                  <button
                    onClick={addDelivery}
                    className="text-sm font-medium text-gray-600 transition-colors hover:text-gray-900"
                  >
                    + {d.editor.addDeliveryProvider}
                  </button>
                  <p className="text-xs text-gray-500">{d.editor.deliveryHint}</p>
                </div>
              </div>

              {/* Menù: più link, uno per lingua */}
              <div className="sm:flex sm:items-start sm:gap-3">
                <label className="mb-1 block w-32 shrink-0 text-sm font-medium text-gray-700 sm:mb-0 sm:pt-2">
                  {d.editor.linkMenu}
                </label>
                <div className="w-full space-y-2">
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
                  <button
                    onClick={addMenu}
                    className="text-sm font-medium text-gray-600 transition-colors hover:text-gray-900"
                  >
                    + {d.editor.addMenuLanguage}
                  </button>
                  <p className="text-xs text-gray-500">{d.editor.menuLangHint}</p>
                </div>
              </div>

              {/* Sito web */}
              <div className="sm:flex sm:items-center sm:gap-3">
                <label className="mb-1 block w-32 shrink-0 text-sm font-medium text-gray-700 sm:mb-0">
                  {d.editor.linkWebsite}
                </label>
                <input
                  type="url"
                  value={draft.links.website}
                  onChange={(e) =>
                    setDraft({ ...draft, links: { ...draft.links, website: e.target.value } })
                  }
                  placeholder={d.editor.linkPlaceholder}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Piatti */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 font-medium text-gray-900">{d.editor.dishesTitle}</h2>

            {draft.dishes.length === 0 && editing !== 'new' && (
              <p className="mb-4 text-sm text-gray-500">{d.editor.noDishes}</p>
            )}

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
                          <div className="flex min-w-0 gap-3">
                            {dish.photoUrl !== '' && (
                              <img
                                src={dish.photoUrl}
                                alt=""
                                className="h-11 w-11 shrink-0 rounded-full object-cover"
                              />
                            )}
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-gray-900">{dish.name}</p>
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
                          <div className="flex shrink-0 gap-3 text-xs font-medium">
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
                  className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-700"
                >
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
