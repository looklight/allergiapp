import type { UserProfile } from '@/lib/types';
import { labelAllergen, labelDiet } from '@/lib/dietaryLabels';

interface Props {
  user: UserProfile;
  restaurantCount: number;
  reviewCount: number;
  mediaCount: number;
  isDeleting: boolean;
  onDelete: () => void;
}

export default function UserProfileCard({ user, restaurantCount, reviewCount, mediaCount, isDeleting, onDelete }: Props) {
  return (
    <div className="bg-white rounded-lg shadow p-6 mt-4 mb-6">
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center text-2xl text-gray-500">
          {(user.username || '?')[0].toUpperCase()}
        </div>
        <div>
          <h1 className="text-2xl font-bold">{user.username || 'Anonimo'}</h1>
          {user.email && <p className="text-sm text-gray-500">{user.email}</p>}
          <p className="text-sm text-gray-400">
            Registrato il {new Date(user.created_at).toLocaleDateString('it-IT')}
          </p>
          {user.role === 'admin' && (
            <span className="inline-block mt-1 px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">Admin</span>
          )}
        </div>
      </div>

      {user.role !== 'admin' && (
        <button
          onClick={onDelete}
          disabled={isDeleting}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded text-sm hover:bg-red-700 disabled:opacity-50"
        >
          {isDeleting ? 'Eliminazione in corso...' : 'Elimina utente'}
        </button>
      )}

      <DietaryNeeds allergens={user.allergens ?? []} diets={user.dietary_preferences ?? []} />

      <div className={`grid gap-4 mt-6 ${mediaCount > 0 ? 'grid-cols-3' : 'grid-cols-2'}`}>
        <div className="text-center">
          <p className="text-2xl font-bold">{restaurantCount}</p>
          <p className="text-sm text-gray-500">Ristoranti</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold">{reviewCount}</p>
          <p className="text-sm text-gray-500">Recensioni</p>
        </div>
        {mediaCount > 0 && (
          <div className="text-center">
            <p className="text-2xl font-bold">{mediaCount}</p>
            <p className="text-sm text-gray-500">Media</p>
          </div>
        )}
      </div>
    </div>
  );
}

function DietaryNeeds({ allergens, diets }: { allergens: string[]; diets: string[] }) {
  if (allergens.length === 0 && diets.length === 0) return null;

  return (
    <div className="mt-6 pt-6 border-t space-y-3">
      <h2 className="text-sm font-semibold text-gray-700">Esigenze alimentari</h2>

      {allergens.length > 0 && (
        <div>
          <p className="text-xs text-gray-500 mb-1.5">Allergeni</p>
          <div className="flex flex-wrap gap-1.5">
            {allergens.map((id) => (
              <span
                key={id}
                className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-rose-100 text-rose-800"
              >
                {labelAllergen(id)}
              </span>
            ))}
          </div>
        </div>
      )}

      {diets.length > 0 && (
        <div>
          <p className="text-xs text-gray-500 mb-1.5">Dieta / intolleranze</p>
          <div className="flex flex-wrap gap-1.5">
            {diets.map((id) => (
              <span
                key={id}
                className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-800"
              >
                {labelDiet(id)}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
