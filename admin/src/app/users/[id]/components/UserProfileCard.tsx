import type { UserProfile } from '@/lib/types';

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
          {(user.display_name || '?')[0].toUpperCase()}
        </div>
        <div>
          <h1 className="text-2xl font-bold">{user.display_name || 'Anonimo'}</h1>
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
