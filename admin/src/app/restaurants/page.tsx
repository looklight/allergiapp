'use client';

import { useEffect, useState } from 'react';
import { collection, query, where, orderBy, getDocs, doc, updateDoc, limit, startAfter, type DocumentSnapshot, type QueryConstraint } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Restaurant, ContentStatus } from '@/lib/types';
import StatusBadge from '@/components/StatusBadge';
import Link from 'next/link';

const PAGE_SIZE = 25;

export default function RestaurantsPage() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [statusFilter, setStatusFilter] = useState<ContentStatus | 'all'>('all');
  const [loading, setLoading] = useState(true);
  const [lastDoc, setLastDoc] = useState<DocumentSnapshot | null>(null);
  const [hasMore, setHasMore] = useState(false);

  const loadRestaurants = async (append = false) => {
    setLoading(true);
    const ref = collection(db, 'restaurants');
    const constraints: QueryConstraint[] = [];

    if (statusFilter !== 'all') {
      constraints.push(where('status', '==', statusFilter));
    }
    constraints.push(orderBy('addedAt', 'desc'));
    if (append && lastDoc) {
      constraints.push(startAfter(lastDoc));
    }
    constraints.push(limit(PAGE_SIZE + 1));

    const snap = await getDocs(query(ref, ...constraints));
    const docs = snap.docs;
    const hasNext = docs.length > PAGE_SIZE;
    const items = (hasNext ? docs.slice(0, PAGE_SIZE) : docs).map(
      (d) => ({ ...d.data(), googlePlaceId: d.id } as Restaurant)
    );

    if (append) {
      setRestaurants((prev) => [...prev, ...items]);
    } else {
      setRestaurants(items);
    }
    setLastDoc(docs.length > 0 ? docs[Math.min(docs.length - 1, PAGE_SIZE - 1)] : null);
    setHasMore(hasNext);
    setLoading(false);
  };

  useEffect(() => {
    setLastDoc(null);
    loadRestaurants();
  }, [statusFilter]);

  const changeStatus = async (id: string, newStatus: ContentStatus) => {
    await updateDoc(doc(db, 'restaurants', id), { status: newStatus });
    setRestaurants((prev) =>
      prev.map((r) => (r.googlePlaceId === id ? { ...r, status: newStatus } : r))
    );
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Ristoranti</h1>

      {/* Filtri */}
      <div className="flex gap-2 mb-4">
        {(['all', 'active', 'removed'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1 rounded text-sm ${
              statusFilter === s ? 'bg-gray-900 text-white' : 'bg-white border text-gray-600 hover:bg-gray-100'
            }`}
          >
            {s === 'all' ? 'Tutti' : s === 'active' ? 'Attivi' : 'Rimossi'}
          </button>
        ))}
      </div>

      {/* Tabella */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left">
            <tr>
              <th className="px-4 py-3 font-medium">Nome</th>
              <th className="px-4 py-3 font-medium">Citta</th>
              <th className="px-4 py-3 font-medium">Paese</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium text-right">Rating</th>
              <th className="px-4 py-3 font-medium text-right">Segnalazioni</th>
              <th className="px-4 py-3 font-medium text-right">Azioni</th>
            </tr>
          </thead>
          <tbody>
            {restaurants.map((r) => (
              <tr key={r.googlePlaceId} className="border-t hover:bg-gray-50">
                <td className="px-4 py-3">
                  <Link href={`/restaurants/${r.googlePlaceId}`} className="text-blue-600 hover:underline">
                    {r.name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-gray-500">{r.city}</td>
                <td className="px-4 py-3 text-gray-500">{r.country}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={r.status} />
                </td>
                <td className="px-4 py-3 text-right">
                  {r.ratingCount > 0 ? (
                    <span>{r.averageRating.toFixed(1)} <span className="text-gray-400">({r.ratingCount})</span></span>
                  ) : (
                    <span className="text-gray-300">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">{r.reportCount ?? 0}</td>
                <td className="px-4 py-3 text-right">
                  {r.status !== 'active' && (
                    <button
                      onClick={() => changeStatus(r.googlePlaceId, 'active')}
                      className="text-green-600 hover:underline text-xs mr-2"
                    >
                      Approva
                    </button>
                  )}
                  {r.status !== 'removed' && (
                    <button
                      onClick={() => changeStatus(r.googlePlaceId, 'removed')}
                      className="text-red-600 hover:underline text-xs"
                    >
                      Rimuovi
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {loading && <p className="text-gray-500 mt-4">Caricamento...</p>}

      {hasMore && !loading && (
        <button
          onClick={() => loadRestaurants(true)}
          className="mt-4 px-4 py-2 bg-white border rounded text-sm hover:bg-gray-50"
        >
          Carica altri
        </button>
      )}
    </div>
  );
}
