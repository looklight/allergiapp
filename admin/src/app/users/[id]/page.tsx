'use client';

import { useEffect, useState } from 'react';
import { doc, getDoc, collection, query, where, orderBy, getDocs, limit, collectionGroup, documentId } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { UserProfile, Restaurant, Contribution } from '@/lib/types';
import Link from 'next/link';
import { useParams } from 'next/navigation';

export default function UserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [contributions, setContributions] = useState<(Contribution & { restaurantId?: string; restaurantName?: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    async function load() {
      try {
        // Profilo utente
        const userSnap = await getDoc(doc(db, 'users', id));
        if (!userSnap.exists()) {
          setLoading(false);
          return;
        }
        setUser({ ...userSnap.data(), uid: userSnap.id } as UserProfile);

        // Ristoranti e contributi in parallelo
        const [restSnap, contribSnap] = await Promise.all([
          getDocs(
            query(
              collection(db, 'restaurants'),
              where('addedBy', '==', id),
              orderBy('addedAt', 'desc'),
              limit(50)
            )
          ),
          getDocs(
            query(
              collectionGroup(db, 'contributions'),
              where('userId', '==', id),
              where('status', '==', 'active'),
              orderBy('createdAt', 'desc'),
              limit(50)
            )
          ),
        ]);

        const restList = restSnap.docs.map(
          (d) => ({ ...d.data(), googlePlaceId: d.id } as Restaurant)
        );
        setRestaurants(restList);

        // Mappa restaurantId → name per i contributi
        const restNames = new Map(restList.map((r) => [r.googlePlaceId, r.name]));

        const contribList = contribSnap.docs.map((d) => {
          const restaurantId = d.ref.parent.parent?.id;
          return {
            ...d.data(),
            id: d.id,
            restaurantId,
            restaurantName: restaurantId ? restNames.get(restaurantId) : undefined,
          } as Contribution & { restaurantId?: string; restaurantName?: string };
        });
        setContributions(contribList);

        // Per i contributi su ristoranti non aggiunti da questo utente, carica i nomi mancanti
        // in batch (Firestore 'in' supporta max 30 valori)
        const missingIds = [...new Set(
          contribList
            .filter((c) => c.restaurantId && !c.restaurantName)
            .map((c) => c.restaurantId!)
        )];

        if (missingIds.length > 0) {
          const chunks = [];
          for (let i = 0; i < missingIds.length; i += 30) {
            chunks.push(missingIds.slice(i, i + 30));
          }
          const batchResults = await Promise.all(
            chunks.map((chunk) =>
              getDocs(query(collection(db, 'restaurants'), where(documentId(), 'in', chunk)))
            )
          );
          for (const snap of batchResults) {
            for (const d of snap.docs) {
              restNames.set(d.id, d.data().name);
            }
          }
          setContributions((prev) =>
            prev.map((c) => ({
              ...c,
              restaurantName: c.restaurantId ? restNames.get(c.restaurantId) : undefined,
            }))
          );
        }
      } catch (err) {
        console.error('Errore caricamento utente:', err);
        setError(err instanceof Error ? err.message : 'Errore sconosciuto');
      }
      setLoading(false);
    }
    load();
  }, [id]);

  const formatDate = (ts: UserProfile['createdAt']) => {
    if (!ts?.toDate) return '—';
    return ts.toDate().toLocaleDateString('it-IT');
  };

  if (loading) {
    return <p className="text-gray-500">Caricamento...</p>;
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
        <p className="font-medium">Errore:</p>
        <p>{error}</p>
      </div>
    );
  }

  if (!user) {
    return <p className="text-red-500">Utente non trovato</p>;
  }

  return (
    <div>
      <Link href="/users" className="text-blue-600 hover:underline text-sm">&larr; Torna alla lista</Link>

      {/* Profilo */}
      <div className="bg-white rounded-lg shadow p-6 mt-4 mb-6">
        <div className="flex items-center gap-4">
          {user.photoURL ? (
            <img src={user.photoURL} alt="" className="w-16 h-16 rounded-full" />
          ) : (
            <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center text-2xl text-gray-500">
              {(user.displayName || '?')[0].toUpperCase()}
            </div>
          )}
          <div>
            <h1 className="text-2xl font-bold">{user.displayName || 'Anonimo'}</h1>
            <p className="text-gray-500">{user.email}</p>
            <p className="text-sm text-gray-400">Registrato il {formatDate(user.createdAt)}</p>
          </div>
        </div>

        {/* Contatori */}
        <div className="grid grid-cols-3 gap-4 mt-6">
          <div className="text-center">
            <p className="text-2xl font-bold">{user.restaurantsAdded ?? 0}</p>
            <p className="text-sm text-gray-500">Ristoranti</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold">{user.dishesAdded ?? 0}</p>
            <p className="text-sm text-gray-500">Piatti</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold">{user.reviewsAdded ?? 0}</p>
            <p className="text-sm text-gray-500">Recensioni</p>
          </div>
        </div>
      </div>

      {/* Ristoranti aggiunti */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <h2 className="font-semibold mb-3">Ristoranti aggiunti ({user.restaurantsAdded ?? 0})</h2>
        {restaurants.length === 0 ? (
          <p className="text-sm text-gray-400">Nessun ristorante aggiunto</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left">
              <tr>
                <th className="px-4 py-2 font-medium">Nome</th>
                <th className="px-4 py-2 font-medium">Citta</th>
                <th className="px-4 py-2 font-medium">Data</th>
              </tr>
            </thead>
            <tbody>
              {restaurants.map((r) => (
                <tr key={r.googlePlaceId} className="border-t">
                  <td className="px-4 py-2">
                    <Link href={`/restaurants/${r.googlePlaceId}`} className="text-blue-600 hover:underline">
                      {r.name}
                    </Link>
                  </td>
                  <td className="px-4 py-2 text-gray-500">{r.city}</td>
                  <td className="px-4 py-2 text-gray-500">{formatDate(r.addedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Contributi */}
      <div className="bg-white rounded-lg shadow p-4">
        <h2 className="font-semibold mb-3">Contributi ({(user.dishesAdded ?? 0) + (user.reviewsAdded ?? 0)})</h2>
        {contributions.length === 0 ? (
          <p className="text-sm text-gray-400">Nessun contributo</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left">
              <tr>
                <th className="px-4 py-2 font-medium">Ristorante</th>
                <th className="px-4 py-2 font-medium">Rating</th>
                <th className="px-4 py-2 font-medium">Piatti</th>
                <th className="px-4 py-2 font-medium">Data</th>
              </tr>
            </thead>
            <tbody>
              {contributions.map((c) => (
                <tr key={c.id} className="border-t">
                  <td className="px-4 py-2">
                    {c.restaurantId ? (
                      <Link href={`/restaurants/${c.restaurantId}`} className="text-blue-600 hover:underline">
                        {c.restaurantName || c.restaurantId}
                      </Link>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="px-4 py-2">{c.rating ? `${c.rating}/5` : '—'}</td>
                  <td className="px-4 py-2">{c.dishes?.length ?? 0}</td>
                  <td className="px-4 py-2 text-gray-500">{formatDate(c.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
