'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts';
import { supabase } from '@/lib/supabase';
import { fetchAllPages } from '@/lib/fetchAllPages';

type Range = '1m' | '3m' | '1y' | 'all';
type Mode = 'cumulative' | 'incremental';
type Granularity = 'day' | 'week' | 'month';

const RANGES: { key: Range; label: string }[] = [
  { key: '1m', label: '1M' },
  { key: '3m', label: '3M' },
  { key: '1y', label: '1A' },
  { key: 'all', label: 'Tutto' },
];

// Granularità implicita nella finestra (come le app di finanza): niente
// scelta manuale, la pendenza resta leggibile a ogni soglia.
const GRANULARITY: Record<Range, Granularity> = { '1m': 'day', '3m': 'week', '1y': 'month', all: 'month' };

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

function rangeStart(range: Range, minTs: number): number {
  if (range === 'all') return minTs;
  const d = new Date();
  if (range === '1m') d.setMonth(d.getMonth() - 1);
  if (range === '3m') d.setMonth(d.getMonth() - 3);
  if (range === '1y') d.setFullYear(d.getFullYear() - 1);
  return Math.max(d.getTime(), minTs);
}

/** Fine dei bucket (ms) dall'inizio finestra fino a oggi, allineati al calendario. */
function buildBucketEnds(startTs: number, granularity: Granularity): Date[] {
  const ends: Date[] = [];
  const now = new Date();
  const cursor = new Date(startTs);
  cursor.setHours(0, 0, 0, 0);
  if (granularity === 'month') cursor.setDate(1);
  if (granularity === 'week') cursor.setDate(cursor.getDate() - ((cursor.getDay() + 6) % 7)); // lun-dom
  while (cursor <= now) {
    if (granularity === 'month') cursor.setMonth(cursor.getMonth() + 1);
    else cursor.setDate(cursor.getDate() + (granularity === 'week' ? 7 : 1));
    ends.push(new Date(Math.min(cursor.getTime() - 1, now.getTime())));
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

export default function GrowthChartSection() {
  const [range, setRange] = useState<Range>('all');
  const [mode, setMode] = useState<Mode>('cumulative');
  const [dates, setDates] = useState<number[][] | null>(null);

  useEffect(() => {
    Promise.all(SERIES.map((s) => loadCreationDates(s.table))).then(setDates);
  }, []);

  const data = useMemo(() => {
    if (!dates) return [];
    const granularity = GRANULARITY[range];
    const minTs = Math.min(...dates.map((d) => d[0] ?? Date.now()));
    const start = rangeStart(range, minTs);
    const ends = buildBucketEnds(start, granularity);
    if (ends.length === 0) return [];
    const cumulative = dates.map((d) => cumulativeAt(d, ends));
    // Base della finestra: quanti esistevano già prima del primo bucket
    // (serve per il primo valore incrementale)
    const base = dates.map((d) => {
      let i = 0;
      while (i < d.length && d[i] < start) i++;
      return i;
    });
    return ends.map((end, i) => ({
      label: bucketLabel(end, granularity),
      ...Object.fromEntries(SERIES.map((s, si) => [
        s.key,
        mode === 'cumulative'
          ? cumulative[si][i]
          : cumulative[si][i] - (i === 0 ? base[si] : cumulative[si][i - 1]),
      ])),
    }));
  }, [dates, range, mode]);

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
      <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
        <h2 className="font-semibold">Crescita</h2>
        <div className="flex items-center gap-3">
          <div className="flex gap-1">
            <Chip active={mode === 'cumulative'} onClick={() => setMode('cumulative')}>Cumulato</Chip>
            <Chip active={mode === 'incremental'} onClick={() => setMode('incremental')}>Nuovi</Chip>
          </div>
          <div className="w-px h-4 bg-border" />
          <div className="flex gap-1">
            {RANGES.map((r) => (
              <Chip key={r.key} active={range === r.key} onClick={() => setRange(r.key)}>{r.label}</Chip>
            ))}
          </div>
        </div>
      </div>
      {!dates ? (
        <p className="text-sm text-faint">Caricamento...</p>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data} margin={{ top: 8, right: 96, bottom: 0, left: 0 }}>
            <CartesianGrid stroke="var(--border)" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }} tickLine={false} axisLine={{ stroke: 'var(--border)' }} interval="preserveStartEnd" minTickGap={24} />
            <YAxis tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }} tickLine={false} axisLine={false} width={44} allowDecimals={false} />
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
