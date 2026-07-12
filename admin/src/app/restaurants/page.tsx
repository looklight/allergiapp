'use client';

import { useEffect, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { supabase } from '@/lib/supabase';
import { deleteRestaurantWithCleanup } from '@/lib/storageCleanup';
import { confirmDestructive } from '@/lib/confirm';
import { getCountryName } from '@/lib/countryName';
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

type SortBy = 'created_desc' | 'city_asc' | 'reviews_desc';

export default function RestaurantsPage() {
  const [countries, setCountries] = useState<{ code: string; name: string; count: number }[]>([]);
  const [countryFilter, setCountryFilter] = useState<string>('all');
  const [stats, setStats] = useState<CountryStats | null>(null);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<SortBy>('created_desc');
  const [zeroReviewsOnly, setZeroReviewsOnly] = useState(false);
  // Posizione fixed: il menu deve sfuggire all'overflow-hidden/overflow-x-auto
  // dei contenitori tabella, altrimenti con poche righe viene tagliato.
  const [reviewsMenuPos, setReviewsMenuPos] = useState<{ top: number; right: number } | null>(null);
  const [showMap, setShowMap] = useState(false);
  const [mapRestaurants, setMapRestaurants] = useState<MapRestaurant[]>([]);

  const fetchRestaurants = useCallback(async (pageNum: number) => {
    if (!zeroReviewsOnly) {
      const { data } = await supabase.rpc('get_restaurants_admin', {
        page_limit: PAGE_SIZE + 1,
        page_offset: pageNum * PAGE_SIZE,
        country_filter: countryFilter === 'all' ? null : countryFilter,
        search_query: search.trim() || null,
        sort_by: sortBy,
      });
      return (data ?? []) as Restaurant[];
    }

    // "Senza recensioni" non passa dalla RPC (non ha questo filtro): anti-join
    // PostgREST — left embed su reviews + is null tiene solo i ristoranti
    // senza alcuna recensione. I conteggi recensioni/foto sono 0 per definizione.
    let query = supabase
      .from('restaurants')
      .select('id, name, address, city, country, country_code, cuisine_types, created_at, reviews!left(id), menu_photos(count)')
      .is('reviews', null);
    if (countryFilter !== 'all') query = query.eq('country_code', countryFilter);
    const q = search.trim();
    if (q) query = query.or(`name.ilike.%${q}%,city.ilike.%${q}%`);
    query = sortBy === 'city_asc'
      ? query.order('city', { ascending: true, nullsFirst: false })
      : query.order('created_at', { ascending: false });
    const from = pageNum * PAGE_SIZE;
    const { data } = await query.range(from, from + PAGE_SIZE);
    return (data ?? []).map((row: any) => {
      const { reviews: _reviews, menu_photos, ...rest } = row;
      return {
        ...rest,
        review_count: 0,
        review_photo_count: 0,
        menu_photo_count: menu_photos?.[0]?.count ?? 0,
        average_rating: 0,
      };
    }) as Restaurant[];
  }, [countryFilter, search, sortBy, zeroReviewsOnly]);

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
              map.set(code, { name: getCountryName(code, r.country as string), count: 1 });
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
  }, [countryFilter, search, sortBy, zeroReviewsOnly]);

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
          country: getCountryName(d?.country_code, d?.country) || null,
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
            showMap ? 'bg-selected text-selected-foreground' : 'bg-card border text-foreground-secondary hover:bg-muted'
          }`}
        >
          {showMap ? 'Chiudi mappa' : 'Vedi su mappa'}
        </button>
      </div>

      {showMap && (
        <div className="fixed inset-0 z-50 bg-card flex flex-col">
          <div className="flex items-center gap-3 px-4 py-3 border-b">
            <button
              onClick={() => setShowMap(false)}
              className="px-3 py-1.5 bg-selected text-selected-foreground rounded text-sm hover:bg-selected-hover"
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
              ? 'bg-selected text-selected-foreground'
              : 'bg-card border text-foreground-secondary hover:bg-muted'
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
                ? 'bg-selected text-selected-foreground'
                : 'bg-card border text-foreground-secondary hover:bg-muted'
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
        className="w-full max-w-md px-4 py-2 mb-4 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
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
      <div className="bg-card rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-background text-left">
            <tr>
              <th className="px-4 py-3 font-medium">Nome</th>
              <th className="px-4 py-3 font-medium">
                <button
                  type="button"
                  onClick={() => setSortBy('city_asc')}
                  className="inline-flex items-center gap-1 -mx-2 px-2 py-1 rounded hover:bg-muted"
                >
                  Citta
                  <span className="text-faint text-xs w-3 text-center">
                    {sortBy === 'city_asc' ? '▲' : ''}
                  </span>
                </button>
              </th>
              {countryFilter === 'all' && <th className="px-4 py-3 font-medium">Paese</th>}
              <th className="px-4 py-3 font-medium">Cucina</th>
              <th className="px-4 py-3 font-medium text-right">
                <button
                  type="button"
                  onClick={(e) => {
                    if (reviewsMenuPos) { setReviewsMenuPos(null); return; }
                    const rect = e.currentTarget.getBoundingClientRect();
                    setReviewsMenuPos({
                      top: rect.bottom + 4,
                      right: document.documentElement.clientWidth - rect.right,
                    });
                  }}
                  className={`inline-flex items-center gap-1 -mx-2 px-2 py-1 rounded ${
                    zeroReviewsOnly ? 'bg-selected text-selected-foreground hover:bg-selected-hover' : 'hover:bg-muted'
                  }`}
                >
                  Recensioni
                  {zeroReviewsOnly ? (
                    <span className="text-xs">= 0</span>
                  ) : (
                    <span className="text-faint text-xs w-3 text-center">
                      {sortBy === 'reviews_desc' ? '▼' : ''}
                    </span>
                  )}
                </button>
                {reviewsMenuPos && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setReviewsMenuPos(null)} />
                    <div
                      className="fixed z-20 w-60 bg-card border rounded-lg shadow-lg py-1 text-left font-normal normal-case"
                      style={{ top: reviewsMenuPos.top, right: reviewsMenuPos.right }}
                    >
                      <button
                        type="button"
                        onClick={() => { setSortBy('reviews_desc'); setZeroReviewsOnly(false); setReviewsMenuPos(null); }}
                        className={`flex w-full items-center gap-2 text-left px-3 py-2 text-sm hover:bg-muted ${
                          sortBy === 'reviews_desc' && !zeroReviewsOnly ? 'text-foreground font-medium' : 'text-foreground-secondary'
                        }`}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                          <line x1="3" y1="6" x2="16" y2="6" />
                          <line x1="3" y1="12" x2="12" y2="12" />
                          <line x1="3" y1="18" x2="8" y2="18" />
                          <polyline points="19 10 19 20" />
                          <polyline points="16 17 19 20 22 17" />
                        </svg>
                        Ordina per più recensiti
                      </button>
                      <button
                        type="button"
                        onClick={() => { setZeroReviewsOnly((v) => !v); setReviewsMenuPos(null); }}
                        className={`flex w-full items-center gap-2 text-left px-3 py-2 text-sm hover:bg-muted ${
                          zeroReviewsOnly ? 'text-foreground font-medium' : 'text-foreground-secondary'
                        }`}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                          <line x1="4" y1="4" x2="20" y2="18" />
                        </svg>
                        {zeroReviewsOnly ? 'Mostra tutti' : 'Solo senza recensioni'}
                      </button>
                    </div>
                  </>
                )}
              </th>
              <th className="px-4 py-3 font-medium text-right" title="Foto nelle recensioni">Foto</th>
              <th className="px-4 py-3 font-medium text-right" title="Foto del menu">Menu</th>
              <th className="px-4 py-3 font-medium">
                <button
                  type="button"
                  onClick={() => setSortBy('created_desc')}
                  className="inline-flex items-center gap-1 -mx-2 px-2 py-1 rounded hover:bg-muted"
                >
                  Data
                  <span className="text-faint text-xs w-3 text-center">
                    {sortBy === 'created_desc' ? '▼' : ''}
                  </span>
                </button>
              </th>
              <th className="px-4 py-3 font-medium text-right">Azioni</th>
            </tr>
          </thead>
          <tbody>
            {restaurants.map((r) => (
              <tr key={r.id} className="border-t hover:bg-background">
                <td className="px-4 py-3 max-w-[220px]">
                  <Link
                    href={`/restaurants/${r.id}`}
                    className="text-primary hover:underline block truncate"
                    title={r.name}
                  >
                    {r.name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{r.city ?? '—'}</td>
                {countryFilter === 'all' && <td className="px-4 py-3 text-muted-foreground">{getCountryName(r.country_code, r.country) || '—'}</td>}
                <td className="px-4 py-3 text-muted-foreground">
                  {r.cuisine_types?.join(', ') || '—'}
                </td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {(r.review_count ?? 0) > 0 ? (
                    <span className="font-medium text-foreground-secondary">{r.review_count}</span>
                  ) : (
                    <span className="text-faint">0</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                  {(r.review_photo_count ?? 0) > 0 ? r.review_photo_count : <span className="text-faint">—</span>}
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                  {(r.menu_photo_count ?? 0) > 0 ? r.menu_photo_count : <span className="text-faint">—</span>}
                </td>
                <td className="px-4 py-3 text-faint text-xs">
                  {new Date(r.created_at).toLocaleDateString('it-IT')}
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => deleteRestaurant(r)}
                    className="text-danger hover:text-danger-strong p-1 -m-1"
                    title="Elimina ristorante"
                    aria-label="Elimina ristorante"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                      <path d="M10 11v6M14 11v6" />
                      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                    </svg>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
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
