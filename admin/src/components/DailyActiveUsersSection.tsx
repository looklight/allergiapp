'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts';
import { supabase } from '@/lib/supabase';
import { safeQuery } from '@/lib/safeQuery';
import InfoHint from '@/components/InfoHint';

const INFO = "Utenti unici che ogni giorno fanno un'azione nell'app (accesso, ricerca, recensione…). Split: nuovi (prima volta) vs di ritorno. Conta solo chi ha dato il consenso analytics.";

type Range = 7 | 30 | 90;

const RANGES: { key: Range; label: string }[] = [
  { key: 7, label: '7g' },
  { key: 30, label: '30g' },
  { key: 90, label: '90g' },
];

// Barre impilate: nuovi (verde, crescita) sotto, di ritorno (blu, retention) sopra.
// Colori dalla terna categorica già validata in GrowthChartSection.
const SERIES = [
  { key: 'new_users', label: 'Nuovi', color: '#008300' },
  { key: 'returning_users', label: 'Di ritorno', color: '#2a78d6' },
] as const;

interface DayRow {
  day: string; // date (YYYY-MM-DD) dal Postgres
  active_users: number;
  new_users: number;
  returning_users: number;
}

interface Stats {
  period_active: number;
  period_events: number;
  wau: number;
  mau: number;
  avg_dau: number | null;
}

