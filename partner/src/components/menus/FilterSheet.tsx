'use client';

// Il pannello "Filtri" del menù al tavolo: tutte le pastiglie che questo menù
// offre, in chiaro, invece della fila che scorre.
//
// La fila in cima resta la strada corta — le prime della graduatoria si
// toccano senza aprire niente — e questo è il posto dove si vede l'elenco
// intero. Qui c'è spazio, e QUI la separazione fra esigenze e allergeni serve
// davvero: nella fila sarebbe stata una barriera in mezzo a sette pastiglie,
// in un elenco è quello che permette di scorrerlo a colpo d'occhio.
//
// Stesse regole di casa del foglio di dettaglio: absolute e non fixed, perché
// deve coprire solo lo schermo simulato del cliente e non la pagina del
// portale; useEscape e non useModal, perché dentro l'anteprima a telefono
// questo è una finestra dentro un'altra e un Esc le chiuderebbe entrambe.
import { useI18n } from '@/lib/i18n';
import { useEscape } from '@/lib/useModal';
import { filterLabel, inOrdine, type FilterKind, type FilterPill } from '@/lib/menuFilters';

export default function FilterSheet({
  available,
  selected,
  accent,
  onToggle,
  onReset,
  onClose,
}: {
  available: FilterPill[];
  selected: FilterPill[];
  accent: string;
  onToggle: (kind: FilterKind, code: string) => void;
  onReset: () => void;
  onClose: () => void;
}) {
  const { d, locale } = useI18n();
  useEscape(onClose);

  const acceso = (pill: FilterPill) =>
    selected.some((s) => s.kind === pill.kind && s.code === pill.code);
  // Le esigenze prima degli allergeni: sono poche e dicono una cosa
  // diversa ("adatto a") da tutte le altre, che dicono "senza".
  const gruppi: { kind: FilterKind; title: string }[] = [
    { kind: 'diets', title: d.menuPublic.filterDiets },
    { kind: 'allergens', title: d.menuPublic.filterAllergens },
  ];

  return (
    <div className="absolute inset-0 z-20 flex flex-col justify-end bg-black/40" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={d.menuPublic.filterTitle}
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[88%] flex-col rounded-t-2xl bg-white"
      >
        <div className="shrink-0 px-4 pb-2 pt-3">
          <div className="flex items-baseline justify-between gap-2">
            <h3 className="text-sm font-semibold text-gray-900">{d.menuPublic.filterTitle}</h3>
            {/* "Azzera" solo quando c'è qualcosa da azzerare: un comando
                spento in cima a un pannello appena aperto è rumore */}
            {selected.length > 0 && (
              <button
                onClick={onReset}
                className="text-xs font-medium text-gray-500 underline transition-colors hover:text-gray-900"
              >
                {d.menuPublic.filterReset}
              </button>
            )}
          </div>
          <p className="mt-0.5 text-[11px] leading-snug text-gray-500">{d.menuPublic.filterSheetHint}</p>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-3">
          {gruppi.map((gruppo) => {
            const pastiglie = inOrdine(available.filter((p) => p.kind === gruppo.kind));
            if (pastiglie.length === 0) return null;
            return (
              <div key={gruppo.kind} className="mb-3 last:mb-0">
                <p className="text-[10px] font-medium uppercase tracking-wide text-gray-400">
                  {gruppo.title}
                </p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {pastiglie.map((pill) => {
                    const on = acceso(pill);
                    return (
                      <button
                        key={`${pill.kind}-${pill.code}`}
                        onClick={() => onToggle(pill.kind, pill.code)}
                        aria-pressed={on}
                        className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors ${
                          on ? 'text-white' : 'border-gray-300 bg-white text-gray-600'
                        }`}
                        style={on ? { backgroundColor: accent, borderColor: accent } : undefined}
                      >
                        {filterLabel(pill, locale, d.preview.withoutPrefix)}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Un bottone di chiusura vero, in fondo e a tutta larghezza: il menù
            dietro si è già riordinato a ogni tocco, quindi qui non c'è niente
            da confermare — c'è solo da tornare a leggere. */}
        <div className="shrink-0 border-t border-gray-100 p-3">
          <button
            onClick={onClose}
            className="w-full rounded-xl py-2.5 text-sm font-semibold text-white"
            style={{ backgroundColor: accent }}
          >
            {d.menuPublic.filterDone}
          </button>
        </div>
      </div>
    </div>
  );
}
