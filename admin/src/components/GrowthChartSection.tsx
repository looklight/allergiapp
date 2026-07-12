'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts';
import { supabase } from '@/lib/supabase';
import { fetchAllPages } from '@/lib/fetchAllPages';

type Granularity = 'month' | 'week';

// Terna categorica validata (CVD ΔE min 21.6 su bianco); l'ordine dei colori
// è parte della garanzia daltonismo, non cambiarlo. Aqua/giallo sono sotto
// 3:1 di contrasto → obbligo di etichette dirette a fine linea (relief rule).
const SERIES = [
  { key: 'Utenti', table: 'profiles', color: '#2a78d6' },
  { key: 'Ristoranti', table: 'restaurants', color: '#1baf7a' },
  { key: 'Recensioni', table: 'reviews', color: '#eda100' },
] as const;

// Le curve sono "righe attuali per data di creazione": le cancellazioni
// spariscono retroattivamente. Trend, non registro contabile.
async function loadCreationDates(table: string): Promise<number[]> {
  const rows = await fetchAllPages<{ created_at: string }>((from, to) =>
    supabase.from(table).select('created_at').order('created_at').range(from, to),
  );
  return rows.map((r) => new Date(r.created_at).getTime());
}

/** Fine dei bucket (ms) dal mese/settimana della prima data fino a oggi. */
function buildBucketEnds(minTs: number, granularity: Granularity): Date[] {
  const ends: Date[] = [];
  const now = new Date();
  const cursor = new Date(minTs);
  if (granularity === 'month') {
    cursor.setDate(1);
    cursor.setHours(0, 0, 0, 0);
    while (cursor <= now) {
      cursor.setMonth(cursor.getMonth() + 1);
      ends.push(new Date(Math.min(cursor.getTime() - 1, now.getTime())));
    }
  } else {
    // Settimane lun-dom
    cursor.setHours(0, 0, 0, 0);
    cursor.setDate(cursor.getDate() - ((cursor.getDay() + 6) % 7));
    while (cursor <= now) {
      cursor.setDate(cursor.getDate() + 7);
      ends.push(new Date(Math.min(cursor.getTime() - 1, now.getTime())));
    }
  }
  return ends;
}

/** Conteggio cumulativo a ogni fine-bucket (dates già ordinate). */
function cumulativeAt(dates: number[], bucketEnds: Date[]): number[] {
  let i = 0;
  return bucketEnds.map((end) => {
    while (i < dates.length && dates[i] <= end.getTime()) i++;
    return i;
  });
}

function bucketLabel(d: Date, granularity: Granularity): string {
  return granularity === 'month'
    ? d.toLocaleDateString('it-IT', { month: 'short', year: '2-digit' })
    : d.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });
}

export default function GrowthChartSection() {
  const [granularity, setGranularity] = useState<Granularity>('month');
  const [dates, setDates] = useState<number[][] | null>(null);

  useEffect(() => {
    Promise.all(SERIES.map((s) => loadCreationDates(s.table))).then(setDates);
  }, []);

  const data = useMemo(() => {
    if (!dates) return [];
    const minTs = Math.min(...dates.map((d) => d[0] ?? Date.now()));
    const ends = buildBucketEnds(minTs, granularity);
    const cumulative = dates.map((d) => cumulativeAt(d, ends));
    return ends.map((end, i) => ({
      label: bucketLabel(end, granularity),
      ...Object.fromEntries(SERIES.map((s, si) => [s.key, cumulative[si][i]])),
    }));
  }, [dates, granularity]);

  // Etichetta diretta a fine linea (ink testuale, non colore serie)
  const endLabel = (name: string) => (props: { x?: number | string; y?: number | string; index?: number }) => {
    if (props.index !== data.length - 1) return <g />;
    return (
      <text x={Number(props.x) + 8} y={Number(props.y)} fontSize={12} fontWeight={600} className="fill-gray-700" dominantBaseline="middle">
        {name}
      </text>
    );
  };

  return (
    <div className="bg-card rounded-lg shadow p-4 mt-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold">Crescita</h2>
        <div className="flex gap-1">
          {(['month', 'week'] as const).map((g) => (
            <button
              key={g}
              onClick={() => setGranularity(g)}
              className={`px-2.5 py-1 rounded text-xs transition-colors ${
                granularity === g ? 'bg-selected text-selected-foreground' : 'bg-muted text-foreground-secondary hover:bg-muted-hover'
              }`}
            >
              {g === 'month' ? 'Mese' : 'Settimana'}
            </button>
          ))}
        </div>
      </div>
      {!dates ? (
        <p className="text-sm text-faint">Caricamento...</p>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data} margin={{ top: 8, right: 96, bottom: 0, left: 0 }}>
            <CartesianGrid stroke="var(--border)" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }} tickLine={false} axisLine={{ stroke: 'var(--border)' }} interval="preserveStartEnd" />
            <YAxis tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }} tickLine={false} axisLine={false} width={44} />
            <Tooltip
              contentStyle={{ borderRadius: 8, border: '1px solid var(--border)', fontSize: 12 }}
              labelStyle={{ fontWeight: 600 }}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} iconType="plainline" />
            {SERIES.map((s) => (
              <Line
                key={s.key}
                type="monotone"
                dataKey={s.key}
                stroke={s.color}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
                label={endLabel(s.key)}
                isAnimationActive={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
