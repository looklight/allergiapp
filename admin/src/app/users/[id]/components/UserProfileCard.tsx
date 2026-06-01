import type { UserProfile } from '@/lib/types';
import DietaryBadges from '@/components/DietaryBadges';
import UserAvatar from '@/components/UserAvatar';

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
    <div className="bg-card rounded-lg shadow p-6 mt-4 mb-6">
      <div className="flex items-center gap-4">
        <UserAvatar user={user} size={64} />
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">{user.username || 'Anonimo'}</h1>
            {user.is_anonymous && (
              <span className="px-1.5 py-0.5 bg-muted text-muted-foreground rounded text-[11px] font-medium">
                anonimo
              </span>
            )}
          </div>
          <DietaryBadges allergens={user.allergens} diets={user.dietary_preferences} className="mt-1.5" />
          {user.email && <p className="text-sm text-muted-foreground mt-1">{user.email}</p>}
          <p className="text-sm text-faint">
            Registrato il {new Date(user.created_at).toLocaleDateString('it-IT')}
          </p>
          <p className="text-xs text-faint font-mono mt-0.5 select-all break-all">
            ID: {user.id}
          </p>
          {user.role === 'admin' && (
            <span className="inline-block mt-1 px-2 py-0.5 rounded text-xs font-medium bg-badge-admin text-badge-admin-foreground">Admin</span>
          )}
        </div>
      </div>

      {user.role !== 'admin' && (
        <button
          onClick={onDelete}
          disabled={isDeleting}
          className="mt-4 px-4 py-2 bg-danger text-white rounded text-sm hover:bg-danger-strong disabled:opacity-50"
        >
          {isDeleting ? 'Eliminazione in corso...' : 'Elimina utente'}
        </button>
      )}

      <div className={`grid gap-4 mt-6 ${mediaCount > 0 ? 'grid-cols-3' : 'grid-cols-2'}`}>
        <div className="text-center">
          <p className="text-2xl font-bold">{restaurantCount}</p>
          <p className="text-sm text-muted-foreground">Ristoranti</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold">{reviewCount}</p>
          <p className="text-sm text-muted-foreground">Recensioni</p>
        </div>
        {mediaCount > 0 && (
          <div className="text-center">
            <p className="text-2xl font-bold">{mediaCount}</p>
            <p className="text-sm text-muted-foreground">Media</p>
          </div>
        )}
      </div>
    </div>
  );
}

