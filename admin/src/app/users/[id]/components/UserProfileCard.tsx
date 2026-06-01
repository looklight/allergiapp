'use client';

import { useState } from 'react';
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
  const [copied, setCopied] = useState(false);

  const copyId = async () => {
    try {
      await navigator.clipboard.writeText(user.id);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* clipboard non disponibile */ }
  };

  return (
    <div className="bg-card rounded-lg shadow p-6 mt-4 mb-6">
      {/* Header: identità + azione */}
      <div className="flex items-start gap-4">
        <UserAvatar user={user} size={64} />

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold">{user.username || 'Anonimo'}</h1>
            {user.is_anonymous && (
              <span className="px-1.5 py-0.5 bg-muted text-muted-foreground rounded text-[11px] font-medium">
                anonimo
              </span>
            )}
            {user.role === 'admin' && (
              <span className="px-2 py-0.5 rounded text-xs font-medium bg-badge-admin text-badge-admin-foreground">Admin</span>
            )}
          </div>

          <p className="text-sm mt-1">
            {user.email && <span className="text-muted-foreground">{user.email}</span>}
            {user.email && <span className="text-faint"> · </span>}
            <span className="text-faint">Registrato il {new Date(user.created_at).toLocaleDateString('it-IT')}</span>
          </p>

          <DietaryBadges allergens={user.allergens} diets={user.dietary_preferences} className="mt-2" />
        </div>

        {user.role !== 'admin' && (
          <button
            onClick={onDelete}
            disabled={isDeleting}
            className="shrink-0 px-3 py-1.5 text-sm text-danger border border-danger-border rounded hover:bg-danger-soft disabled:opacity-50 transition-colors"
          >
            {isDeleting ? 'Eliminazione...' : 'Elimina utente'}
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

      {/* Footer: ID tecnico */}
      <div className="mt-4 pt-4 border-t border-border flex items-center gap-2 text-xs text-faint">
        <span className="font-mono break-all select-all min-w-0">ID {user.id}</span>
        <button
          onClick={copyId}
          className="shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-muted hover:text-foreground-secondary transition-colors"
          aria-label="Copia ID utente"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>
          {copied ? 'Copiato' : 'Copia'}
        </button>
      </div>
    </div>
  );
}
