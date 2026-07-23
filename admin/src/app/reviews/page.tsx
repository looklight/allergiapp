'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { safeCount } from '@/lib/safeQuery';
import { flattenJoinAll } from '@/lib/flattenJoin';
import { deleteReviewWithCleanup } from '@/lib/storageCleanup';
import { confirmDestructive } from '@/lib/confirm';
import { useLightbox } from '@/contexts/LightboxContext';
import { usePagination, PAGE_SIZE } from '@/hooks/usePagination';
import StatCard from '@/components/StatCard';
import DietaryBadges from '@/components/DietaryBadges';
import type { Review } from '@/lib/types';

type ReviewRow = Review & {
  reviewer_is_anonymous?: boolean | null;
  /** Numero totale di recensioni fatte dall'autore. */
  reviewer_review_count?: number;
  /** Numero totale di recensioni ricevute dal ristorante. */
  restaurant_review_count?: number;
  /** Punteggio medio del ristorante (calcolato client-side dalle recensioni). */
  restaurant_avg_rating?: number;
};

interface ReviewStats {
  total: number;
  average: number;
  last7days: number;
  /** Conteggi indicizzati 1..5 (indice 0 inutilizzato). */
  byRating: number[];
}

const JOIN_MAPPING = {
  profiles: { username: 'reviewer_name', is_anonymous: 'reviewer_is_anonymous' },
  restaurants: { name: 'restaurant_name', city: 'restaurant_city', country: 'restaurant_country' },
};

/** Evidenzia le occorrenze di `term` in `text` (case-insensitive). */
function highlightMatch(text: string, term: string) {
  const q = term.trim();
  if (!q) return text;
  const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = text.split(new RegExp(`(${escaped})`, 'gi'));
  return parts.map((part, i) =>
    part.toLowerCase() === q.toLowerCase() ? (
      <mark key={i} className="bg-star/30 text-inherit rounded px-0.5">
        {part}
      </mark>
    ) : (
      part
    ),
  );
}

