import { labelAllergen, labelDiet } from '@/lib/dietaryLabels';

interface Props {
  allergens: string[] | null | undefined;
  diets: string[] | null | undefined;
  className?: string;
}

export default function DietaryBadges({ allergens, diets, className = '' }: Props) {
  const a = allergens ?? [];
  const d = diets ?? [];
  if (a.length === 0 && d.length === 0) return null;

  return (
    <div className={`flex flex-wrap gap-1 ${className}`}>
      {a.map((id) => (
        <span
          key={`a-${id}`}
          className="inline-block px-1.5 py-0.5 rounded text-[11px] font-medium bg-rose-100 text-rose-800"
        >
          {labelAllergen(id)}
        </span>
      ))}
      {d.map((id) => (
        <span
          key={`d-${id}`}
          className="inline-block px-1.5 py-0.5 rounded text-[11px] font-medium bg-emerald-100 text-emerald-800"
        >
          {labelDiet(id)}
        </span>
      ))}
    </div>
  );
}
