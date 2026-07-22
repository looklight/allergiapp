'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { safeCount } from '@/lib/safeQuery';
import type { UserProfile } from '@/lib/types';
import { usePagination, PAGE_SIZE } from '@/hooks/usePagination';
import UserAvatar from '@/components/UserAvatar';
import Link from 'next/link';

type SortBy = 'created_desc' | 'reviews_desc' | 'reviews_asc' | 'followers_desc' | 'last_seen_desc';

function formatLastSeen(iso: string | null | undefined): string {
  if (!iso) return 'Mai';
  const then = new Date(iso).getTime();
  const diffMs = Date.now() - then;
  const day = 86400000;
  if (diffMs < day) return 'Oggi';
  if (diffMs < 2 * day) return 'Ieri';
  if (diffMs < 30 * day) return `${Math.floor(diffMs / day)} gg fa`;
  return new Date(iso).toLocaleDateString('it-IT');
}

export default function UsersPage() {
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<SortBy>('created_desc');

  const fetchUsers = useCallback(async (pageNum: number) => {
    const { data } = await supabase.rpc('get_profiles_with_email', {
      page_limit: PAGE_SIZE + 1,
      page_offset: pageNum * PAGE_SIZE,
      search_query: search.trim() || null,
      sort_by: sortBy,
    });
    return (data ?? []) as UserProfile[];
  }, [search, sortBy]);

  const { items: users, loading, hasMore, loadMore, reset } =
    usePagination<UserProfile>({ fetchPage: fetchUsers });

  useEffect(() => {
    reset();
    safeCount(() => supabase.from('profiles').select('*', { count: 'exact', head: true })).then(setTotalCount);
  }, [search, sortBy]);

  return (
    <div>
      <div className="flex items-baseline gap-2 mb-6">
        <h1 className="text-2xl font-bold">Utenti</h1>
        {totalCount !== null && <span className="text-faint text-sm">({totalCount})</span>}
      </div>

      <div className="mb-4">
        <input
          type="text"
          placeholder="Cerca per nome o email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-md px-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {/* Mobile: chip di ordinamento (sul desktop si usano gli header della tabella) */}
      <div className="md:hidden flex gap-2 mb-3 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {([
          ['created_desc', 'Più recenti'],
          ['reviews_desc', 'Più recensioni'],
          ['reviews_asc', 'Meno recensioni'],
          ['followers_desc', 'Più follower'],
          ['last_seen_desc', 'Accesso recente'],
        ] as const).map(([value, label]) => (
          <button
            key={value}
            onClick={() => setSortBy(value)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap border ${
              sortBy === value
                ? 'bg-selected text-selected-foreground border-selected'
                : 'bg-card text-foreground-secondary border-border'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Desktop: tabella */}
      <div className="hidden md:block bg-card rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-background text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Utente</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Ruolo</th>
                <th className="px-4 py-3 font-medium text-right">
                  <button
                    type="button"
                    onClick={() =>
                      setSortBy(sortBy === 'reviews_desc' ? 'reviews_asc' : 'reviews_desc')
                    }
                    className="inline-flex items-center gap-1 -mx-2 px-2 py-1 rounded hover:bg-muted"
                  >
                    Recensioni
                    <span className="text-faint text-xs w-3 text-center">
                      {sortBy === 'reviews_desc' ? '▼' : sortBy === 'reviews_asc' ? '▲' : ''}
                    </span>
                  </button>
                </th>
                <th className="px-4 py-3 font-medium text-right">
                  <button
                    type="button"
                    onClick={() => setSortBy('followers_desc')}
                    className="inline-flex items-center gap-1 -mx-2 px-2 py-1 rounded hover:bg-muted"
                  >
                    Follower
                    <span className="text-faint text-xs w-3 text-center">
                      {sortBy === 'followers_desc' ? '▼' : ''}
                    </span>
                  </button>
                </th>
                <th className="px-4 py-3 font-medium">
                  <button
                    type="button"
                    onClick={() => setSortBy('last_seen_desc')}
                    className="inline-flex items-center gap-1 -mx-2 px-2 py-1 rounded hover:bg-muted"
                  >
                    Ultimo accesso
                    <span className="text-faint text-xs w-3 text-center">
                      {sortBy === 'last_seen_desc' ? '▼' : ''}
                    </span>
                  </button>
                </th>
                <th className="px-4 py-3 font-medium">
                  <button
                    type="button"
                    onClick={() => setSortBy('created_desc')}
                    className="inline-flex items-center gap-1 -mx-2 px-2 py-1 rounded hover:bg-muted"
                  >
                    Registrazione
                    <span className="text-faint text-xs w-3 text-center">
                      {sortBy === 'created_desc' ? '▼' : ''}
                    </span>
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-t hover:bg-background">
                  <td className="px-4 py-3">
                    <Link href={`/users/${u.id}`} className="flex items-center gap-3 group">
                      <UserAvatar user={u} />
                      <span className="text-primary group-hover:underline">
                        {u.username || 'Anonimo'}
                      </span>
                      {u.is_anonymous && (
                        <span className="px-1.5 py-0.5 bg-muted text-muted-foreground rounded text-[10px] font-medium">
                          anonimo
                        </span>
                      )}
                      {!u.email_confirmed_at && (
                        <span
                          title="Email non verificata"
                          className="text-warning text-xs"
                        >
                          ⚠
                        </span>
                      )}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{u.email ?? '—'}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {u.role === 'admin' ? (
                      <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-badge-admin text-badge-admin-foreground">Admin</span>
                    ) : (
                      <span className="text-faint">Utente</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {(u.reviews_count ?? 0) > 0 ? (
                      <span className="font-medium text-foreground-secondary">{u.reviews_count}</span>
                    ) : (
                      <span className="text-faint">0</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {(u.followers_count ?? 0) > 0 ? (
                      <span className="font-medium text-foreground-secondary">{u.followers_count}</span>
                    ) : (
                      <span className="text-faint">0</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {formatLastSeen(u.last_seen_at)}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(u.created_at).toLocaleDateString('it-IT')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile: card */}
      <div className="md:hidden space-y-2">
        {users.map((u) => (
          <Link
            key={u.id}
            href={`/users/${u.id}`}
            className="flex items-center gap-3 bg-card rounded-lg shadow p-3"
          >
            <UserAvatar user={u} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-primary font-medium text-sm truncate">
                  {u.username || 'Anonimo'}
                </span>
                {u.is_anonymous && (
                  <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-medium bg-muted text-muted-foreground shrink-0">anonimo</span>
                )}
                {!u.email_confirmed_at && (
                  <span title="Email non verificata" className="text-warning text-xs shrink-0">⚠</span>
                )}
                {u.role === 'admin' && (
                  <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-medium bg-badge-admin text-badge-admin-foreground shrink-0">Admin</span>
                )}
              </div>
              {u.email && (
                <p className="text-xs text-muted-foreground truncate">{u.email}</p>
              )}
              <p className="text-xs text-faint mt-0.5">
                {(u.reviews_count ?? 0)} {(u.reviews_count ?? 0) === 1 ? 'recensione' : 'recensioni'}
                {(u.followers_count ?? 0) > 0 && (
                  <>
                    {' · '}
                    {u.followers_count} follower
                  </>
                )}
                {' · '}
                Accesso {formatLastSeen(u.last_seen_at).toLowerCase()}
              </p>
            </div>
          </Link>
        ))}
      </div>

      {loading && <p className="text-muted-foreground mt-4">Caricamento...</p>}

      {hasMore && !loading && (
        <button
          onClick={loadMore}
          className="mt-4 px-4 py-2 bg-card border rounded text-sm hover:bg-background"
        >
          Carica altri
        </button>
      )}
    </div>
  );
}
