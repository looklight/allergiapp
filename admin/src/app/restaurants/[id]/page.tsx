'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { deleteRestaurantWithCleanup, deleteReviewWithCleanup, deleteReviewPhotoWithCleanup, deleteMenuPhotoWithCleanup } from '@/lib/storageCleanup';
import { confirmDestructive } from '@/lib/confirm';
import { flattenJoin, flattenJoinAll, flattenReportJoins } from '@/lib/flattenJoin';
import type { Restaurant, Review, Report, MenuPhoto } from '@/lib/types';
import { useBusyIds } from '@/hooks/useBusyIds';
import RestaurantHeader from './components/RestaurantHeader';
import ReportsSection from './components/ReportsSection';
import MenuPhotosSection from './components/MenuPhotosSection';
import ReviewsSection from './components/ReviewsSection';
import Link from 'next/link';

export default function RestaurantDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [stats, setStats] = useState({ review_count: 0, average_rating: 0, favorite_count: 0 });
  const [isDeleting, setIsDeleting] = useState(false);
  const { isBusy, withBusy } = useBusyIds();
  const [menuPhotos, setMenuPhotos] = useState<MenuPhoto[]>([]);
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
        setRestaurant(flattenJoin(restData, {
          profiles: { display_name: 'adder_name' },
        }) as Restaurant);
      }

      // Recensioni con nome utente (limitate per performance)
      const { data: reviewsData } = await supabase
        .from('reviews')
        .select('*, profiles!user_id(display_name)')
        .eq('restaurant_id', id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (reviewsData) {
        setReviews(flattenJoinAll(reviewsData, {
          profiles: { display_name: 'reviewer_name' },
        }));
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
        setReports(reportsData.map((r: any) => flattenReportJoins(r)));
      }

      // Foto menu con nome uploader
      const { data: menuPhotosData } = await supabase
        .from('menu_photos')
        .select('*, profiles!user_id(display_name)')
        .eq('restaurant_id', id)
        .order('created_at', { ascending: false });

      if (menuPhotosData) {
        setMenuPhotos(flattenJoinAll(menuPhotosData, {
          profiles: { display_name: 'uploader_name' },
        }));
      }

      setLoading(false);
    }
    load();
  }, [id]);

  // -- Azioni report --
  const dismissReport = async (reportId: string) => {
    await withBusy(reportId, async () => {
      const { error } = await supabase.from('reports').update({ status: 'dismissed' }).eq('id', reportId);
      if (error) {
        alert(`Errore: ${error.message}`);
        return;
      }
      setReports((prev) => prev.filter((r) => r.id !== reportId));
    });
  };

  const deleteReportedMenuPhoto = async (report: Report) => {
    if (!report.menu_photo_id) return;
    if (!confirm('Eliminare questa foto del menu e risolvere la segnalazione?')) return;
    await withBusy(report.id, async () => {
      await supabase.from('reports').update({ status: 'resolved' }).eq('menu_photo_id', report.menu_photo_id).eq('status', 'pending');
      const { error } = await deleteMenuPhotoWithCleanup(supabase, report.menu_photo_id!);
      if (error) {
        alert(`Errore: ${error}`);
        return;
      }
      setMenuPhotos((prev) => prev.filter((p) => p.id !== report.menu_photo_id));
      setReports((prev) => prev.filter((r) => r.menu_photo_id !== report.menu_photo_id));
    });
  };

  const deleteReportedReview = async (report: Report) => {
    if (!report.review_id) return;
    if (!confirm('Eliminare questa recensione e risolvere la segnalazione?')) return;
    await withBusy(report.id, async () => {
      const { error } = await deleteReviewWithCleanup(supabase, report.review_id!);
      if (error) {
        alert(`Errore: ${error}`);
        return;
      }
      setReviews((prev) => prev.filter((r) => r.id !== report.review_id));
      setReports((prev) => prev.filter((r) => r.review_id !== report.review_id));
    });
  };

  // -- Azioni foto menu --
  const deleteMenuPhoto = async (photoId: string) => {
    if (!confirm('Eliminare questa foto del menu?')) return;
    await withBusy(photoId, async () => {
      await supabase.from('reports').update({ status: 'resolved' }).eq('menu_photo_id', photoId).eq('status', 'pending');
      const { error } = await deleteMenuPhotoWithCleanup(supabase, photoId);
      if (error) {
        alert(`Errore: ${error}`);
        return;
      }
      setMenuPhotos((prev) => prev.filter((p) => p.id !== photoId));
      setReports((prev) => prev.filter((r) => r.menu_photo_id !== photoId));
    });
  };

  // -- Azioni recensioni --
  const deleteReview = async (reviewId: string) => {
    if (!confirm('Eliminare questa recensione?')) return;
    await withBusy(reviewId, async () => {
      const { error } = await deleteReviewWithCleanup(supabase, reviewId);
      if (error) {
        alert(`Errore: ${error}`);
        return;
      }
      setReviews((prev) => prev.filter((r) => r.id !== reviewId));
      setReports((prev) => prev.filter((r) => r.review_id !== reviewId));
    });
  };

  const deleteReviewPhoto = async (reviewId: string, photoIndex: number) => {
    if (!confirm('Eliminare questa foto dalla recensione?')) return;
    const key = `rv_${reviewId}_${photoIndex}`;
    await withBusy(key, async () => {
      const { error } = await deleteReviewPhotoWithCleanup(supabase, reviewId, photoIndex);
      if (error) {
        alert(`Errore: ${error}`);
        return;
      }
      setReviews((prev) => prev.map((r) => {
        if (r.id !== reviewId) return r;
        const photos = [...(r.photos as any[])];
        photos.splice(photoIndex, 1);
        return { ...r, photos };
      }));
    });
  };

  // -- Elimina ristorante --
  const deleteRestaurant = async () => {
    if (!confirmDestructive(`Eliminerai definitivamente il ristorante "${restaurant?.name ?? ''}". Tutte le segnalazioni, recensioni e foto associate verranno rimosse.`)) return;
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

      <RestaurantHeader
        restaurant={restaurant}
        stats={stats}
        reportCount={reports.length}
        isDeleting={isDeleting}
        onDelete={deleteRestaurant}
        onRestaurantUpdate={setRestaurant}
      />

      <ReportsSection
        reports={reports}
        isBusy={isBusy}
        onDismiss={dismissReport}
        onDeletePhoto={deleteReportedMenuPhoto}
        onDeleteReview={deleteReportedReview}
        onDeleteRestaurant={() => deleteRestaurant()}
      />

      <MenuPhotosSection
        menuPhotos={menuPhotos}
        isBusy={isBusy}
        onDelete={deleteMenuPhoto}
      />

      <ReviewsSection
        reviews={reviews}
        isBusy={isBusy}
        onDeleteReview={deleteReview}
        onDeletePhoto={deleteReviewPhoto}
      />
    </div>
  );
}
