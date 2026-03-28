'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { deleteRestaurantWithCleanup } from '@/lib/storageCleanup';
import type { Restaurant } from '@/lib/types';
import Link from 'next/link';

const PAGE_SIZE = 25;

interface CountryStats {
  restaurant_count: number;
  review_count: number;
  average_rating: number;
  favorite_count: number;
  city_count: number;
}

export default function RestaurantsPage() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [countries, setCountries] = useState<{ name: string; count: number }[]>([]);
  const [countryFilter, setCountryFilter] = useState<string>('all');
  const [stats, setStats] = useState<CountryStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  // Carica lista paesi con conteggio
  useEffect(() => {
    supabase
      .from('restaurants')
      .select('country')
      .not('country', 'is', null)
      .then(({ data }) => {
        if (data) {
          const counts = new Map<string, number>();
          for (const r of data) {
            const c = r.country as string;
            counts.set(c, (counts.get(c) ?? 0) + 1);
          }
          const sorted = [...counts.entries()]
            .sort((a, b) => b[1] - a[1])
            .map(([name, count]) => ({ name, count }));
          setCountries(sorted);
        }
      });
  }, []);

  const loadRestaurants = async (pageNum: number, append = false) => {
    setLoading(true);

    let query = supabase
      .from('restaurants')
      .select('id, name, address, city, country, cuisine_types, created_at')
      .order('created_at', { ascending: false })
      .range(pageNum * PAGE_SIZE, (pageNum + 1) * PAGE_SIZE);

    if (countryFilter !== 'all') {
      query = query.eq('country', countryFilter);
    }

    const { data } = await query;
    const items = (data ?? []) as Restaurant[];
    setHasMore(items.length > PAGE_SIZE);
    const pageItems = items.slice(0, PAGE_SIZE);

    if (append) {
      setRestaurants((prev) => [...prev, ...pageItems]);
    } else {
      setRestaurants(pageItems);
    }
    setLoading(false);
  };

  const loadStats = async () => {
    const { data } = await supabase.rpc('get_restaurant_country_stats', {
      filter_country: countryFilter === 'all' ? null : countryFilter,
    });
    if (data && data.length > 0) {
      setStats({
        restaurant_count: Number(data[0].restaurant_count),
        review_count: Number(data[0].review_count),
        average_rating: Number(data[0].average_rating),
        favorite_count: Number(data[0].favorite_count),
        city_count: Number(data[0].city_count),
      });
    }
  };

  useEffect(() => {
    setPage(0);
    loadRestaurants(0);
    loadStats();
  }, [countryFilter]);

  const loadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    loadRestaurants(nextPage, true);
  };

  const deleteRestaurant = async (id: string) => {
    if (!confirm('Eliminare definitivamente questo ristorante?')) return;
    const { error } = await deleteRestaurantWithCleanup(supabase, id);
    if (error) {
      alert(`Errore durante l'eliminazione: ${error}`);
      return;
    }
    setRestaurants((prev) => prev.filter((r) => r.id !== id));
    loadStats();
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Ristoranti</h1>

      {/* Filtro paesi */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <button
          onClick={() => setCountryFilter('all')}
          className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
            countryFilter === 'all'
              ? 'bg-gray-900 text-white'
              : 'bg-white border text-gray-600 hover:bg-gray-100'
          }`}
        >
          Tutti i paesi
        </button>
        {countries.map((c) => (
          <button
            key={c.name}
            onClick={() => setCountryFilter(c.name)}
            className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
              countryFilter === c.name
                ? 'bg-gray-900 text-white'
                : 'bg-white border text-gray-600 hover:bg-gray-100'
            }`}
          >
            {c.name} <span className="text-xs opacity-60">{c.count}</span>
          </button>
        ))}
      </div>

      {/* Stats cards */}
      {stats && (
        <div className="grid grid-cols-5 gap-3 mb-5">
          <StatCard label="Ristoranti" value={stats.restaurant_count} />
          <StatCard label="Recensioni" value={stats.review_count} />
          <StatCard label="Rating medio" value={stats.average_rating.toFixed(1)} />
          <StatCard label="Preferiti" value={stats.favorite_count} />
          <StatCard label="Citta" value={stats.city_count} />
        </div>
      )}

      {/* Tabella */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left">
            <tr>
              <th className="px-4 py-3 font-medium">Nome</th>
              <th className="px-4 py-3 font-medium">Citta</th>
              {countryFilter === 'all' && <th className="px-4 py-3 font-medium">Paese</th>}
              <th className="px-4 py-3 font-medium">Cucina</th>
              <th className="px-4 py-3 font-medium">Data</th>
              <th className="px-4 py-3 font-medium text-right">Azioni</th>
            </tr>
          </thead>
          <tbody>
            {restaurants.map((r) => (
              <tr key={r.id} className="border-t hover:bg-gray-50">
                <td className="px-4 py-3">
                  <Link href={`/restaurants/${r.id}`} className="text-blue-600 hover:underline">
                    {r.name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-gray-500">{r.city ?? '—'}</td>
                {countryFilter === 'all' && <td className="px-4 py-3 text-gray-500">{r.country ?? '—'}</td>}
                <td className="px-4 py-3 text-gray-500">
                  {r.cuisine_types?.join(', ') || '—'}
                </td>
                <td className="px-4 py-3 text-gray-400 text-xs">
                  {new Date(r.created_at).toLocaleDateString('it-IT')}
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => deleteRestaurant(r.id)}
                    className="text-red-600 hover:underline text-xs"
                  >
                    Elimina
                  </button>
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

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-white rounded-lg shadow p-4">
      <p className="text-xs text-gray-400 uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-bold text-gray-800 mt-1">{value}</p>
    </div>
  );
}
