'use client';

// Maschera di creazione: si dà un nome alla vetrina e si vede in tre passi
// cosa ci si fa dentro. I tre esempi sono gli elementi veri dell'editor e
// della scheda (pill dei link, riga piatto con allergeni), non disegni.
import { useId, useState } from 'react';
import { useI18n } from '@/lib/i18n';
import { useModal } from '@/lib/useModal';
import { allergenName } from '@/lib/allergens';
import { LINK_ORDER, type LinkKind } from '@/lib/linkKinds';
import LinkPill from '@/components/LinkPill';

// Allergeni dei piatti di esempio, nell'ordine di newShowcase.sampleDishes
const SAMPLE_ALLERGENS = [['gluten', 'eggs'], ['crustaceans'], ['milk', 'eggs']];

function Step({
  n,
  title,
  children,
}: {
  n: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-2.5">
      <span className="mt-px flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-gray-300 text-[11px] font-medium text-gray-500">
        {n}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] text-gray-600">{title}</p>
        <div className="mt-1.5">{children}</div>
      </div>
    </div>
  );
}

export default function NewShowcaseDialog({
  onCancel,
  onCreate,
}: {
  onCancel: () => void;
  onCreate: (venueName: string) => void;
}) {
  const { d, locale } = useI18n();
  const [name, setName] = useState('');

  const panel = useModal<HTMLDivElement>(onCancel);
  const titleId = useId();

  // nello schema a sinistra c'è la vetrina: senza nome lo dice, non finge un locale
  const showcaseLabel = name.trim() || d.newShowcase.yourShowcase;
  const LINK_LABELS: Record<LinkKind, string> = {
    booking: d.editor.linkBooking,
    delivery: d.editor.linkDelivery,
    menu: d.editor.linkMenu,
    website: d.editor.linkWebsite,
  };

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
          {d.newShowcase.title}
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
        <p className="mt-1.5 text-xs text-gray-500">{d.newShowcase.nameHint}</p>

        <div className="mt-6 border-t border-gray-200 pt-4">
          <p className="mb-3 text-xs font-medium uppercase tracking-wide text-gray-400">
            {d.newShowcase.how}
          </p>
          <div className="divide-y divide-gray-100">
            <div className="pb-4">
              <Step n={1} title={d.newShowcase.step1}>
                <div className="space-y-1.5">
                  <div className="flex flex-nowrap gap-1 overflow-hidden">
                    {LINK_ORDER.map((kind) => (
                      <LinkPill key={kind} kind={kind} label={LINK_LABELS[kind]} active compact />
                    ))}
                  </div>
                  {/* Stessa forma del carosello piatti nella scheda: foto tonde
                      affiancate col nome sotto. Qui il segnaposto senza foto,
                      con un allergene per piatto a dire cosa si dichiara. */}
                  <div className="flex gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2.5">
                    {SAMPLE_ALLERGENS.map((codes, i) => (
                      <div key={codes[0]} className="min-w-0 flex-1 text-center">
                        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-stone-100">
                          <svg className="h-5 w-5 text-stone-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                            {/* coltello e forchetta */}
                            <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 002-2V2M7 2v20" />
                            <path d="M21 15V2a5 5 0 00-5 5v6c0 1.1.9 2 2 2h3zm0 0v7" />
                          </svg>
                        </span>
                        <p className="mt-1.5 line-clamp-2 text-[10px] leading-[13px] text-gray-700">
                          {d.newShowcase.sampleDishes[i]}
                        </p>
                        <div className="mt-1 flex flex-wrap justify-center gap-1">
                          {codes.map((code) => (
                            <span
                              key={code}
                              className="rounded-full bg-[#FFF8E1] px-1.5 py-px text-[9px] font-medium text-[#8D6E00]"
                            >
                              {allergenName(code, locale)}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </Step>
            </div>

            <div className="pt-4">
              <Step n={2} title={d.newShowcase.step2}>
                <div className="flex items-center gap-2">
                  <div className="flex min-w-0 flex-1 items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2.5 py-2">
                    <svg className="h-4 w-4 shrink-0 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 9l1.5-5h15L21 9" />
                      <path d="M3 9a3 3 0 006 0 3 3 0 006 0 3 3 0 006 0" />
                      <path d="M4.5 11.5V20h15v-8.5" />
                    </svg>
                    <span className="min-w-0 flex-1 truncate text-[12px] text-gray-700">{showcaseLabel}</span>
                  </div>
                  <svg className="h-4 w-4 shrink-0 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 12h15M13 6l6 6-6 6" />
                  </svg>
                  <div className="flex min-w-0 flex-1 items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2.5 py-2">
                    <svg className="h-4 w-4 shrink-0 text-[#4CAF50]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 21s-7-5.5-7-11a7 7 0 1114 0c0 5.5-7 11-7 11z" />
                      <circle cx="12" cy="10" r="2.5" />
                    </svg>
                    <span className="min-w-0 flex-1 truncate text-[12px] text-gray-700">
                      {d.newShowcase.venueOnApp}
                    </span>
                  </div>
                </div>
              </Step>
            </div>
          </div>
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
