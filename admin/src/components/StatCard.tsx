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
    <div className="bg-white rounded-lg shadow p-4">
      <p className="text-xs text-gray-400 uppercase tracking-wide">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${color ?? 'text-gray-800'}`}>{value}</p>
    </div>
  );
}
