'use client';

// La maschera del piatto: una sola, usata dal gestionale (pannello laterale)
// e da chiunque altro debba creare o correggere un piatto del catalogo.
// Non disegna il proprio contenitore: lo mette chi la ospita.
import { useRef, useState } from 'react';
import { useI18n } from '@/lib/i18n';
import { useDishLanguages, type Dish, type DishTranslation } from '@/lib/dishes';
import { MENU_LANGUAGES } from '@/lib/languages';
import { ALLERGENS } from '@/lib/allergens';
import { DIETS } from '@/lib/diets';
import { DISH_CATEGORIES } from '@/lib/categories';
import { fileToResizedDataUrl } from '@/lib/image';

// Testo di aiuto con una parte sottolineata, segnata tra graffe nel dizionario.
// Le graffe qui racchiudono il testo da sottolineare, che può essere una
// parola o un pezzo di frase; quelle di fill() in i18n.tsx racchiudono il NOME
// di un valore da sostituire: due usi diversi che non si incontrano mai nella
// stessa frase.
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

export default function DishForm({
  initial,
  onSave,
  onCancel,
  children,
}: {
  initial?: Dish;
  onSave: (dish: Omit<Dish, 'id'>) => void;
  onCancel: () => void;
  // sezione in coda ai campi, prima della nota legale: il gestionale ci
  // mette le caselle "In vetrina"
  children?: React.ReactNode;
}) {
  const { d, locale } = useI18n();
  const [name, setName] = useState(initial?.name ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [category, setCategory] = useState(initial?.category ?? '');
  const [photoUrl, setPhotoUrl] = useState(initial?.photoUrl ?? '');
  const [allergens, setAllergens] = useState<string[]>(initial?.allergens ?? []);
  const [dietTags, setDietTags] = useState<string[]>(initial?.dietTags ?? []);
  const [photoError, setPhotoError] = useState<'read' | 'size' | null>(null);
  // Le lingue scelte per il menù: i blocchi compaiono solo per quelle, e se
  // non ne è stata scelta nessuna la sezione non esiste proprio
  const { languages } = useDishLanguages();
  const [translations, setTranslations] = useState<DishTranslation[]>(initial?.translations ?? []);
  const fileInput = useRef<HTMLInputElement>(null);

  function translation(language: string): DishTranslation {
    return (
      translations.find((t) => t.language === language) ?? { language, name: '', description: '' }
    );
  }

  function setTranslation(language: string, patch: Partial<DishTranslation>) {
    setTranslations((prev) => {
      const found = prev.some((t) => t.language === language);
      return found
        ? prev.map((t) => (t.language === language ? { ...t, ...patch } : t))
        : [...prev, { ...translation(language), ...patch }];
    });
  }

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
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 pb-4 md:px-6">
      {/* Categoria a scelta singola: le pill vanno a capo invece di scorrere,
          così si vedono tutte insieme senza doverne cercare una fuori campo.
          Ritoccare la pill accesa la spegne = nessuna categoria. */}
      <div className="flex flex-wrap gap-1.5">
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

      {/* Le altre lingue stanno subito sotto ai campi che traducono. Il segna-
          posto grigio è l'originale: mostra al partner cosa leggerà il cliente
          se lascia il campo vuoto, che per il nome è il caso normale. */}
      {(languages ?? []).length > 0 && (
        <div className="space-y-3 rounded-xl border border-gray-200 bg-gray-50 p-3">
          <p className="text-xs text-gray-500">{d.editor.translationsHint}</p>
          {MENU_LANGUAGES.filter((lang) => (languages ?? []).includes(lang.code)).map((lang) => {
            const t = translation(lang.code);
            return (
              <div key={lang.code} className="space-y-1.5">
                <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                  {lang.native}
                </p>
                <input
                  type="text"
                  value={t.name}
                  onChange={(e) => setTranslation(lang.code, { name: e.target.value })}
                  placeholder={name.trim() || d.editor.dishNamePlaceholder}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-gray-900 focus:outline-none"
                />
                <textarea
                  value={t.description}
                  onChange={(e) => setTranslation(lang.code, { description: e.target.value })}
                  placeholder={description.trim() || d.editor.dishDescriptionPlaceholder}
                  rows={2}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-gray-900 focus:outline-none"
                />
              </div>
            );
          })}
        </div>
      )}

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

      {children}

      </div>

      {/* Il piede sta fuori dalla parte che scorre. La nota va accanto ai
          bottoni e non sopra: sta sulla stessa riga, quindi si legge insieme
          alla decisione che accompagna e ruba meno schermo al telefono.
          Il padding in basso tiene conto della barretta home. */}
      <div className="flex shrink-0 items-center gap-4 border-t border-gray-200 px-5 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] md:px-6 md:pb-3">
        {/* Quello che si dichiara resta dichiarazione del ristoratore: parole
            invariate, è una nota legale, solo più compatta */}
        <p className="min-w-0 flex-1 text-[11px] leading-snug text-gray-500">
          {d.editor.declarationNotice}
        </p>

        {/* Salva è l'azione: Annulla perde il bordo e resta un'uscita
            disponibile, non una scelta da soppesare */}
        <div className="flex shrink-0 items-center gap-1">
          <button
            onClick={onCancel}
            className="rounded-lg px-3 py-2 text-sm font-medium text-gray-500 transition-colors hover:text-gray-900"
          >
            {d.common.cancel}
          </button>
          <button
            onClick={() =>
                onSave({
                name: name.trim(),
                description,
                category,
                photoUrl,
                allergens,
                dietTags,
                // le lingue tolte dalle impostazioni non si buttano via: se il
                // partner le rimette, il lavoro fatto è ancora lì
                translations: translations.map((t) => ({ ...t, name: t.name.trim() })),
              })
            }
            disabled={name.trim() === ''}
            className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-700 disabled:opacity-40"
          >
            {d.common.save}
          </button>
        </div>
      </div>
    </div>
  );
}
