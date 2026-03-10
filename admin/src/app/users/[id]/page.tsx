'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import type { UserProfile, Restaurant, Review } from '@/lib/types';
import Link from 'next/link';

export default function UserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    async function load() {
      // Profilo utente con email (via RPC admin-only)
      const { data: profileRows } = await supabase.rpc('get_profile_with_email', {
        target_user_id: id,
      });

      const profileData = profileRows?.[0];
      if (!profileData) {
        setLoading(false);
        return;
      }
      setUser(profileData as UserProfile);

      // Ristoranti aggiunti e recensioni in parallelo
      const [restRes, reviewsRes] = await Promise.all([
        supabase
          .from('restaurants')
          .select('id, name, city, country, created_at')
          .eq('added_by', id)
          .order('created_at', { ascending: false })
          .limit(50),
        supabase
          .from('reviews')
          .select('id, restaurant_id, rating, comment, photos, created_at, restaurants!inner(name)')
          .eq('user_id', id)
          .order('created_at', { ascending: false })
          .limit(50),
      ]);

      setRestaurants((restRes.data ?? []) as Restaurant[]);
      setReviews((reviewsRes.data ?? []).map((r: any) => ({
        ...r,
        restaurant_name: r.restaurants?.name ?? null,
        restaurants: undefined,
      })));

      setLoading(false);
    }
    load();
  }, [id]);

  if (loading) return <p className="text-gray-500">Caricamento...</p>;
  if (!user) return <p className="text-red-500">Utente non trovato</p>;

  return (
    <div>
      <Link href="/users" className="text-blue-600 hover:underline text-sm">&larr; Torna alla lista</Link>

      {/* Profilo */}
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

        {/* Contatori */}
        <div className="grid grid-cols-2 gap-4 mt-6">
          <div className="text-center">
            <p className="text-2xl font-bold">{restaurants.length}</p>
            <p className="text-sm text-gray-500">Ristoranti</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold">{reviews.length}</p>
            <p className="text-sm text-gray-500">Recensioni</p>
          </div>
        </div>
      </div>

      {/* Ristoranti aggiunti */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <h2 className="font-semibold mb-3">Ristoranti aggiunti ({restaurants.length})</h2>
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
                <tr key={r.id} className="border-t">
                  <td className="px-4 py-2">
                    <Link href={`/restaurants/${r.id}`} className="text-blue-600 hover:underline">
                      {r.name}
                    </Link>
                  </td>
                  <td className="px-4 py-2 text-gray-500">{r.city}</td>
                  <td className="px-4 py-2 text-gray-500">
                    {new Date(r.created_at).toLocaleDateString('it-IT')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Recensioni */}
      <div className="bg-white rounded-lg shadow p-4">
        <h2 className="font-semibold mb-3">Recensioni ({reviews.length})</h2>
        {reviews.length === 0 ? (
          <p className="text-sm text-gray-400">Nessuna recensione</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left">
              <tr>
                <th className="px-4 py-2 font-medium">Ristorante</th>
                <th className="px-4 py-2 font-medium">Rating</th>
                <th className="px-4 py-2 font-medium">Commento</th>
                <th className="px-4 py-2 font-medium">Data</th>
              </tr>
            </thead>
            <tbody>
              {reviews.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="px-4 py-2">
                    <Link href={`/restaurants/${r.restaurant_id}`} className="text-blue-600 hover:underline">
                      {r.restaurant_name || '—'}
                    </Link>
                  </td>
                  <td className="px-4 py-2">
                    {r.rating > 0 ? <span className="text-yellow-600">{'★'.repeat(r.rating)}</span> : '—'}
                  </td>
                  <td className="px-4 py-2 text-gray-600 max-w-xs truncate">{r.comment || '—'}</td>
                  <td className="px-4 py-2 text-gray-500">
                    {new Date(r.created_at).toLocaleDateString('it-IT')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