export default function ReviewsPage() {
  const [search, setSearch] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [ratingFilter, setRatingFilter] = useState<number | null>(null);
  const [stats, setStats] = useState<ReviewStats | null>(null);
  const { open: openLightbox } = useLightbox();

  const fetchReviews = useCallback(async (pageNum: number): Promise<ReviewRow[]> => {
    const from = pageNum * PAGE_SIZE;
    const to = from + PAGE_SIZE; // PAGE_SIZE + 1 righe per rilevare hasMore

    // Filtro per utente: trova gli id col username corrispondente, poi filtra le recensioni.
    let userIds: string[] | null = null;
    if (userSearch.trim()) {
      const { data: matched } = await supabase
        .from('profiles')
        .select('id')
        .ilike('username', `%${userSearch.trim()}%`);
      userIds = (matched ?? []).map((m) => m.id as string);
      if (userIds.length === 0) return []; // nessun utente corrisponde → nessuna recensione
    }

    let query = supabase
      .from('reviews')
      .select(
        'id, restaurant_id, user_id, rating, comment, photos, allergens_snapshot, dietary_snapshot, likes_count, created_at, ' +
        'profiles!user_id(username, is_anonymous), restaurants!restaurant_id(name, city, country)',
      );

    if (ratingFilter !== null) query = query.eq('rating', ratingFilter);
    if (search.trim()) query = query.ilike('comment', `%${search.trim()}%`);
    if (userIds) query = query.in('user_id', userIds);

    query = query.order('created_at', { ascending: false });

    const { data } = await query.range(from, to);
    const rows = flattenJoinAll((data ?? []) as Record<string, any>[], JOIN_MAPPING) as ReviewRow[];

    // Conteggio totale recensioni per autore (una sola query per gli utenti di questa pagina)
    const ids = [...new Set(rows.map((r) => r.user_id).filter((id): id is string => !!id))];
    if (ids.length > 0) {
      const { data: authored } = await supabase.from('reviews').select('user_id').in('user_id', ids);
      const counts = new Map<string, number>();
      for (const a of (authored ?? []) as { user_id: string }[]) {
        counts.set(a.user_id, (counts.get(a.user_id) ?? 0) + 1);
      }
      for (const r of rows) {
        if (r.user_id) r.reviewer_review_count = counts.get(r.user_id) ?? 0;
      }
    }

    // Conteggio totale recensioni per ristorante (una sola query per i ristoranti di questa pagina)
    const restaurantIds = [
      ...new Set(rows.map((r) => r.restaurant_id).filter((id): id is string => !!id)),
    ];
    if (restaurantIds.length > 0) {
      // Selezioniamo anche `rating`: la media è quindi gratis (nessuna query in più).
      const { data: byRestaurant } = await supabase
        .from('reviews')
        .select('restaurant_id, rating')
        .in('restaurant_id', restaurantIds);
      const restaurantCounts = new Map<string, number>();
      const restaurantSums = new Map<string, number>();
      for (const a of (byRestaurant ?? []) as { restaurant_id: string; rating: number }[]) {
        restaurantCounts.set(a.restaurant_id, (restaurantCounts.get(a.restaurant_id) ?? 0) + 1);
        restaurantSums.set(a.restaurant_id, (restaurantSums.get(a.restaurant_id) ?? 0) + (a.rating ?? 0));
      }
      for (const r of rows) {
        if (!r.restaurant_id) continue;
        const count = restaurantCounts.get(r.restaurant_id) ?? 0;
        r.restaurant_review_count = count;
        r.restaurant_avg_rating = count > 0 ? (restaurantSums.get(r.restaurant_id) ?? 0) / count : 0;
      }
    }
    return rows;
  }, [ratingFilter, search, userSearch]);

  const { items: reviews, setItems: setReviews, loading, hasMore, loadMore, reset } =
    usePagination<ReviewRow>({ fetchPage: fetchReviews });

  const loadStats = useCallback(async () => {
    const sinceISO = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const countByRating = (n: number) =>
      safeCount(() => supabase.from('reviews').select('*', { count: 'exact', head: true }).eq('rating', n));

    const [total, last7days, r1, r2, r3, r4, r5] = await Promise.all([
      safeCount(() => supabase.from('reviews').select('*', { count: 'exact', head: true })),
      safeCount(() => supabase.from('reviews').select('*', { count: 'exact', head: true }).gte('created_at', sinceISO)),
      countByRating(1),
      countByRating(2),
      countByRating(3),
      countByRating(4),
      countByRating(5),
    ]);

    const byRating = [0, r1, r2, r3, r4, r5];
    const weighted = r1 * 1 + r2 * 2 + r3 * 3 + r4 * 4 + r5 * 5;
    const average = total > 0 ? weighted / total : 0;
    setStats({ total, average, last7days, byRating });
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  useEffect(() => {
    reset();
  }, [ratingFilter, search, userSearch]); // eslint-disable-line react-hooks/exhaustive-deps

  const deleteReview = async (review: ReviewRow) => {
    if (!confirmDestructive('Eliminerai definitivamente questa recensione e le sue foto.')) return;
    const { error } = await deleteReviewWithCleanup(supabase, review.id);
    if (error) {
      alert(`Errore durante l'eliminazione: ${error}`);
      return;
    }
    setReviews((prev) => prev.filter((r) => r.id !== review.id));
    loadStats();
  };

  const maxBar = stats ? Math.max(1, ...stats.byRating.slice(1)) : 1;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Recensioni</h1>

      {/* Panoramica globale */}
      {stats && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mb-5">
          <div className="grid grid-cols-3 gap-3 lg:col-span-1">
            <StatCard label="Totale" value={stats.total} />
            <StatCard label="Rating medio" value={stats.average.toFixed(1)} color="text-star" />
            <StatCard label="Ultimi 7gg" value={stats.last7days} color="text-primary" />
          </div>

          {/* Distribuzione voti — cliccabile per filtrare */}
          <div className="bg-card rounded-lg shadow p-4 lg:col-span-2">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-faint uppercase tracking-wide">Distribuzione voti</p>
              {ratingFilter !== null && (
                <button
                  onClick={() => setRatingFilter(null)}
                  className="text-xs text-primary hover:underline"
                >
                  Mostra tutte
                </button>
              )}
            </div>
            <div className="space-y-1">
              {[5, 4, 3, 2, 1].map((n) => {
                const count = stats.byRating[n];
                const active = ratingFilter === n;
                return (
                  <button
                    key={n}
                    onClick={() => setRatingFilter(active ? null : n)}
                    className={`w-full flex items-center gap-2 px-1 py-0.5 rounded text-sm transition-colors ${
                      active ? 'bg-selected' : 'hover:bg-muted'
                    }`}
                    title={`Filtra ${n} stelle`}
                  >
                    <span className="w-10 text-right text-star tabular-nums">{n}★</span>
                    <span className="flex-1 h-3 bg-muted rounded overflow-hidden">
                      <span
                        className="block h-full bg-star/60 rounded"
                        style={{ width: `${(count / maxBar) * 100}%` }}
                      />
                    </span>
                    <span className="w-12 text-right text-muted-foreground tabular-nums">{count}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Filtri */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <input
          type="text"
          placeholder="Cerca nel commento..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-[200px] max-w-md px-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <input
          type="text"
          placeholder="Cerca per utente..."
          value={userSearch}
          onChange={(e) => setUserSearch(e.target.value)}
          className="flex-1 min-w-[200px] max-w-xs px-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {/* Tabella */}
      <div className="bg-card rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-background text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Utente</th>
                <th className="px-4 py-3 font-medium">Ristorante</th>
                <th className="px-4 py-3 font-medium">Voto</th>
                <th className="px-4 py-3 font-medium">Recensione</th>
                <th className="px-4 py-3 font-medium">Foto</th>
                <th className="px-4 py-3 font-medium">Data</th>
                <th className="px-4 py-3 font-medium text-right">Azioni</th>
              </tr>
            </thead>
            <tbody>
              {reviews.map((r) => (
                <tr key={r.id} className="border-t hover:bg-background align-top">
                  <td className="px-4 py-3 max-w-[160px]">
                    {r.user_id ? (
                      <>
                        <Link href={`/users/${r.user_id}`} className="text-primary hover:underline block truncate">
                          {r.reviewer_is_anonymous ? 'Anonimo' : (r.reviewer_name ?? 'Anonimo')}
                        </Link>
                        {typeof r.reviewer_review_count === 'number' && (
                          <span
                            className="text-faint text-xs flex items-center gap-1"
                            title="Recensioni totali dell'utente"
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0" aria-hidden="true">
                              <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                            </svg>
                            {r.reviewer_review_count}
                          </span>
                        )}
                      </>
                    ) : (
                      <span className="italic text-faint">Utente inattivo</span>
                    )}
                  </td>
                  <td className="px-4 py-3 max-w-[180px]">
                    <Link
                      href={`/restaurants/${r.restaurant_id}`}
                      className="text-primary hover:underline block line-clamp-2"
                      title={r.restaurant_name ?? undefined}
                    >
                      {r.restaurant_name ?? '—'}
                    </Link>
                    {r.restaurant_city && (
                      <span className="text-faint text-xs block truncate">{r.restaurant_city}</span>
                    )}
                    {typeof r.restaurant_review_count === 'number' && (
                      <span
                        className="text-faint text-xs flex items-center gap-1 mt-0.5 tabular-nums"
                        title="Punteggio medio e recensioni totali del ristorante"
                      >
                        <span aria-hidden="true">★</span>
                        {(r.restaurant_avg_rating ?? 0).toFixed(1)}
                        <span>({r.restaurant_review_count})</span>
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="text-star">{'★'.repeat(r.rating)}</div>
                    <span className="text-faint text-xs flex items-center gap-1 mt-0.5" title="Like ricevuti">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0" aria-hidden="true">
                        <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 1 0-7.8 7.8l1.1 1.1L12 21.2l7.7-7.7 1.1-1.1a5.5 5.5 0 0 0 0-7.8z" />
                      </svg>
                      {r.likes_count ?? 0}
                    </span>
                  </td>
                  <td className="px-4 py-3 min-w-[280px] max-w-[480px]">
                    {r.comment ? (
                      <p className="text-foreground-secondary whitespace-pre-line break-words">{highlightMatch(r.comment, search)}</p>
                    ) : (
                      <span className="text-faint">Nessun commento</span>
                    )}
                    <DietaryBadges allergens={r.allergens_snapshot} diets={r.dietary_snapshot} className="mt-1.5" />
                  </td>
                  <td className="px-4 py-3">
                    {r.photos?.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5 max-w-[152px]">
                        {r.photos.map((photo, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => openLightbox(r.photos, i)}
                            className="block"
                          >
                            <img
                              src={photo.thumbnailUrl ?? photo.url}
                              alt={`Foto recensione ${i + 1}`}
                              className="w-12 h-12 rounded object-cover hover:opacity-80 transition-opacity cursor-pointer"
                            />
                          </button>
                        ))}
                      </div>
                    ) : (
                      <span className="text-faint">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-faint text-xs whitespace-nowrap">
                    {new Date(r.created_at).toLocaleDateString('it-IT')}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => deleteReview(r)}
                      className="text-danger hover:text-danger-strong hover:bg-danger-soft rounded p-2 -m-2 transition-colors"
                      title="Elimina recensione"
                      aria-label="Elimina recensione"
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
              {!loading && reviews.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-faint">
                    Nessuna recensione trovata
                  </td>
                </tr>
              )}
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
