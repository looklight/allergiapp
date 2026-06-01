import Link from 'next/link';

export default function StatCard({
  label,
  value,
  color,
  href,
}: {
  label: string;
  value: string | number;
  color?: string;
  /** Se presente, la card diventa un link cliccabile verso la sezione. */
  href?: string;
}) {
  const content = (
    <>
      <p className="text-xs text-faint uppercase tracking-wide">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${color ?? 'text-foreground'}`}>{value}</p>
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="bg-card rounded-lg shadow p-4 block hover:shadow-md hover:ring-1 hover:ring-border transition-shadow"
      >
        {content}
      </Link>
    );
  }

  return <div className="bg-card rounded-lg shadow p-4">{content}</div>;
}
