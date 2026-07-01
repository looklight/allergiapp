import Link from 'next/link';

export default function StatCard({
  label,
  value,
  color,
  href,
  hint,
}: {
  label: string;
  value: string | number;
  color?: string;
  /** Se presente, la card diventa un link cliccabile verso la sezione. */
  href?: string;
  /** Testo piccolo sotto il numero (es. un sotto-dato). */
  hint?: string;
}) {
  const content = (
    <>
      <p className="text-xs text-faint uppercase tracking-wide">{label}</p>
      {/* mt-auto: in una griglia di card stirate, allinea i numeri in basso
          a prescindere da quante righe occupa l'etichetta. L'hint sta in linea,
          allineato alla base, così il numero grande resta alla stessa altezza. */}
      <div className="mt-auto pt-1 flex items-baseline gap-1.5">
        <span className={`text-2xl font-bold ${color ?? 'text-foreground'}`}>{value}</span>
        {hint && <span className="text-xs text-faint">{hint}</span>}
      </div>
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="bg-card rounded-lg shadow p-4 flex flex-col h-full hover:shadow-md hover:ring-1 hover:ring-border transition-shadow"
      >
        {content}
      </Link>
    );
  }

  return <div className="bg-card rounded-lg shadow p-4 flex flex-col h-full">{content}</div>;
}
