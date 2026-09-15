// Il pallino di stato: verde fatto, ambra cominciato, grigio da fare.
//
// Condiviso fra la home (riquadri del menù e della scheda) e l'elenco dei
// menù (accanto al nome del locale, 15/09): lo stesso stato deve avere lo
// stesso colore ovunque compaia.
export type Stato = 'ready' | 'draft' | 'todo';

const COLORI: Record<Stato, string> = {
  ready: 'bg-[#4CAF50]',
  draft: 'bg-[#E8A33D]',
  todo: 'bg-gray-300',
};

// Il pallino da solo. `stato` null = ancora non si sa: lo spazio resta, vuoto,
// così il testo accanto non si sposta quando il pallino arriva.
export function StatusDot({ stato }: { stato: Stato | null }) {
  return (
    <span
      className={`h-2 w-2 shrink-0 rounded-full ${stato === null ? 'bg-transparent' : COLORI[stato]}`}
      aria-hidden="true"
    />
  );
}

// Pallino e parola. Il colore da solo non basta — chi non lo distingue legge
// la parola accanto.
export default function StatusPill({ stato, label }: { stato: Stato; label: string }) {
  return (
    <span className="flex shrink-0 items-center gap-1.5 text-xs text-gray-500">
      <StatusDot stato={stato} />
      {label}
    </span>
  );
}
