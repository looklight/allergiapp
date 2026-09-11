'use client';

import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { supabase } from '@/lib/supabase';
import type { MapViewPoint } from '@/components/map/ViewsMap';
import InfoHint from '@/components/InfoHint';

// Leaflet tocca window: fuori dal render server, come nella pagina ristoranti.
const ViewsMap = dynamic(() => import('@/components/map/ViewsMap'), { ssr: false });

const INFO = "Dove si concentrano le aperture di scheda ristorante — contatore anonimo, che conta tutti e non sa chi: è attivo dalla versione 1.3.1 (agosto 2026), quindi qui c'è più storia che negli altri riquadri nuovi. Zoom libero fino alla via, e la dimensione dei cerchi si ricalcola su quello che stai guardando: al livello del mondo confronti i paesi, dentro una città confronti i ristoranti di quella città. Sono aperture e non persone: chi apre dieci volte la stessa scheda pesa dieci. Compaiono i 1000 locali più aperti del periodo, e solo quelli con coordinate.";

type Range = 7 | 30 | 90;

const RANGES: { key: Range; label: string }[] = [
  { key: 7, label: '7g' },
  { key: 30, label: '30g' },
  { key: 90, label: '90g' },
];

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

export default function ViewsMapSection() {
  const [range, setRange] = useState<Range>(30);
  const [points, setPoints] = useState<MapViewPoint[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    setPoints(null);
    // Errore ignorato come nelle sezioni sorelle: senza dati si mostra l'empty
    // state invece di un errore.
    supabase
      .rpc('get_view_map', { p_days: range, p_limit: 1000 })
      .then(({ data }) => {
        if (!cancelled) setPoints((data as MapViewPoint[]) ?? []);
      });
    return () => { cancelled = true; };
  }, [range]);

  const total = useMemo(() => (points ?? []).reduce((s, p) => s + p.views, 0), [points]);

  return (
    <div className="bg-card rounded-lg shadow p-4 mt-6">
      <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="flex items-center gap-1.5">
            <h2 className="font-semibold">Dove si guardano i ristoranti</h2>
            <InfoHint text={INFO} />
          </span>
          {points !== null && points.length > 0 && (
            <span className="text-sm text-muted-foreground">
              · <span className="font-semibold text-foreground">{total}</span> aperture su{' '}
              <span className="font-semibold text-foreground">{points.length}</span> locali
            </span>
          )}
        </div>
        <div className="flex gap-1">
          {RANGES.map((r) => (
            <Chip key={r.key} active={range === r.key} onClick={() => setRange(r.key)}>{r.label}</Chip>
          ))}
        </div>
      </div>

      {points === null ? (
        <div className="flex items-center justify-center" style={{ height: 520 }}>
          <p className="text-sm text-faint">Caricamento...</p>
        </div>
      ) : points.length === 0 ? (
        <div className="flex items-center justify-center" style={{ height: 520 }}>
          <p className="text-sm text-faint">Nessuna apertura di scheda in questo periodo.</p>
        </div>
      ) : (
        <div style={{ height: 520 }}>
          <ViewsMap points={points} />
        </div>
      )}
    </div>
  );
}
