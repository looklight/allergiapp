'use client';

// Il pannello che entra da destra col piatto da creare o correggere. Tiene
// anche la scelta delle vetrine, che si applica solo al salvataggio: chiudere
// senza salvare non deve lasciare in giro un piatto acceso a metà.
import { useId, useState } from 'react';
import { useI18n } from '@/lib/i18n';
import { useModal } from '@/lib/useModal';
import type { Dish } from '@/lib/dishes';
import type { Showcase } from '@/lib/showcases';
import DishForm from './DishForm';

export default function DishPanel({
  dish,
  showcases,
  initialShowcaseIds,
  onSave,
  onClose,
}: {
  // assente = piatto nuovo
  dish?: Dish;
  // tutte le vetrine del partner, accese o no
  showcases: Showcase[];
  initialShowcaseIds: string[];
  onSave: (data: Omit<Dish, 'id'>, showcaseIds: string[]) => void;
  onClose: () => void;
}) {
  const { d } = useI18n();
  const [inShowcases, setInShowcases] = useState<string[]>(initialShowcaseIds);
  const panel = useModal<HTMLDivElement>(onClose);
  const titleId = useId();

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onClick={onClose}>
      <div
        ref={panel}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="h-full w-full max-w-[43rem] overflow-y-auto bg-white p-5 shadow-xl outline-none md:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 id={titleId} className="text-lg font-semibold text-gray-900">
            {dish ? d.dishes.editTitle : d.dishes.newTitle}
          </h2>
          <button
            onClick={onClose}
            aria-label={d.common.close}
            className="text-gray-400 transition-colors hover:text-gray-900"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        <DishForm initial={dish} onSave={(data) => onSave(data, inShowcases)} onCancel={onClose}>
          {/* Dove appare il piatto: stesso stato del toggle sulla vetrina */}
          <div className="border-t border-gray-200 pt-3">
            <label className="mb-1 block text-sm font-medium text-gray-700">
              {d.dishes.showcasesLabel}
            </label>
            {showcases.length === 0 ? (
              <p className="text-xs text-gray-500">{d.dishes.noShowcases}</p>
            ) : (
              <>
                <p className="mb-2 text-xs text-gray-500">{d.dishes.showcasesHint}</p>
                <div className="space-y-1.5">
                  {showcases.map((s) => (
                    <label key={s.id} className="flex items-center gap-2 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={inShowcases.includes(s.id)}
                        onChange={(e) =>
                          setInShowcases((prev) =>
                            e.target.checked ? [...prev, s.id] : prev.filter((id) => id !== s.id)
                          )
                        }
                        className="h-4 w-4 rounded border-gray-300 accent-[#4CAF50]"
                      />
                      <span className="truncate">{s.venueName.trim() || d.home.unnamed}</span>
                    </label>
                  ))}
                </div>
              </>
            )}
          </div>
        </DishForm>
      </div>
    </div>
  );
}
