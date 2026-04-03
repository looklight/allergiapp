'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { safeCount } from '@/lib/safeQuery';
import type { UserProfile } from '@/lib/types';
import { usePagination, PAGE_SIZE } from '@/hooks/usePagination';
import Link from 'next/link';

export default function UsersPage() {
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const [search, setSearch] = useState('');

  const fetchUsers = useCallback(async (pageNum: number) => {
    const { data } = await supabase.rpc('get_profiles_with_email', {
      page_limit: PAGE_SIZE + 1,
      page_offset: pageNum * PAGE_SIZE,
      search_query: search.trim() || null,
    });
    return (data ?? []) as UserProfile[];
  }, [search]);

  const { items: users, loading, hasMore, loadMore, reset } =
    usePagination<UserProfile>({ fetchPage: fetchUsers });

  useEffect(() => {
    reset();
    safeCount(() => supabase.from('profiles').select('*', { count: 'exact', head: true })).then(setTotalCount);
  }, [search]);

  return (
    <div>
      <div className="flex items-baseline gap-2 mb-6">
        <h1 className="text-2xl font-bold">Utenti</h1>
        {totalCount !== null && <span className="text-gray-400 text-sm">({totalCount})</span>}
      </div>

      <input
        type="text"
        placeholder="Cerca per nome o email..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full max-w-md px-4 py-2 mb-4 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
      />

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left">
            <tr>
              <th className="px-4 py-3 font-medium">Nome</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Ruolo</th>
              <th className="px-4 py-3 font-medium">Registrazione</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t hover:bg-gray-50">
                <td className="px-4 py-3">
                  <Link href={`/users/${u.id}`} className="text-blue-600 hover:underline">
                    {u.display_name || 'Anonimo'}
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
                <td className="px-4 py-3 text-gray-500">
                  {new Date(u.created_at).toLocaleDateString('it-IT')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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
