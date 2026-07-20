import type { UserProfile } from '@/lib/types';
import DietaryBadges from '@/components/DietaryBadges';
import UserAvatar from '@/components/UserAvatar';

interface Props {
  user: UserProfile;
  restaurantCount: number;
  reviewCount: number;
  isDeleting: boolean;
  onDelete: () => void;
}

export default function UserProfileCard({ user, restaurantCount, reviewCount, isDeleting, onDelete }: Props) {
  return (
    <div className="bg-card rounded-lg shadow p-6 mt-4 mb-6">
      {/* Header: identità + azione */}
      <div className="flex items-start gap-4">
        <UserAvatar user={user} size={64} />

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold min-w-0 break-words">{user.username || 'Anonimo'}</h1>
            {user.is_anonymous && (
              <span className="px-1.5 py-0.5 bg-muted text-muted-foreground rounded text-[11px] font-medium">
                anonimo
              </span>
            )}
            {user.role === 'admin' && (
              <span className="px-2 py-0.5 rounded text-xs font-medium bg-badge-admin text-badge-admin-foreground">Admin</span>
            )}
            {user.username && !user.is_anonymous && (
              <a
                href={`https://allergiapp.com/u/${encodeURIComponent(user.username)}?ref=admin`}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Apri profilo in AllergiApp"
                className="inline-flex items-center gap-1 pl-2.5 pr-1.5 py-1 bg-primary-soft text-primary-soft-foreground hover:bg-primary-soft-hover rounded-full text-xs font-medium transition-colors"
              >
                Apri in
                <img src="/avatars/plate_main_logo.png" alt="" width={20} height={20} className="w-5 h-5 -my-0.5" />
              </a>
            )}
          </div>

          <p className="text-sm mt-1">
            {user.email && <span className="text-muted-foreground">{user.email}</span>}
            {user.email && <span className="text-faint"> · </span>}
            <span className="text-faint">Registrato il {new Date(user.created_at).toLocaleDateString('it-IT')}</span>
          </p>
          <p className="text-xs text-faint font-mono break-all mt-0.5">ID {user.id}</p>

          <DietaryBadges allergens={user.allergens} diets={user.dietary_preferences} className="mt-2" />
        </div>

        {user.role !== 'admin' && (
          <button
            onClick={onDelete}
            disabled={isDeleting}
            title="Elimina utente"
            aria-label="Elimina utente"
            className="shrink-0 inline-flex items-center gap-1.5 p-2 sm:px-3 sm:py-2 text-sm text-danger border border-danger-border rounded hover:bg-danger-soft disabled:opacity-50 transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
              <path d="M10 11v6M14 11v6" />
              <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
            </svg>
            <span className="hidden sm:inline">{isDeleting ? 'Eliminazione...' : 'Elimina utente'}</span>
          </button>
        )}
      </div>

      {/* Statistiche */}
      <div className="grid grid-cols-2 gap-4 mt-6 pt-6 border-t border-border">
        <div className="text-center">
          <p className="text-2xl font-bold">{restaurantCount}</p>
          <p className="text-sm text-muted-foreground">Ristoranti</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold">{reviewCount}</p>
          <p className="text-sm text-muted-foreground">Recensioni</p>
        </div>
      </div>
    </div>
  );
}
