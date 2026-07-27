'use client';

import { useState } from 'react';
import { useI18n } from '@/lib/i18n';
import { useDraft, type DraftDish } from '@/lib/draft';
import { ALLERGENS } from '@/lib/allergens';
import PhoneFrame from '@/components/preview/PhoneFrame';
import SchedaPreview from '@/components/preview/SchedaPreview';

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
  const [allergens, setAllergens] = useState<string[]>(initial?.allergens ?? []);

  function toggleAllergen(code: string) {
    setAllergens((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  }

  return (
    <div className="rounded-xl border border-gray-300 bg-gray-50 p-4">
      <div className="space-y-3">
        <div>
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
                  onClick={() => toggleAllergen(a.code)}
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
        <div className="flex gap-2 pt-1">
          <button
            onClick={() => onSave({ name: name.trim(), description, allergens })}
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

export default function HomePage() {
  const { d, locale } = useI18n();
  const { draft, setDraft } = useDraft();
  const [editing, setEditing] = useState<'new' | string | null>(null);
  const [showMobilePreview, setShowMobilePreview] = useState(false);

  const linkKinds = [
    { key: 'booking' as const, label: d.editor.linkBooking },
    { key: 'delivery' as const, label: d.editor.linkDelivery },
    { key: 'menu' as const, label: d.editor.linkMenu },
    { key: 'website' as const, label: d.editor.linkWebsite },
  ];

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

  const preview = <SchedaPreview draft={draft} />;

  return (
    <div className="lg:flex lg:items-start lg:gap-10">
      {/* Colonna editor */}
      <div className="min-w-0 flex-1">
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

          {/* Piatti */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 font-medium text-gray-900">{d.editor.dishesTitle}</h2>

            {draft.dishes.length === 0 && editing !== 'new' && (
              <p className="mb-4 text-sm text-gray-500">{d.editor.noDishes}</p>
            )}

            <div className="space-y-3">
              {draft.dishes.map((dish) =>
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
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900">{dish.name}</p>
                      {dish.allergens.length > 0 ? (
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
                        </div>
                      ) : (
                        <p className="mt-1 text-xs text-gray-400">{d.editor.dishNoAllergens}</p>
                      )}
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

          {/* Link */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="mb-1 font-medium text-gray-900">{d.editor.linksTitle}</h2>
            <p className="mb-4 text-xs text-gray-500">{d.editor.linksHint}</p>
            <div className="space-y-3">
              {linkKinds.map(({ key, label }) => (
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
            </div>
          </div>
        </div>
      </div>

      {/* Anteprima desktop: colonna sticky */}
      <div className="hidden shrink-0 lg:block">
        <div className="sticky top-10">
          <PhoneFrame>{preview}</PhoneFrame>
          <p className="mx-auto mt-3 w-[360px] text-center text-xs text-gray-500">
            {d.editor.previewCaption}
          </p>
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
          <div className="max-h-full origin-center scale-[0.88] overflow-visible sm:scale-100">
            <PhoneFrame>{preview}</PhoneFrame>
          </div>
          <button
            onClick={() => setShowMobilePreview(false)}
            className="mt-2 rounded-full bg-white px-5 py-2 text-sm font-medium text-gray-900 shadow-lg"
          >
            {d.common.close}
          </button>
        </div>
      )}
    </div>
  );
}