// Riempie i giorni senza attività con 0, così le barre mostrano i vuoti reali.
// La finestra è "ultimi `days` giorni" fino a oggi, calendario locale del browser
// (dashboard IT → coincide con Europe/Rome usato lato SQL).
function fillDays(rows: DayRow[], days: number) {
  const byDay = new Map(rows.map((r) => [r.day, r]));
  const out: { label: string; new_users: number; returning_users: number }[] = [];
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);
  cursor.setDate(cursor.getDate() - (days - 1));
  for (let i = 0; i < days; i++) {
    const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}-${String(cursor.getDate()).padStart(2, '0')}`;
    const r = byDay.get(key);
    out.push({
      label: cursor.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' }),
      new_users: r?.new_users ?? 0,
      returning_users: r?.returning_users ?? 0,
    });
    cursor.setDate(cursor.getDate() + 1);
  }
  return out;
}

// Tooltip custom: mostra lo split nuovi/ritorno + la riga Totale (= attivi del giorno).
interface TooltipEntry { name?: string; value?: number; color?: string; dataKey?: string | number }
function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: TooltipEntry[]; label?: string }) {
  if (!active || !payload || payload.length === 0) return null;
  const total = payload.reduce((s, p) => s + (p.value ?? 0), 0);
  return (
    <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 10px', fontSize: 12, color: 'var(--foreground)' }}>
      <p style={{ fontWeight: 600, marginBottom: 4 }}>{label}</p>
      {payload.map((p) => (
        <p key={String(p.dataKey)} style={{ color: p.color }}>{p.name}: {p.value}</p>
      ))}
      <p style={{ fontWeight: 600, marginTop: 4, paddingTop: 4, borderTop: '1px solid var(--border)' }}>
        Totale: {total}
      </p>
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

function MiniStat({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <span
        className="text-xs text-faint uppercase tracking-wide cursor-help decoration-dotted underline underline-offset-2"
        title={hint}
      >
        {label}
      </span>
      <span className="text-sm font-semibold text-foreground">{value}</span>
    </div>
  );
}

export default function DailyActiveUsersSection() {
  const [range, setRange] = useState<Range>(30);
  const [rows, setRows] = useState<DayRow[] | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    let cancelled = false;
    setRows(null);
    setStats(null);
    async function load() {
      const [daily, agg] = await Promise.all([
        safeQuery(() => supabase.rpc('get_daily_active_users', { p_days: range }), 'Utenti attivi/giorno'),
        safeQuery(() => supabase.rpc('get_active_users_stats', { p_days: range }), 'Statistiche utenti attivi'),
      ]);
      if (cancelled) return;
      setRows((daily as DayRow[]) ?? []);
      // La RPC stats ritorna una sola riga (o zero se non-admin)
      setStats(((agg as Stats[])?.[0]) ?? null);
    }
    load();
    return () => { cancelled = true; };
  }, [range]);

  const data = useMemo(() => (rows ? fillDays(rows, range) : []), [rows, range]);

  const actionsPerUser = stats && stats.period_active > 0
    ? (stats.period_events / stats.period_active).toFixed(1)
    : '—';
  const stickiness = stats && stats.avg_dau != null && stats.mau > 0
    ? `${Math.round((stats.avg_dau / stats.mau) * 100)}%`
    : '—';

  return (
    <div className="bg-card rounded-lg shadow p-4 mt-6">
      <div className="flex items-center justify-between gap-3 mb-1 flex-wrap">
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="flex items-center gap-1.5">
            <h2 className="font-semibold">Utenti attivi</h2>
            <InfoHint text={INFO} />
          </span>
          {stats && (
            <span className="text-sm text-muted-foreground">
              · <span className="font-semibold text-foreground">{stats.period_active}</span>{' '}
              <span
                className="cursor-help decoration-dotted underline underline-offset-2"
                title="Utenti unici distinti attivi nell'intera finestra selezionata (7/30/90g). NON è la somma delle barre: chi è attivo più giorni conta una volta sola."
              >
                unici nel periodo
              </span>
              · <span className="font-semibold text-foreground">{actionsPerUser}</span>{' '}
              <span
                className="cursor-help decoration-dotted underline underline-offset-2"
                title="Eventi tracciati totali ÷ utenti unici del periodo: profondità d'uso media per utente attivo."
              >
                azioni/utente
              </span>
            </span>
          )}
        </div>
        <div className="flex gap-1">
          {RANGES.map((r) => (
            <Chip key={r.key} active={range === r.key} onClick={() => setRange(r.key)}>{r.label}</Chip>
          ))}
        </div>
      </div>

      {/* Metriche fisse (non seguono i chip): finestre rolling standard.
          Sempre renderizzata (placeholder in load) per non far saltare l'altezza. */}
      <div className="flex items-center gap-4 flex-wrap mb-3">
        <MiniStat
          label="WAU 7g"
          value={stats ? String(stats.wau) : '—'}
          hint="Weekly Active Users: utenti unici con almeno un'azione tracciata negli ultimi 7 giorni."
        />
        <div className="w-px h-4 bg-border" />
        <MiniStat
          label="MAU 30g"
          value={stats ? String(stats.mau) : '—'}
          hint="Monthly Active Users: utenti unici con almeno un'azione tracciata negli ultimi 30 giorni."
        />
        <div className="w-px h-4 bg-border" />
        <MiniStat
          label="Stickiness"
          value={stats ? stickiness : '—'}
          hint="Quanto è 'appiccicosa' l'app: media degli attivi giornalieri ÷ MAU (30g). Più è alta, più gli utenti tornano spesso."
        />
      </div>

      {rows === null ? (
        <div className="flex items-center justify-center" style={{ height: 280 }}>
          <p className="text-sm text-faint">Caricamento...</p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
            <CartesianGrid stroke="var(--border)" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }} tickLine={false} axisLine={{ stroke: 'var(--border)' }} interval="preserveStartEnd" minTickGap={24} />
            <YAxis tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }} tickLine={false} axisLine={false} width={44} allowDecimals={false} />
            <Tooltip cursor={{ fill: 'var(--muted)' }} content={<ChartTooltip />} />
            <Legend wrapperStyle={{ fontSize: 12 }} iconType="square" />
            {SERIES.map((s) => (
              <Bar
                key={s.key}
                dataKey={s.key}
                name={s.label}
                stackId="dau"
                fill={s.color}
                isAnimationActive={false}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
