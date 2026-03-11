'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import type { Restaurant, Review, Report, ReportStatus } from '@/lib/types';
import { REPORT_REASON_LABELS, type ReportReason } from '@/lib/types';
import StatusBadge from '@/components/StatusBadge';
import Link from 'next/link';

export default function RestaurantDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [stats, setStats] = useState({ review_count: 0, average_rating: 0, favorite_count: 0 });
  const [isDeleting, setIsDeleting] = useState(false);
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      // Ristorante + nome di chi l'ha aggiunto
      const { data: restData } = await supabase
        .from('restaurants')
        .select('*, profiles!added_by(display_name)')
        .eq('id', id)
        .single();

      if (restData) {
        const adderProfile = restData.profiles as { display_name: string | null } | null;
        setRestaurant({
          ...restData,
          adder_name: adderProfile?.display_name ?? null,
          profiles: undefined,
        } as Restaurant);
      }

      // Recensioni con nome utente (limitate per performance)
      const { data: reviewsData } = await supabase
        .from('reviews')
        .select('*, profiles!user_id(display_name)')
        .eq('restaurant_id', id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (reviewsData) {
        setReviews(reviewsData.map((r: any) => ({
          ...r,
          reviewer_name: r.profiles?.display_name ?? null,
          profiles: undefined,
        })));
      }

      // Stats aggregate (calcolate in Postgres)
      const { data: statsData } = await supabase.rpc('get_restaurant_admin_stats', {
        target_restaurant_id: id,
      });
      if (statsData && statsData.length > 0) {
        setStats({
          review_count: Number(statsData[0].review_count),
          average_rating: Number(statsData[0].average_rating),
          favorite_count: Number(statsData[0].favorite_count),
        });
      }

      // Segnalazioni pending
      const { data: reportsData } = await supabase
        .from('reports')
        .select('*, profiles!user_id(display_name)')
        .eq('restaurant_id', id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (reportsData) {
        setReports(reportsData.map((r: any) => ({
          ...r,
          reporter_name: r.profiles?.display_name ?? null,
          profiles: undefined,
        })));
      }

      setLoading(false);
    }
    load();
  }, [id]);

  const updateReportStatus = async (reportId: string, status: ReportStatus) => {
    if (busyIds.has(reportId)) return;
    setBusyIds((prev) => new Set(prev).add(reportId));
    const { error } = await supabase.from('reports').update({ status }).eq('id', reportId);
    setBusyIds((prev) => { const next = new Set(prev); next.delete(reportId); return next; });
    if (error) {
      alert(`Errore: ${error.message}`);
      return;
    }
    setReports((prev) => prev.filter((r) => r.id !== reportId));
  };

  const deleteReview = async (reviewId: string) => {
    if (!confirm('Eliminare questa recensione?')) return;
    if (busyIds.has(reviewId)) return;
    setBusyIds((prev) => new Set(prev).add(reviewId));
    const { error } = await supabase.from('reviews').delete().eq('id', reviewId);
    setBusyIds((prev) => { const next = new Set(prev); next.delete(reviewId); return next; });
    if (error) {
      alert(`Errore: ${error.message}`);
      return;
    }
    setReviews((prev) => prev.filter((r) => r.id !== reviewId));
  };

  const deleteRestaurant = async () => {
    if (!confirm(`Eliminare definitivamente "${restaurant?.name}"? Questa azione non puo essere annullata.`)) return;
    setIsDeleting(true);
    // CASCADE elimina automaticamente reviews, reports, favorites, ecc.
    const { error } = await supabase.from('restaurants').delete().eq('id', id);
    if (error) {
      alert(`Errore durante l'eliminazione: ${error.message}`);
      setIsDeleting(false);
      return;
    }
    router.push('/restaurants');
  };

  if (loading) return <p className="text-gray-500">Caricamento...</p>;
  if (!restaurant) return <p className="text-red-600">Ristorante non trovato.</p>;

  return (
    <div>
      <Link href="/restaurants" className="text-sm text-gray-500 hover:underline mb-4 inline-block">
        &larr; Torna alla lista
      </Link>

      {/* Header ristorante */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold">{restaurant.name}</h1>
            <p className="text-gray-500">{restaurant.address}</p>
            <p className="text-gray-400 text-sm">
              {restaurant.city}, {restaurant.country} &middot; Aggiunto da {restaurant.adder_name ?? restaurant.added_by ?? '—'}
            </p>
            {restaurant.cuisine_types?.length > 0 && (
              <p className="text-gray-400 text-sm mt-1">
                Cucina: {restaurant.cuisine_types.join(', ')}
              </p>
            )}
          </div>
        </div>

        <div className="flex gap-4 mt-4 text-sm">
          <span>Recensioni: <strong>{stats.review_count}</strong></span>
          <span>Rating: <strong>{stats.average_rating.toFixed(1)}</strong> ({stats.review_count})</span>
          <span>Preferiti: <strong>{stats.favorite_count}</strong></span>
          <span className="text-red-600">Segnalazioni: <strong>{reports.length}</strong></span>
        </div>

        <div className="flex gap-2 mt-4">
          <button
            onClick={deleteRestaurant}
            disabled={isDeleting}
            className="px-3 py-1.5 bg-red-600 text-white rounded text-sm hover:bg-red-700 disabled:opacity-50"
          >
            {isDeleting ? 'Eliminazione...' : 'Elimina ristorante'}
          </button>
        </div>
      </div>

      {/* Segnalazioni */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="font-semibold mb-3">Segnalazioni ({reports.length})</h2>
        {reports.length === 0 ? (
          <p className="text-sm text-gray-400">Nessuna segnalazione in attesa</p>
        ) : (
          <div className="space-y-3">
            {reports.map((r) => (
              <div key={r.id} className="border rounded p-3 text-sm">
                <div className="flex justify-between items-center">
                  <div>
                    <span className="font-medium">
                      {REPORT_REASON_LABELS[r.reason as ReportReason] ?? r.reason}
                    </span>
                    <span className="text-gray-400 ml-2">{r.reporter_name ?? 'Anonimo'}</span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => updateReportStatus(r.id, 'resolved')}
                      disabled={busyIds.has(r.id)}
                      className="text-green-600 hover:underline text-xs disabled:opacity-50"
                    >
                      {busyIds.has(r.id) ? '...' : 'Risolvi'}
                    </button>
                    <button
                      onClick={() => updateReportStatus(r.id, 'dismissed')}
                      disabled={busyIds.has(r.id)}
                      className="text-gray-600 hover:underline text-xs disabled:opacity-50"
                    >
                      Archivia
                    </button>
                  </div>
                </div>
                {r.details && <p className="text-gray-600 mt-1">{r.details}</p>}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recensioni */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="font-semibold mb-3">Recensioni ({reviews.length})</h2>
        {reviews.length === 0 ? (
          <p className="text-sm text-gray-400">Nessuna recensione</p>
        ) : (
          <div className="space-y-3">
            {reviews.map((r) => (
              <div key={r.id} className="border rounded p-3 text-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-medium">{r.reviewer_name ?? 'Anonimo'}</span>
                    {r.rating > 0 && (
                      <span className="ml-2 text-yellow-600">{'★'.repeat(r.rating)}</span>
                    )}
                  </div>
                  <div className="flex gap-2 items-center">
                    <span className="text-gray-400 text-xs">
                      {new Date(r.created_at).toLocaleDateString('it-IT')}
                    </span>
                    <button
                      onClick={() => deleteReview(r.id)}
                      disabled={busyIds.has(r.id)}
                      className="text-red-600 hover:underline text-xs disabled:opacity-50"
                    >
                      {busyIds.has(r.id) ? '...' : 'Elimina'}
                    </button>
                  </div>
                </div>
                {r.comment && <p className="text-gray-600 mt-1">{r.comment}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
