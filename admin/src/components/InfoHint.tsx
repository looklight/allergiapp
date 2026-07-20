// Icona "i" con tooltip CSS che spiega cosa misura un dato.
// Si mostra su hover e su focus/click (accessibile, funziona anche da tap).
// align: 'center' (default) o 'end' quando l'icona è sul bordo destro, così
// il riquadro si estende verso sinistra e non esce dallo schermo.
export default function InfoHint({ text, align = 'center' }: { text: string; align?: 'center' | 'end' }) {
  const position = align === 'end' ? 'right-0' : 'left-1/2 -translate-x-1/2';
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
        className={`pointer-events-none invisible absolute ${position} top-full z-30 mt-2 w-64 rounded-md border border-border bg-card p-2.5 text-left text-xs font-normal normal-case leading-snug tracking-normal text-foreground opacity-0 shadow-lg transition-opacity duration-150 group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100`}
      >
        {text}
      </span>
    </span>
  );
}
