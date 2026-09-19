'use client';

// Maschera di creazione: si dà un nome al locale e sotto si ricorda cosa ci
// si fa dentro. Il nome NON è un'etichetta privata — è quello che i clienti
// leggono in cima al menù al tavolo (Tema 16).
//
// Fino al 19/09 qui c'era uno schema in due passi che spiegava solo la scheda
// AllergiApp. Ora il promemoria delle DUE cose, menù al tavolo prima
// (VenuePaths, versione compatta): quella grande è l'onboarding della home
// vuota, che il primo locale ha appena visto.
import { useId, useState } from 'react';
import { useI18n } from '@/lib/i18n';
import { useModal } from '@/lib/useModal';
import VenuePaths from '@/components/VenuePaths';

export default function NewVenueDialog({
  onCancel,
  onCreate,
}: {
  onCancel: () => void;
  onCreate: (venueName: string) => void;
}) {
  const { d } = useI18n();
  const [name, setName] = useState('');

  const panel = useModal<HTMLDivElement>(onCancel);
  const titleId = useId();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onCancel}
    >
      <div className="backdrop-enter absolute inset-0 bg-black/40" />
      <div
        ref={panel}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="dialog-enter relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl outline-none"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id={titleId} className="mb-4 text-lg font-semibold text-gray-900">
          {d.newVenue.title}
        </h2>

        <label className="mb-1 block text-sm font-medium text-gray-700">
          {d.editor.venueNameLabel}
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onCreate(name.trim());
          }}
          placeholder={d.editor.venueNamePlaceholder}
          className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-gray-900 focus:outline-none"
        />
        <p className="mt-1.5 text-xs text-gray-500">{d.newVenue.nameHint}</p>

        <div className="mt-6 border-t border-gray-200 pt-4">
          <p className="mb-3 text-xs font-medium uppercase tracking-wide text-gray-400">
            {d.paths.label}
          </p>
          <VenuePaths size="compact" />
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:text-gray-900"
          >
            {d.common.cancel}
          </button>
          <button
            onClick={() => onCreate(name.trim())}
            className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-700"
          >
            {d.home.create}
          </button>
        </div>
      </div>
    </div>
  );
}
