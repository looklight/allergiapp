'use client';

// Le lingue in cui il partner vuole scrivere il suo menù. Si scelgono una
// volta e poi i campi compaiono da soli nella maschera di ogni piatto:
// senza questo passaggio bisognerebbe ripescare la lingua piatto per piatto.
// Toglierne una NON cancella quello che è già stato scritto: i campi
// spariscono dalla maschera, ma se la lingua torna il lavoro è ancora lì.
import { useId } from 'react';
import { useI18n } from '@/lib/i18n';
import { useModal } from '@/lib/useModal';
import { MENU_LANGUAGES } from '@/lib/languages';

export default function DishLanguagesDialog({
  languages,
  onToggle,
  onClose,
}: {
  languages: string[];
  onToggle: (code: string, on: boolean) => void;
  onClose: () => void;
}) {
  const { d } = useI18n();
  const panel = useModal<HTMLDivElement>(onClose);
  const titleId = useId();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="backdrop-enter absolute inset-0 bg-black/40" />
      <div
        ref={panel}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="dialog-enter relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6 shadow-xl outline-none"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id={titleId} className="text-lg font-semibold text-gray-900">
          {d.dishes.languagesTitle}
        </h2>
        <p className="mt-1 text-sm text-gray-600">{d.dishes.languagesHint}</p>

        <div className="mt-4 flex flex-wrap gap-1.5">
          {MENU_LANGUAGES.map((lang) => {
            const selected = languages.includes(lang.code);
            return (
              <button
                key={lang.code}
                onClick={() => onToggle(lang.code, !selected)}
                aria-pressed={selected}
                className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                  selected
                    ? 'border-gray-900 bg-gray-900 text-white'
                    : 'border-gray-300 bg-white text-gray-600 hover:border-gray-400'
                }`}
              >
                {lang.native}
              </button>
            );
          })}
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-700"
          >
            {d.common.close}
          </button>
        </div>
      </div>
    </div>
  );
}
