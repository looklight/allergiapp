export default function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: string | number;
  color?: string;
}) {
  return (
    <div className="bg-card rounded-lg shadow p-4">
      <p className="text-xs text-faint uppercase tracking-wide">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${color ?? 'text-foreground'}`}>{value}</p>
    </div>
  );
}
