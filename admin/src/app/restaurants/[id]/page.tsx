'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { deleteRestaurantWithCleanup, deleteReviewWithCleanup, deleteMenuPhotoWithCleanup } from '@/lib/storageCleanup';
import type { Restaurant, Review, Report, ReportStatus, MenuPhoto } from '@/lib/types';
import { REPORT_REASON_LABELS, type ReportReason } from '@/lib/types';
import { ALL_CATEGORIES, DIETARY_CATEGORIES, CUISINE_CATEGORIES } from '@/lib/restaurantCategories';
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
  const [menuPhotos, setMenuPhotos] = useState<MenuPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingCategories, setEditingCategories] = useState(false);
  const [pendingCategories, setPendingCategories] = useState<string[]>([]);
  const [isSavingCategories, setIsSavingCategories] = useState(false);

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
        .select('*, profiles!user_id(display_name), reviews!review_id(comment, rating, profiles!user_id(display_name)), menu_photos!menu_photo_id(thumbnail_url, image_url)')
        .eq('restaurant_id', id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (reportsData) {
        setReports(reportsData.map((r: any) => ({
          ...r,
          reporter_name: r.profiles?.display_name ?? null,
          review_comment: r.reviews?.comment ?? null,
          review_rating: r.reviews?.rating ?? null,
          review_reviewer_name: (r.reviews?.profiles as any)?.display_name ?? null,
          menu_photo_thumbnail_url: r.menu_photos?.thumbnail_url ?? null,
          menu_photo_image_url: r.menu_photos?.image_url ?? null,
          profiles: undefined,
          reviews: undefined,
          menu_photos: undefined,
        })));
      }

      // Foto menu con nome uploader
      const { data: menuPhotosData } = await supabase
        .from('menu_photos')
        .select('*, profiles!user_id(display_name)')
        .eq('restaurant_id', id)
        .order('created_at', { ascending: false });

      if (menuPhotosData) {
        setMenuPhotos(menuPhotosData.map((p: any) => ({
          ...p,
          uploader_name: p.profiles?.display_name ?? null,
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

  const deleteMenuPhoto = async (photoId: string) => {
    if (!confirm('Eliminare questa foto del menu?')) return;
    if (busyIds.has(photoId)) return;
    setBusyIds((prev) => new Set(prev).add(photoId));
    // Risolvi report pending per questa foto (ON DELETE SET NULL li renderebbe orfani)
    await supabase.from('reports').update({ status: 'resolved' }).eq('menu_photo_id', photoId).eq('status', 'pending');
    const { error } = await deleteMenuPhotoWithCleanup(supabase, photoId);
    setBusyIds((prev) => { const next = new Set(prev); next.delete(photoId); return next; });
    if (error) {
      alert(`Errore: ${error}`);
      return;
    }
    setMenuPhotos((prev) => prev.filter((p) => p.id !== photoId));
    setReports((prev) => prev.filter((r) => r.menu_photo_id !== photoId));
  };

  const deleteReview = async (reviewId: string) => {
    if (!confirm('Eliminare questa recensione?')) return;
    if (busyIds.has(reviewId)) return;
    setBusyIds((prev) => new Set(prev).add(reviewId));
    const { error } = await deleteReviewWithCleanup(supabase, reviewId);
    setBusyIds((prev) => { const next = new Set(prev); next.delete(reviewId); return next; });
    if (error) {
      alert(`Errore: ${error}`);
      return;
    }
    setReviews((prev) => prev.filter((r) => r.id !== reviewId));
    // CASCADE elimina i report dal DB — aggiorna anche la UI
    setReports((prev) => prev.filter((r) => r.review_id !== reviewId));
  };

  const deleteReportedMenuPhoto = async (report: Report) => {
    if (!report.menu_photo_id || busyIds.has(report.id)) return;
    if (!confirm('Eliminare questa foto del menu e risolvere la segnalazione?')) return;
    setBusyIds((prev) => new Set(prev).add(report.id));
    // Risolvi tutti i report pending per questa foto
    await supabase.from('reports').update({ status: 'resolved' }).eq('menu_photo_id', report.menu_photo_id).eq('status', 'pending');
    const { error } = await deleteMenuPhotoWithCleanup(supabase, report.menu_photo_id);
    setBusyIds((prev) => { const next = new Set(prev); next.delete(report.id); return next; });
    if (error) {
      alert(`Errore: ${error}`);
      return;
    }
    setMenuPhotos((prev) => prev.filter((p) => p.id !== report.menu_photo_id));
    setReports((prev) => prev.filter((r) => r.menu_photo_id !== report.menu_photo_id));
  };

  const deleteReportedReview = async (report: Report) => {
    if (!report.review_id || busyIds.has(report.id)) return;
    if (!confirm('Eliminare questa recensione e risolvere la segnalazione?')) return;
    setBusyIds((prev) => new Set(prev).add(report.id));
    const { error } = await deleteReviewWithCleanup(supabase, report.review_id);
    setBusyIds((prev) => { const next = new Set(prev); next.delete(report.id); return next; });
    if (error) {
      alert(`Errore: ${error}`);
      return;
    }
    setReviews((prev) => prev.filter((r) => r.id !== report.review_id));
    // CASCADE elimina i report dal DB — aggiorna la UI
    setReports((prev) => prev.filter((r) => r.review_id !== report.review_id));
  };

  const startEditingCategories = () => {
    setPendingCategories(restaurant?.cuisine_types ?? []);
    setEditingCategories(true);
  };

  const toggleCategory = (id: string) => {
    setPendingCategories(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  const saveCuisineTypes = async () => {
    if (!restaurant) return;
    setIsSavingCategories(true);
    const { error } = await supabase
      .from('restaurants')
      .update({ cuisine_types: pendingCategories })
      .eq('id', restaurant.id);
    setIsSavingCategories(false);
    if (error) {
      alert(`Errore durante il salvataggio: ${error.message}`);
      return;
    }
    setRestaurant(prev => prev ? { ...prev, cuisine_types: pendingCategories } : prev);
    setEditingCategories(false);
  };

  const deleteRestaurant = async () => {
    if (!confirm(`Eliminare definitivamente "${restaurant?.name}"? Questa azione non puo essere annullata.`)) return;
    setIsDeleting(true);
    const { error } = await deleteRestaurantWithCleanup(supabase, id);
    if (error) {
      alert(`Errore durante l'eliminazione: ${error}`);
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
            <p className="text-gray-500">
              {restaurant.address}
              {' '}
              <a
                href={
                  restaurant.google_place_id
                    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${restaurant.name} ${restaurant.address ?? ''}`)}&query_place_id=${restaurant.google_place_id}`
                    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${restaurant.name} ${restaurant.address ?? ''} ${restaurant.city ?? ''}`)}`
                }
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-100 text-blue-700 hover:bg-blue-200 rounded-full text-xs font-medium ml-2 transition-colors"
              >
                <svg className="w-4 h-4" viewBox="0 0 92.3 132.3" xmlns="http://www.w3.org/2000/svg"><path fill="#1a73e8" d="M60.2 2.2C55.8.8 51 0 46.1 0 32 0 19.3 6.4 10.8 16.5l21.8 18.3L60.2 2.2z"/><path fill="#ea4335" d="M10.8 16.5C4.1 24.5 0 34.9 0 46.1c0 8.7 1.7 15.7 4.6 22l28-33.3-21.8-18.3z"/><path fill="#4285f4" d="M46.2 28.5c9.8 0 17.7 7.9 17.7 17.7 0 4.3-1.6 8.3-4.2 11.4 0 0 13.9-16.6 27.5-32.7-5.6-10.8-15.3-19-27-22.7L32.6 34.8c3.3-3.8 8.1-6.3 13.6-6.3"/><path fill="#fbbc04" d="M46.2 63.8c-9.8 0-17.7-7.9-17.7-17.7 0-4.3 1.5-8.3 4.1-11.3l-28 33.3c4.8 10.6 12.8 19.2 21 29.9l34.1-40.5c-3.3 3.9-8.1 6.3-13.5 6.3"/><path fill="#34a853" d="M59.1 109.2c15.4-24.1 33.3-35 33.3-63.1 0-9.1-2.4-17.2-6.5-24.3L25.6 98c2.6 3.4 5.3 7.3 7.9 11.3 9.4 14.5 6.8 23.1 12.8 23.1s3.4-8.7 12.8-23.2"/></svg>
                Apri in Google Maps
              </a>
            </p>
            <p className="text-gray-400 text-sm">
              {restaurant.city}, {restaurant.country} &middot; Aggiunto da {restaurant.adder_name ?? restaurant.added_by ?? '—'}
            </p>
            {/* Categorie — visualizzazione e editing */}
            <div className="mt-3">
              {!editingCategories ? (
                <div className="flex flex-wrap gap-1.5 items-center">
                  {restaurant.cuisine_types?.length > 0
                    ? restaurant.cuisine_types.map(id => {
                        const cat = ALL_CATEGORIES.find(c => c.id === id);
                        return (
                          <span key={id} className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs">
                            {cat?.label ?? id}
                          </span>
                        );
                      })
                    : <span className="text-gray-400 text-sm">Nessuna categoria</span>
                  }
                  <button
                    onClick={startEditingCategories}
                    className="ml-1 text-xs text-blue-600 hover:underline"
                  >
                    Modifica
                  </button>
                </div>
              ) : (
                <div className="border rounded p-3 bg-gray-50">
                  <p className="text-xs font-medium text-gray-500 mb-2">Dietetico</p>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {DIETARY_CATEGORIES.map(cat => (
                      <label key={cat.id} className="flex items-center gap-1.5 cursor-pointer text-sm">
                        <input
                          type="checkbox"
                          checked={pendingCategories.includes(cat.id)}
                          onChange={() => toggleCategory(cat.id)}
                        />
                        {cat.label}
                      </label>
                    ))}
                  </div>
                  <p className="text-xs font-medium text-gray-500 mb-2">Cucina</p>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {CUISINE_CATEGORIES.map(cat => (
                      <label key={cat.id} className="flex items-center gap-1.5 cursor-pointer text-sm">
                        <input
                          type="checkbox"
                          checked={pendingCategories.includes(cat.id)}
                          onChange={() => toggleCategory(cat.id)}
                        />
                        {cat.label}
                      </label>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={saveCuisineTypes}
                      disabled={isSavingCategories}
                      className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50"
                    >
                      {isSavingCategories ? 'Salvataggio...' : 'Salva'}
                    </button>
                    <button
                      onClick={() => setEditingCategories(false)}
                      className="px-3 py-1 border rounded text-sm text-gray-600 hover:bg-gray-100"
                    >
                      Annulla
                    </button>
                  </div>
                </div>
              )}
            </div>
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
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {r.review_id ? (
                        <span className="inline-block px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs">Recensione</span>
                      ) : r.menu_photo_id ? (
                        <span className="inline-block px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">Foto menu</span>
                      ) : (
                        <span className="inline-block px-2 py-0.5 bg-orange-100 text-orange-700 rounded text-xs">Ristorante</span>
                      )}
                      <span className="font-medium">
                        {REPORT_REASON_LABELS[r.reason as ReportReason] ?? r.reason}
                      </span>
                      <span className="text-gray-400">{r.reporter_name ?? 'Anonimo'}</span>
                    </div>
                    {/* Contenuto segnalato */}
                    {r.review_id && (r.review_comment || r.review_rating) && (
                      <div className="bg-purple-50 rounded p-2 mt-1 mb-1">
                        {r.review_reviewer_name && <span className="text-xs text-gray-500">{r.review_reviewer_name}</span>}
                        {r.review_rating != null && r.review_rating > 0 && (
                          <span className="ml-1 text-yellow-600 text-xs">{'★'.repeat(r.review_rating)}</span>
                        )}
                        {r.review_comment && <p className="text-xs text-gray-600 mt-0.5">{r.review_comment}</p>}
                      </div>
                    )}
                    {r.menu_photo_id && r.menu_photo_thumbnail_url && (
                      <div className="mt-1 mb-1">
                        <a href={r.menu_photo_image_url ?? r.menu_photo_thumbnail_url} target="_blank" rel="noreferrer">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={r.menu_photo_thumbnail_url} alt="Foto segnalata" width={64} height={64} className="rounded object-cover" />
                        </a>
                      </div>
                    )}
                    {r.details && <p className="text-gray-600 mt-1">{r.details}</p>}
                  </div>
                  <div className="flex gap-2 ml-4 shrink-0">
                    {r.menu_photo_id && (
                      <button
                        onClick={() => deleteReportedMenuPhoto(r)}
                        disabled={busyIds.has(r.id)}
                        className="text-red-600 hover:underline text-xs disabled:opacity-50"
                      >
                        {busyIds.has(r.id) ? '...' : 'Elimina foto'}
                      </button>
                    )}
                    {r.review_id && (
                      <button
                        onClick={() => deleteReportedReview(r)}
                        disabled={busyIds.has(r.id)}
                        className="text-red-600 hover:underline text-xs disabled:opacity-50"
                      >
                        {busyIds.has(r.id) ? '...' : 'Elimina recensione'}
                      </button>
                    )}
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
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Foto menu */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="font-semibold mb-3">Foto menu ({menuPhotos.length})</h2>
        {menuPhotos.length === 0 ? (
          <p className="text-sm text-gray-400">Nessuna foto del menu</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {menuPhotos.map((p) => (
              <div key={p.id} className="border rounded overflow-hidden">
                <img
                  src={p.thumbnail_url ?? p.image_url}
                  alt="Foto menu"
                  className="w-full h-32 object-cover"
                />
                <div className="p-2">
                  <p className="text-xs font-medium text-gray-700 truncate">
                    {p.uploader_name ?? 'Utente della community'}
                  </p>
                  <p className="text-xs text-gray-400">
                    {new Date(p.created_at).toLocaleDateString('it-IT')}
                  </p>
                  <button
                    onClick={() => deleteMenuPhoto(p.id)}
                    disabled={busyIds.has(p.id)}
                    className="mt-1.5 text-xs text-red-600 hover:underline disabled:opacity-50"
                  >
                    {busyIds.has(p.id) ? '...' : 'Elimina'}
                  </button>
                </div>
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
