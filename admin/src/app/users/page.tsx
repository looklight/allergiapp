'use client';

import { useEffect, useState } from 'react';
import { collection, query, orderBy, getDocs, limit, startAfter, type DocumentSnapshot, type QueryConstraint } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { UserProfile } from '@/lib/types';
import Link from 'next/link';

const PAGE_SIZE = 25;

export default function UsersPage() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastDoc, setLastDoc] = useState<DocumentSnapshot | null>(null);
  const [hasMore, setHasMore] = useState(false);

  const loadUsers = async (append = false) => {
    setLoading(true);
    setError(null);
    try {
      const ref = collection(db, 'users');
      const constraints: QueryConstraint[] = [orderBy('createdAt', 'desc')];

      if (append && lastDoc) {
        constraints.push(startAfter(lastDoc));
      }
      constraints.push(limit(PAGE_SIZE + 1));

      const snap = await getDocs(query(ref, ...constraints));
      const docs = snap.docs;
      const hasNext = docs.length > PAGE_SIZE;
      const items = (hasNext ? docs.slice(0, PAGE_SIZE) : docs).map(
        (d) => ({ ...d.data(), uid: d.id } as UserProfile)
      );

      if (append) {
        setUsers((prev) => [...prev, ...items]);
      } else {
        setUsers(items);
      }
      setLastDoc(docs.length > 0 ? docs[Math.min(docs.length - 1, PAGE_SIZE - 1)] : null);
      setHasMore(hasNext);
    } catch (err) {
      console.error('Errore caricamento utenti:', err);
      setError(err instanceof Error ? err.message : 'Errore sconosciuto');
    }
    setLoading(false);
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const formatDate = (ts: UserProfile['createdAt']) => {
    if (!ts?.toDate) return '—';
    return ts.toDate().toLocaleDateString('it-IT');
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Utenti</h1>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left">
            <tr>
              <th className="px-4 py-3 font-medium">Nome</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Registrazione</th>
              <th className="px-4 py-3 font-medium text-right">Ristoranti</th>
              <th className="px-4 py-3 font-medium text-right">Piatti</th>
              <th className="px-4 py-3 font-medium text-right">Recensioni</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.uid} className="border-t hover:bg-gray-50">
                <td className="px-4 py-3">
                  <Link href={`/users/${u.uid}`} className="text-blue-600 hover:underline">
                    {u.displayName || 'Anonimo'}
                  </Link>
                </td>
                <td className="px-4 py-3 text-gray-500">{u.email}</td>
                <td className="px-4 py-3 text-gray-500">{formatDate(u.createdAt)}</td>
                <td className="px-4 py-3 text-right">{u.restaurantsAdded ?? 0}</td>
                <td className="px-4 py-3 text-right">{u.dishesAdded ?? 0}</td>
                <td className="px-4 py-3 text-right">{u.reviewsAdded ?? 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
          <p className="font-medium">Errore:</p>
          <p>{error}</p>
        </div>
      )}

      {loading && <p className="text-gray-500 mt-4">Caricamento...</p>}

      {hasMore && !loading && (
        <button
          onClick={() => loadUsers(true)}
          className="mt-4 px-4 py-2 bg-white border rounded text-sm hover:bg-gray-50"
        >
          Carica altri
        </button>
      )}
    </div>
  );
}
