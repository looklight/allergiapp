'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { labelNeed, labelLanguage } from '@/lib/dietaryLabels';
import InfoHint from '@/components/InfoHint';

const INFO = "Con quali esigenze e in quale lingua vengono usate le card (contatori anonimi, migration 086). Nessun dato personale: si contano le presenze, non le persone, e non si sa chi. Un'esigenza per riga, mai la combinazione — un insieme raro identificherebbe una persona sola. La somma delle esigenze supera il numero di aperture perché ognuno ne ha diverse: la percentuale è sulle aperture, non sugli utenti. Nessun retroattivo, e la card usata offline non viene contata.";

type Range = 7 | 30 | 90;

const RANGES: { key: Range; label: string }[] = [
  { key: 7, label: '7g' },
  { key: 30, label: '30g' },
  { key: 90, label: '90g' },
];

interface DimensionRow {
  key: string;
  count: number;
}

interface CounterRow {
  day: string;
  count: number;
}

// Chip locale come nelle sezioni sorelle (CardOpens, GrowthChart,
// DailyActiveUsers): la convenzione qui è una copia per widget.
function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-2.5 py-1 rounded text-xs transition-colors ${
        active ? 'bg-selected text-selected-foreground' : 'bg-muted text-foreground-secondary hover:bg-muted-hover'
      }`}
    >
      {children}
    </button>
  );
}

function RankTable({
  title,
  rows,
  total,
  label,
  headers,
}: {
  title: string;
  rows: DimensionRow[];
  total: number;
  label: (code: string) => string;
  headers: [string, string];
}) {
  return (
    <div>
      <h3 className="text-sm font-semibold mb-2">{title}</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-faint uppercase">
              <th className="py-1 font-normal">{headers[0]}</th>
              <th className="py-1 font-normal text-right">{headers[1]}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.key} className="border-b last:border-0">
                <td className="py-2 pr-3 truncate max-w-0 w-full">{label(r.key)}</td>
                <td className="py-2 text-right font-medium whitespace-nowrap">
                  {r.count}
                  {total > 0 && (
                    <span className="text-faint font-normal"> · {Math.round((r.count / total) * 100)}%</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function CardNeedsSection() {
  const [range, setRange] = useState<Range>(30);
  const [needs, setNeeds] = useState<DimensionRow[] | null>(null);
  const [languages, setLanguages] = useState<DimensionRow[] | null>(null);
  const [opens, setOpens] = useState<CounterRow[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    setNeeds(null);
    setLanguages(null);
    setOpens(null);
    // Errori ignorati di proposito, come nelle sezioni sorelle: finché la build
    // con la 086 non è in circolazione le RPC rispondono vuote, e la sezione
    // mostra l'empty state invece di un errore.
    Promise.all([
      supabase.rpc('get_daily_dimensions', { p_name: 'card_need', p_days: range, p_limit: 20 }),
      supabase.rpc('get_daily_dimensions', { p_name: 'card_language', p_days: range, p_limit: 20 }),
      supabase.rpc('get_daily_counters', { p_name: 'card_opened', p_days: range }),
    ]).then(([n, l, o]) => {
      if (cancelled) return;
      setNeeds((n.data as DimensionRow[]) ?? []);
      setLanguages((l.data as DimensionRow[]) ?? []);
      setOpens((o.data as CounterRow[]) ?? []);
    });
    return () => { cancelled = true; };
  }, [range]);

  // Denominatore delle percentuali: le aperture di card del periodo, non gli
  // utenti (che il contatore anonimo non conosce).
  const openTotal = useMemo(() => (opens ?? []).reduce((s, r) => s + r.count, 0), [opens]);

  const loading = needs === null || languages === null || opens === null;
  const empty = !loading && needs.length === 0 && languages.length === 0;

  return (
    <div className="bg-card rounded-lg shadow p-4 mt-6">
      <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="flex items-center gap-1.5">
            <h2 className="font-semibold">Esigenze e lingue delle card</h2>
            <InfoHint text={INFO} />
          </span>
          {!loading && openTotal > 0 && (
            <span className="text-sm text-muted-foreground">
              · su <span className="font-semibold text-foreground">{openTotal}</span> aperture nel periodo
            </span>
          )}
        </div>
        <div className="flex gap-1">
          {RANGES.map((r) => (
            <Chip key={r.key} active={range === r.key} onClick={() => setRange(r.key)}>{r.label}</Chip>
          ))}
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-faint">Caricamento...</p>
      ) : empty ? (
        <p className="text-sm text-faint">
          Nessun dato: i contatori partono dalla prima build che include la migration 086.
          Fino ad allora la sezione resta vuota, non è un errore.
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <RankTable
            title="Esigenze sulle card"
            rows={needs}
            total={openTotal}
            label={labelNeed}
            headers={['Esigenza', 'Presenze']}
          />
          <RankTable
            title="Lingue della card"
            rows={languages}
            total={openTotal}
            label={labelLanguage}
            headers={['Lingua', 'Aperture']}
          />
        </div>
      )}
    </div>
  );
}
