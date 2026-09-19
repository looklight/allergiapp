'use client';

// Pill di un link del locale, identica a quella della scheda nell'app:
// piena quando il link è attivo, in contorno quando è ancora da aggiungere.
// `selected` è solo dell'editor: il link aperto in modifica si tinge pieno.
//
// `action` è anch'esso solo dell'editor e dice il gesto (richieste
// dell'utente, 15/09). Senza, le due file di pill si distinguevano solo dal
// riempimento, e niente diceva che toccarle faceva qualcosa:
//   - 'add': il "+" SEMPRE al posto dell'icona del tipo, sulle pill ancora da
//     aggiungere — il nome del tipo resta scritto accanto;
//   - 'edit': l'icona del tipo resta, e passandoci sopra col mouse diventa la
//     matita. Solo al passaggio, perché su una pill già aggiunta l'icona del
//     tipo è quella che si vedrà in app. Sul telefono non c'è passaggio del
//     mouse (Tailwind v4 mette hover dentro @media (hover: hover)), quindi lì
//     resta l'icona del tipo e basta.
import { LINK_COLORS, LINK_ICONS, type LinkKind } from '@/lib/linkKinds';

const ACTION_ICONS = {
  add: <path d="M12 5v14M5 12h14" />,
  edit: (
    <>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z" />
    </>
  ),
};

export default function LinkPill({
  kind,
  label,
  active,
  selected = false,
  compact = false,
  action,
}: {
  kind: LinkKind;
  label: string;
  active: boolean;
  selected?: boolean; // aperto in modifica: colore pieno, testo bianco
  compact?: boolean; // versione ridotta, per l'infografica della maschera
  action?: 'add' | 'edit'; // l'icona del gesto al posto di quella del tipo
}) {
  const { bg, fg } = LINK_COLORS[kind];
  const ink = selected ? '#FFFFFF' : fg;
  const iconSize = compact ? 12 : 15;
  const icon = (paths: React.ReactNode, className = '') => (
    <svg
      width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke={ink}
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`shrink-0 ${className}`}
      aria-hidden="true"
    >
      {paths}
    </svg>
  );
  return (
    <span
      className={`group inline-flex items-center rounded-full border font-medium ${
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
      {action === 'add' ? (
        icon(ACTION_ICONS.add)
      ) : action === 'edit' ? (
        <>
          {icon(LINK_ICONS[kind], 'group-hover:hidden')}
          {icon(ACTION_ICONS.edit, 'hidden group-hover:block')}
        </>
      ) : (
        icon(LINK_ICONS[kind])
      )}
      {label}
    </span>
  );
}
