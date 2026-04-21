'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { safeCount } from '@/lib/safeQuery';
import type { UserProfile } from '@/lib/types';
import { usePagination, PAGE_SIZE } from '@/hooks/usePagination';
import Link from 'next/link';

function UserAvatar({ user }: { user: UserProfile }) {
  const initial = (user.display_name || user.email || '?').trim().charAt(0).toUpperCase();
  const bg = user.profile_color || '#9CA3AF';

  if (user.avatar_url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={user.avatar_url}
        alt=""
        className="w-9 h-9 rounded-full object-cover bg-gray-100"
      />
    );
  }
  return (
    <div
      className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-medium"
      style={{ backgroundColor: bg }}
    >
      {initial}
    </div>
  );
}

type SortBy = 'created_desc' | 'reviews_desc' | 'reviews_asc';

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
        {totalCount !== null && <span className="text-gray-400 text-sm">({totalCount})</span>}
      </div>

      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <input
          type="text"
          placeholder="Cerca per nome o email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 max-w-md px-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
        />
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortBy)}
          className="px-3 py-2 border rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-gray-300"
        >
          <option value="created_desc">Più recenti</option>
          <option value="reviews_desc">Più recensioni</option>
          <option value="reviews_asc">Meno recensioni</option>
        </select>
      </div>

      {/* Desktop: tabella */}
      <div className="hidden md:block bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Utente</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Ruolo</th>
                <th className="px-4 py-3 font-medium text-right">Recensioni</th>
                <th className="px-4 py-3 font-medium">Registrazione</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <Link href={`/users/${u.id}`} className="flex items-center gap-3 group">
                      <UserAvatar user={u} />
                      <span className="text-blue-600 group-hover:underline">
                        {u.display_name || 'Anonimo'}
                      </span>
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{u.email ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-500">
                    {u.role === 'admin' ? (
                      <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">Admin</span>
                    ) : (
                      <span className="text-gray-400">Utente</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {(u.reviews_count ?? 0) > 0 ? (
                      <span className="font-medium text-gray-700">{u.reviews_count}</span>
                    ) : (
                      <span className="text-gray-300">0</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
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
            className="flex items-center gap-3 bg-white rounded-lg shadow p-3"
          >
            <UserAvatar user={u} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-blue-600 font-medium text-sm truncate">
                  {u.display_name || 'Anonimo'}
                </span>
                {u.role === 'admin' && (
                  <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-medium bg-purple-100 text-purple-800 shrink-0">Admin</span>
                )}
              </div>
              {u.email && (
                <p className="text-xs text-gray-500 truncate">{u.email}</p>
              )}
              <p className="text-xs text-gray-400 mt-0.5">
                {(u.reviews_count ?? 0)} {(u.reviews_count ?? 0) === 1 ? 'recensione' : 'recensioni'}
                {' · '}
                {new Date(u.created_at).toLocaleDateString('it-IT')}
              </p>
            </div>
          </Link>
        ))}
      </div>

      {loading && <p className="text-gray-500 mt-4">Caricamento...</p>}

      {hasMore && !loading && (
        <button
          onClick={loadMore}
          className="mt-4 px-4 py-2 bg-white border rounded text-sm hover:bg-gray-50"
        >
          Carica altri
        </button>
      )}
    </div>
  );
}
