'use client';

import { useEffect, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { supabase } from '@/lib/supabase';
import { deleteRestaurantWithCleanup } from '@/lib/storageCleanup';
import { confirmDestructive } from '@/lib/confirm';
import type { Restaurant } from '@/lib/types';
import type { MapRestaurant } from '@/components/map/RestaurantMap';
import StatCard from '@/components/StatCard';
import { usePagination, PAGE_SIZE } from '@/hooks/usePagination';
import Link from 'next/link';

const RestaurantMap = dynamic(() => import('@/components/map/RestaurantMap'), { ssr: false });

interface CountryStats {
  restaurant_count: number;
  review_count: number;
  average_rating: number;
  favorite_count: number;
  city_count: number;
}

export default function RestaurantsPage() {
  const [countries, setCountries] = useState<{ code: string; name: string; count: number }[]>([]);
  const [countryFilter, setCountryFilter] = useState<string>('all');
  const [stats, setStats] = useState<CountryStats | null>(null);
  const [search, setSearch] = useState('');
  const [showMap, setShowMap] = useState(false);
  const [mapRestaurants, setMapRestaurants] = useState<MapRestaurant[]>([]);

  const fetchRestaurants = useCallback(async (pageNum: number) => {
    let query = supabase
      .from('restaurants')
      .select('id, name, address, city, country, country_code, cuisine_types, created_at, reviews(count), menu_photos(count)')
      .order('created_at', { ascending: false })
      .range(pageNum * PAGE_SIZE, (pageNum + 1) * PAGE_SIZE);

    if (countryFilter !== 'all') {
      query = query.eq('country_code', countryFilter);
    }

    if (search.trim()) {
      const term = `%${search.trim()}%`;
      query = query.or(`name.ilike.${term},city.ilike.${term}`);
    }

    const { data } = await query;
    return (data ?? []).map((r: any) => ({
      ...r,
      review_count: r.reviews?.[0]?.count ?? 0,
      menu_photo_count: r.menu_photos?.[0]?.count ?? 0,
      reviews: undefined,
      menu_photos: undefined,
    })) as Restaurant[];
  }, [countryFilter, search]);

  const { items: restaurants, setItems: setRestaurants, loading, hasMore, loadMore, reset } =
    usePagination<Restaurant>({ fetchPage: fetchRestaurants });

  // Carica lista paesi con conteggio (raggruppati per country_code)
  useEffect(() => {
    supabase
      .from('restaurants')
      .select('country, country_code')
      .not('country_code', 'is', null)
      .then(({ data }) => {
        if (data) {
          const map = new Map<string, { name: string; count: number }>();
          for (const r of data) {
            const code = r.country_code as string;
            const existing = map.get(code);
            if (existing) {
              existing.count++;
            } else {
              map.set(code, { name: r.country as string, count: 1 });
            }
          }
          const sorted = [...map.entries()]
            .sort((a, b) => b[1].count - a[1].count)
            .map(([code, { name, count }]) => ({ code, name, count }));
          setCountries(sorted);
        }
      });
  }, []);

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
    reset();
    loadStats();
    if (showMap) loadMapData();
  }, [countryFilter, search]);

  const loadMapData = async () => {
    // RPC restituisce id + lat/lng (leggera)
    const { data: positions } = await supabase.rpc('get_all_restaurant_positions');
    if (!positions) { setMapRestaurants([]); return; }

    // Arricchisci con nome/city/country/country_code
    const ids = positions.map((r: any) => r.id);
    const { data: details } = await supabase
      .from('restaurants')
      .select('id, name, city, country, country_code')
      .in('id', ids);

    const detailMap = new Map((details ?? []).map((d: any) => [d.id, d]));

    setMapRestaurants(positions
      .map((r: any) => {
        const d = detailMap.get(r.id);
        return {
          id: r.id,
          latitude: r.latitude,
          longitude: r.longitude,
          name: d?.name ?? '—',
          city: d?.city ?? null,
          country: d?.country ?? null,
          country_code: d?.country_code ?? null,
          average_rating: 0,
        };
      })
      .filter((r: any) => countryFilter === 'all' || r.country_code === countryFilter)
    );
  };

  const deleteRestaurant = async (restaurant: Restaurant) => {
    if (!confirmDestructive(`Eliminerai definitivamente il ristorante "${restaurant.name}". Tutte le segnalazioni, recensioni e foto associate verranno rimosse.`)) return;
    const { error } = await deleteRestaurantWithCleanup(supabase, restaurant.id);
    if (error) {
      alert(`Errore durante l'eliminazione: ${error}`);
      return;
    }
    setRestaurants((prev) => prev.filter((r) => r.id !== restaurant.id));
    loadStats();
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <h1 className="text-2xl font-bold">Ristoranti</h1>
        <button
          onClick={() => { setShowMap(!showMap); if (!showMap) loadMapData(); }}
          className={`px-3 py-1.5 rounded text-sm transition-colors ${
            showMap ? 'bg-gray-900 text-white' : 'bg-white border text-gray-600 hover:bg-gray-100'
          }`}
        >
          {showMap ? 'Chiudi mappa' : 'Vedi su mappa'}
        </button>
      </div>

      {showMap && (
        <div className="fixed inset-0 z-50 bg-white flex flex-col">
          <div className="flex items-center gap-3 px-4 py-3 border-b">
            <button
              onClick={() => setShowMap(false)}
              className="px-3 py-1.5 bg-gray-900 text-white rounded text-sm hover:bg-gray-800"
            >
              Chiudi mappa
            </button>
            <h2 className="font-semibold">
              Mappa ristoranti{countryFilter !== 'all' ? ` — ${countries.find(c => c.code === countryFilter)?.name ?? countryFilter}` : ''}
            </h2>
          </div>
          <div className="flex-1">
            <RestaurantMap restaurants={mapRestaurants} />
          </div>
        </div>
      )}

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
            key={c.code}
            onClick={() => setCountryFilter(c.code)}
            className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
              countryFilter === c.code
                ? 'bg-gray-900 text-white'
                : 'bg-white border text-gray-600 hover:bg-gray-100'
            }`}
          >
            {c.name} <span className="text-xs opacity-60">{c.count}</span>
          </button>
        ))}
      </div>

      {/* Cerca */}
      <input
        type="text"
        placeholder="Cerca per nome o citta..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full max-w-md px-4 py-2 mb-4 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
      />

      {/* Stats cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-5">
          <StatCard label="Ristoranti" value={stats.restaurant_count} />
          <StatCard label="Recensioni" value={stats.review_count} />
          <StatCard label="Rating medio" value={stats.average_rating.toFixed(1)} />
          <StatCard label="Preferiti" value={stats.favorite_count} />
          <StatCard label="Citta" value={stats.city_count} />
        </div>
      )}

      {/* Tabella */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left">
            <tr>
              <th className="px-4 py-3 font-medium">Nome</th>
              <th className="px-4 py-3 font-medium">Citta</th>
              {countryFilter === 'all' && <th className="px-4 py-3 font-medium">Paese</th>}
              <th className="px-4 py-3 font-medium">Cucina</th>
              <th className="px-4 py-3 font-medium text-center">Media</th>
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
                <td className="px-4 py-3 text-center">
                  {((r.review_count ?? 0) > 0 || (r.menu_photo_count ?? 0) > 0) ? (
                    <span className="text-xs text-gray-500">
                      {(r.review_count ?? 0) > 0 && <span title="Foto recensioni">{r.review_count} foto</span>}
                      {(r.review_count ?? 0) > 0 && (r.menu_photo_count ?? 0) > 0 && ' · '}
                      {(r.menu_photo_count ?? 0) > 0 && <span title="Foto menu">{r.menu_photo_count} menu</span>}
                    </span>
                  ) : (
                    <span className="text-gray-300 text-xs">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-gray-400 text-xs">
                  {new Date(r.created_at).toLocaleDateString('it-IT')}
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => deleteRestaurant(r)}
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
