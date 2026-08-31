'use client';

// La maschera del piatto: una sola, usata dal gestionale (pannello laterale)
// e da chiunque altro debba creare o correggere un piatto del catalogo.
// Non disegna il proprio contenitore: lo mette chi la ospita.
import { useEffect, useRef, useState } from 'react';
import { useI18n } from '@/lib/i18n';
import { catalogLanguages, useDishes, type Dish, type DishTranslation } from '@/lib/dishes';
import { MENU_LANGUAGES } from '@/lib/languages';
import { ALLERGENS } from '@/lib/allergens';
import { DIETS } from '@/lib/diets';
import { DISH_CATEGORIES } from '@/lib/categories';
import PhotoCropDialog from './PhotoCropDialog';
import {
  deleteDishPhoto,
  uploadDishPhoto,
  MAX_FILE_BYTES,
  PhotoError,
  type DishPhoto,
} from '@/lib/photos';

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
  // La foto sta già sullo Storage: qui ci sono i suoi due indirizzi, non
  // l'immagine. Si carica appena la si sceglie e non al salvataggio, così il
  // ristoratore vede subito se è arrivata — è la scrittura più lenta e
  // l'unica che valga la pena aspettare guardando.
  const [photo, setPhoto] = useState<DishPhoto>({
    url: initial?.photoUrl ?? '',
    thumbUrl: initial?.photoThumbUrl ?? '',
  });
  const [uploading, setUploading] = useState(false);
  // Il file scelto, in attesa che si decida quale quadrato tenerne: il
  // caricamento parte dopo, perché dopo non si può più scegliere
  const [daRitagliare, setDaRitagliare] = useState<File | null>(null);
  const [allergens, setAllergens] = useState<string[]>(initial?.allergens ?? []);
  const [dietTags, setDietTags] = useState<string[]>(initial?.dietTags ?? []);
  const [photoError, setPhotoError] = useState<'read' | 'size' | 'upload' | null>(null);
  // Le traduzioni si aggiungono qui, piatto per piatto: quasi tutti i
  // ristoratori scriveranno solo in italiano, e chi ne vuole un'altra la
  // aggiunge dove sta già scrivendo invece che in un'impostazione a parte.
  const [translations, setTranslations] = useState<DishTranslation[]>(initial?.translations ?? []);
  // Le lingue già usate altrove nel catalogo si propongono per prime
  const { dishes } = useDishes();
  const used = catalogLanguages(dishes ?? []).filter(
    (code) => !translations.some((t) => t.language === code)
  );
  const fileInput = useRef<HTMLInputElement>(null);
  // Le foto caricate mentre la maschera era aperta. Chi cambia idea due volte
  // ne lascia dietro una: qui si tiene il conto per portarle via all'uscita.
  const caricate = useRef<DishPhoto[]>([]);
  // L'indirizzo consegnato al salvataggio: è l'unico che NON va cancellato.
  const conservata = useRef<string | null>(null);

  // La pulizia sta allo smontaggio e non nel bottone Annulla apposta: dalla
  // maschera si esce anche con la ✕, con Esc e cliccando fuori, e una foto
  // caricata per sbaglio non deve restare sullo Storage per la strada scelta
  // per uscire. La foto di partenza non si tocca: quella la cancella
  // l'aggiornamento del piatto, e solo se la riga viene scritta davvero.
  useEffect(
    () => () => {
      for (const f of caricate.current) {
        if (f.url !== conservata.current) void deleteDishPhoto(f.url, f.thumbUrl);
      }
    },
    []
  );

  function setTranslation(index: number, patch: Partial<DishTranslation>) {
    setTranslations((prev) => prev.map((t, i) => (i === index ? { ...t, ...patch } : t)));
  }

  // Nasce senza lingua: il blocco mostra la tendina finché non se ne sceglie una
  function addTranslation(language = '') {
    setTranslations((prev) => [...prev, { language, name: '', description: '' }]);
  }

  function removeTranslation(index: number) {
    setTranslations((prev) => prev.filter((_, i) => i !== index));
  }

  function toggle(list: string[], setList: (v: string[]) => void, code: string) {
    setList(list.includes(code) ? list.filter((c) => c !== code) : [...list, code]);
  }

  async function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    // Azzerato subito: senza, riscegliere lo stesso file dopo un errore non
    // farebbe scattare nessun cambiamento e sembrerebbe che il bottone sia morto
    e.target.value = '';
    if (!file) return;
    setPhotoError(null);
    if (file.size > MAX_FILE_BYTES) {
      setPhotoError('size');
      return;
    }
    setDaRitagliare(file);
  }

  async function carica(file: File, posizione: number) {
    setDaRitagliare(null);
    setUploading(true);
    try {
      const caricata = await uploadDishPhoto(file, posizione);
      caricate.current.push(caricata);
      setPhoto(caricata);
    } catch (error) {
      setPhotoError(error instanceof PhotoError ? error.kind : 'upload');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {daRitagliare !== null && (
        <PhotoCropDialog
          file={daRitagliare}
          onConfirm={(posizione) => carica(daRitagliare, posizione)}
          onCancel={() => setDaRitagliare(null)}
          onUnreadable={() => {
            setDaRitagliare(null);
            setPhotoError('read');
          }}
        />
      )}
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
            disabled={uploading}
            aria-label={photo.url === '' ? d.editor.addPhoto : d.editor.changePhoto}
            title={photo.url === '' ? d.editor.addPhoto : d.editor.changePhoto}
            aria-busy={uploading}
            className="block h-16 w-16 overflow-hidden rounded-full"
          >
            {uploading ? (
              // Il cerchio che gira sta DENTRO il posto della foto: quello che
              // si aspetta è quello, e chi guarda non deve cercare altrove
              <span className="flex h-full w-full items-center justify-center rounded-full border border-dashed border-gray-400 bg-white">
                <svg className="h-6 w-6 animate-spin text-gray-400" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" opacity="0.25" />
                  <path d="M21 12a9 9 0 00-9-9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                </svg>
              </span>
            ) : photo.url === '' ? (
              <span className="flex h-full w-full items-center justify-center rounded-full border border-dashed border-gray-400 bg-white text-gray-400 transition-colors hover:border-gray-600 hover:text-gray-600">
                <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 8h3l1.5-2h7L17 8h3a1 1 0 011 1v9a1 1 0 01-1 1H4a1 1 0 01-1-1V9a1 1 0 011-1z" />
                  <circle cx="12" cy="13" r="3.5" />
                </svg>
              </span>
            ) : (
              <img src={photo.thumbUrl || photo.url} alt="" className="h-full w-full object-cover" />
            )}
          </button>
          {photo.url !== '' && !uploading && (
            <button
              type="button"
              onClick={() => setPhoto({ url: '', thumbUrl: '' })}
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

      {/* Il messaggio sta sotto la riga della foto e non in fondo alla
          maschera: dice tre cose diverse, e ognuna porta a un gesto diverso —
          scegliere un file più leggero, sceglierne uno che sia un'immagine,
          oppure riprovare. */}
      {photoError && (
        <p className="text-xs text-red-600" role="alert">
          {photoError === 'size'
            ? d.editor.photoTooBig
            : photoError === 'upload'
              ? d.editor.photoUploadError
              : d.editor.photoError}
        </p>
      )}

      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder={d.editor.dishDescriptionPlaceholder}
        rows={2}
        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm focus:border-gray-900 focus:outline-none"
      />

      {/* Le altre lingue stanno subito sotto ai campi che traducono, e si
          aggiungono da qui: chi scrive solo in italiano vede un bottone
          smorto, chi ne vuole una la aggiunge senza uscire dalla scheda.
          Il segnaposto grigio è l'originale: mostra cosa leggerà il cliente
          se il campo resta vuoto, che per il nome è il caso normale. */}
      <div className="space-y-2">
        {translations.length > 0 && (
          <div className="space-y-3 rounded-xl border border-gray-200 bg-gray-50 p-3">
            <p className="text-xs text-gray-500">{d.editor.translationsHint}</p>
            {translations.map((t, i) => (
              <div key={i} className="space-y-1.5">
                <div className="flex items-center gap-2">
                  {t.language === '' ? (
                    <select
                      value=""
                      autoFocus
                      onChange={(e) => setTranslation(i, { language: e.target.value })}
                      className="min-w-0 flex-1 rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-sm focus:border-gray-900 focus:outline-none"
                    >
                      <option value="">{d.editor.languagePlaceholder}</option>
                      {MENU_LANGUAGES.filter(
                        (lang) => !translations.some((x, j) => j !== i && x.language === lang.code)
                      ).map((lang) => (
                        <option key={lang.code} value={lang.code}>
                          {lang.native}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <p className="min-w-0 flex-1 truncate text-xs font-medium uppercase tracking-wide text-gray-400">
                      {MENU_LANGUAGES.find((lang) => lang.code === t.language)?.native ?? t.language}
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={() => removeTranslation(i)}
                    aria-label={d.editor.removeLanguage}
                    title={d.editor.removeLanguage}
                    className="shrink-0 text-gray-400 transition-colors hover:text-red-600"
                  >
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <path d="M6 6l12 12M18 6L6 18" />
                    </svg>
                  </button>
                </div>
                {t.language !== '' && (
                  <>
                    <input
                      type="text"
                      value={t.name}
                      onChange={(e) => setTranslation(i, { name: e.target.value })}
                      placeholder={name.trim() || d.editor.dishNamePlaceholder}
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-gray-900 focus:outline-none"
                    />
                    <textarea
                      value={t.description}
                      onChange={(e) => setTranslation(i, { description: e.target.value })}
                      placeholder={description.trim() || d.editor.dishDescriptionPlaceholder}
                      rows={2}
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-gray-900 focus:outline-none"
                    />
                  </>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="flex flex-wrap gap-1.5">
          {/* Le lingue già usate altrove: un tocco solo, senza ripescarle */}
          {used.map((code) => (
            <button
              key={code}
              type="button"
              onClick={() => addTranslation(code)}
              className="rounded-full border border-dashed border-gray-300 px-2.5 py-1 text-xs font-medium text-gray-500 transition-colors hover:border-gray-500 hover:text-gray-900"
            >
              + {MENU_LANGUAGES.find((lang) => lang.code === code)?.native ?? code}
            </button>
          ))}
          {translations.some((t) => t.language === '') ? null : (
            <button
              type="button"
              onClick={() => addTranslation()}
              className="rounded-full border border-dashed border-gray-300 px-2.5 py-1 text-xs font-medium text-gray-500 transition-colors hover:border-gray-500 hover:text-gray-900"
            >
              + {d.editor.addLanguage}
            </button>
          )}
        </div>
      </div>

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
            onClick={() => {
              // L'indirizzo consegnato è l'unico da non cancellare all'uscita
              conservata.current = photo.url;
              onSave({
                name: name.trim(),
                description,
                category,
                photoUrl: photo.url,
                photoThumbUrl: photo.thumbUrl,
                allergens,
                dietTags,
                // un blocco aperto e lasciato senza lingua non è una traduzione
                translations: translations
                  .filter((t) => t.language !== '')
                  .map((t) => ({ ...t, name: t.name.trim() })),
              });
            }}
            // Salvare mentre la foto sta salendo la lascerebbe fuori dal
            // piatto: è l'unico campo che non è già pronto quando lo si guarda
            disabled={name.trim() === '' || uploading}
            className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-700 disabled:opacity-40"
          >
            {d.common.save}
          </button>
        </div>
      </div>
    </div>
  );
}
