'use client';

// Pill di un link della vetrina, identica a quella della scheda nell'app:
// piena quando il link è attivo, in contorno quando è ancora da aggiungere.
import { LINK_COLORS, LINK_ICONS, type LinkKind } from '@/lib/linkKinds';

export default function LinkPill({
  kind,
  label,
  active,
  compact = false,
}: {
  kind: LinkKind;
  label: string;
  active: boolean;
  compact?: boolean; // versione ridotta, per l'infografica della maschera
}) {
  const { bg, fg } = LINK_COLORS[kind];
  return (
    <span
      className={`inline-flex items-center rounded-full border font-medium ${
        compact ? 'gap-1 px-2 py-0.5 text-[11px]' : 'gap-1.5 px-3 py-1.5 text-sm'
      }`}
      style={{
        backgroundColor: active ? bg : 'transparent',
        borderColor: active ? bg : `${fg}55`,
        color: fg,
      }}
    >
      <svg
        width={compact ? 12 : 15} height={compact ? 12 : 15} viewBox="0 0 24 24" fill="none" stroke={fg}
        strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0"
      >
        {LINK_ICONS[kind]}
      </svg>
      {label}
    </span>
  );
}
