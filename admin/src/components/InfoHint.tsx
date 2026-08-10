// Icona "i" con tooltip CSS che spiega cosa misura un dato.
// Si mostra su hover e su focus/click (accessibile, funziona anche da tap).
//
// Da `sm` in su il riquadro è ancorato all'icona, e `align` decide da che
// parte si estende: 'center' (default), 'start' o 'end' quando l'icona è sul
// bordo destro. Sotto `sm` `align` non si applica: il riquadro è 256px su
// schermi da ~390px, quindi ancorarlo a un punto lo fa sempre uscire da un
// lato o dall'altro. Diventa invece una barra fissa in fondo allo schermo,
// larga quanto il viewport meno i margini, che per costruzione ci sta sempre.
export default function InfoHint({ text, align = 'center' }: { text: string; align?: 'center' | 'start' | 'end' }) {
  const position =
    align === 'end'
      ? 'sm:right-0'
      : align === 'start'
        ? 'sm:left-0'
        : 'sm:left-1/2 sm:-translate-x-1/2';
  return (
    <span className="relative inline-flex group align-middle">
      <button
        type="button"
        aria-label={text}
        className="inline-flex items-center text-faint hover:text-muted-foreground focus:text-muted-foreground focus:outline-none cursor-help transition-colors"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 16v-4" />
          <path d="M12 8h.01" />
        </svg>
      </button>
      <span
        role="tooltip"
        className={`pointer-events-none hidden group-hover:block group-focus-within:block fixed inset-x-4 bottom-4 z-30 sm:absolute ${position} sm:inset-x-auto sm:bottom-auto sm:top-full sm:mt-2 sm:w-64 rounded-md border border-border bg-card p-2.5 text-left text-xs font-normal normal-case leading-snug tracking-normal text-foreground shadow-lg`}
      >
        {text}
      </span>
    </span>
  );
}
