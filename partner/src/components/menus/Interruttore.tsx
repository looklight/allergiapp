'use client';

// L'interruttore acceso/spento comune a più aree del portale (prima viveva
// solo dentro MenuAddress.tsx, per l'indirizzo online; da qui in poi serve
// anche a /menu, per i singoli menù).
//
// L'ETICHETTA È FISSA, non cambia mai testo insieme allo stato: prima quella
// dell'indirizzo scriveva "Attivo" o "Inattivo" a seconda dei casi, e letta
// così — una parola sola su fondo colorato — sembrava un'etichetta di stato,
// non una cosa da premere, e infatti nessuno la premeva. Lo stato lo dicono
// solo il colore e la posizione del cursore; se serve dire la conseguenza del
// tocco, è il `titolo` (tooltip) a farlo, non l'etichetta.
export default function Interruttore({
  acceso,
  disabilitato = false,
  etichetta,
  titolo,
  onChange,
}: {
  acceso: boolean;
  disabilitato?: boolean;
  etichetta: string;
  titolo?: string;
  onChange: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={acceso}
      disabled={disabilitato}
      onClick={onChange}
      title={titolo}
      className="group flex shrink-0 items-center gap-2 text-xs font-medium text-gray-600 disabled:cursor-default disabled:opacity-50"
    >
      {etichetta}
      <span
        aria-hidden="true"
        className={`relative h-5 w-9 rounded-full transition-colors ${
          acceso ? 'bg-emerald-600' : 'bg-gray-300 group-hover:bg-gray-400 group-disabled:group-hover:bg-gray-300'
        }`}
      >
        <span
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-all ${
            acceso ? 'left-[1.125rem]' : 'left-0.5'
          }`}
        />
      </span>
    </button>
  );
}
