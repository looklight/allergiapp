'use client';

// Pill di un link del locale, identica a quella della scheda nell'app:
// piena quando il link è attivo, in contorno quando è ancora da aggiungere.
// `selected` è solo dell'editor: il link aperto in modifica si tinge pieno.
import { LINK_COLORS, LINK_ICONS, type LinkKind } from '@/lib/linkKinds';

export default function LinkPill({
  kind,
  label,
  active,
  selected = false,
  compact = false,
}: {
  kind: LinkKind;
  label: string;
  active: boolean;
  selected?: boolean; // aperto in modifica: colore pieno, testo bianco
  compact?: boolean; // versione ridotta, per l'infografica della maschera
}) {
  const { bg, fg } = LINK_COLORS[kind];
  const ink = selected ? '#FFFFFF' : fg;
  return (
    <span
      className={`inline-flex items-center rounded-full border font-medium ${
        compact ? 'gap-1 px-2 py-0.5 text-[11px]' : 'gap-1.5 px-3 py-1.5 text-sm'
      }`}
      style={{
        backgroundColor: selected ? fg : active ? bg : 'transparent',
        // il bordino resta anche da attiva: stesso contorno delle pill
        // ancora da aggiungere, così la fila si legge come una sola famiglia
        borderColor: selected ? fg : `${fg}55`,
        color: ink,
      }}
    >
      <svg
        width={compact ? 12 : 15} height={compact ? 12 : 15} viewBox="0 0 24 24" fill="none" stroke={ink}
        strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0"
      >
        {LINK_ICONS[kind]}
      </svg>
      {label}
    </span>
  );
}
