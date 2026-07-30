'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts';
import { supabase } from '@/lib/supabase';
import InfoHint from '@/components/InfoHint';

const INFO = "Aperture della card allergeni per giorno. Contatore anonimo: conta tutte le aperture di tutti gli utenti, anche senza consenso analytics (nessun dato personale, quindi niente utenti unici). Il conteggio parte dal giorno di attivazione del contatore, senza retroattivo; l'uso offline della card non viene registrato.";

// Stesso colore della linea 'Reali' nel grafico Utenti attivi: in dashboard
// identifica i contatori anonimi (mig 082).
const COLOR = '#e34948';

type Range = 7 | 30 | 90;

const RANGES: { key: Range; label: string }[] = [
  { key: 7, label: '7g' },
  { key: 30, label: '30g' },
  { key: 90, label: '90g' },
];

interface CounterRow {
  day: string; // date (YYYY-MM-DD) dal Postgres
  count: number;
}

// Riempie i giorni senza aperture con 0, dal giorno di attivazione del
// contatore in poi (prima non esiste il dato: la finestra parte lì).
function fillDays(rows: CounterRow[], days: number) {
  const byDay = new Map(rows.map((r) => [r.day, r.count]));
  const out: { label: string; count: number }[] = [];
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);
  cursor.setDate(cursor.getDate() - (days - 1));
  for (let i = 0; i < days; i++) {
    const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}-${String(cursor.getDate()).padStart(2, '0')}`;
    out.push({
      label: cursor.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' }),
      count: byDay.get(key) ?? 0,
    });
    cursor.setDate(cursor.getDate() + 1);
  }
  return out;
}

interface TooltipEntry { value?: number }
function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: TooltipEntry[]; label?: string }) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 10px', fontSize: 12, color: 'var(--foreground)' }}>
      <p style={{ fontWeight: 600, marginBottom: 4 }}>{label}</p>
      <p>Aperture: {payload[0].value}</p>
    </div>
  );
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

export default function CardOpensSection() {
  const [range, setRange] = useState<Range>(30);
  const [rows, setRows] = useState<CounterRow[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    setRows(null);
    // Chiamata raw, errore ignorato di proposito (come la linea 'Reali' in
    // DailyActiveUsersSection): senza dati la sezione mostra l'empty state.
    supabase
      .rpc('get_daily_counters', { p_name: 'card_opened', p_days: range })
      .then(({ data }) => {
        if (!cancelled) setRows((data as CounterRow[]) ?? []);
      });
    return () => { cancelled = true; };
  }, [range]);

  const data = useMemo(() => (rows && rows.length > 0 ? fillDays(rows, range) : []), [rows, range]);
  const periodTotal = useMemo(() => (rows ?? []).reduce((s, r) => s + r.count, 0), [rows]);

  return (
    <div className="bg-card rounded-lg shadow p-4 mt-6">
      <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="flex items-center gap-1.5">
            <h2 className="font-semibold">Card allergeni</h2>
            <InfoHint text={INFO} />
          </span>
          {rows !== null && rows.length > 0 && (
            <span className="text-sm text-muted-foreground">
              · <span className="font-semibold text-foreground">{periodTotal}</span> aperture nel periodo
            </span>
          )}
        </div>
        <div className="flex gap-1">
          {RANGES.map((r) => (
            <Chip key={r.key} active={range === r.key} onClick={() => setRange(r.key)}>{r.label}</Chip>
          ))}
        </div>
      </div>

      {rows === null ? (
        <div className="flex items-center justify-center" style={{ height: 200 }}>
          <p className="text-sm text-faint">Caricamento...</p>
        </div>
      ) : rows.length === 0 ? (
        <div className="flex items-center justify-center" style={{ height: 200 }}>
          <p className="text-sm text-faint">Ancora nessun dato in questo periodo.</p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
            <CartesianGrid stroke="var(--border)" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }} tickLine={false} axisLine={{ stroke: 'var(--border)' }} interval="preserveStartEnd" minTickGap={24} />
            <YAxis tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }} tickLine={false} axisLine={false} width={44} allowDecimals={false} />
            <Tooltip cursor={{ fill: 'var(--muted)' }} content={<ChartTooltip />} />
            <Bar dataKey="count" name="Aperture" fill={COLOR} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
