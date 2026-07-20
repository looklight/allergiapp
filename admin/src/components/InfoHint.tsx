// Icona "i" con tooltip nativo (title). Spiega cosa misura un grafico.
export default function InfoHint({ text }: { text: string }) {
  return (
    <span
      title={text}
      aria-label={text}
      role="img"
      className="inline-flex items-center text-faint cursor-help hover:text-muted-foreground transition-colors"
    >
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 16v-4" />
        <path d="M12 8h.01" />
      </svg>
    </span>
  );
}
