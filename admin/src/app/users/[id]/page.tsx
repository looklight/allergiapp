'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { deleteReviewPhotoWithCleanup, deleteMenuPhotoWithCleanup } from '@/lib/storageCleanup';
import { confirmDestructive } from '@/lib/confirm';
import { flattenJoinAll } from '@/lib/flattenJoin';
import type { UserProfile, Restaurant, Review, MenuPhoto } from '@/lib/types';
import { useBusyIds } from '@/hooks/useBusyIds';
import UserProfileCard from './components/UserProfileCard';
import MediaGallery, { type MediaItem } from './components/MediaGallery';
import DietaryBadges from '@/components/DietaryBadges';
import Link from 'next/link';

type EnrichedMenuPhoto = MenuPhoto & { restaurant_name: string | null };

export default function UserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [menuPhotos, setMenuPhotos] = useState<EnrichedMenuPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const { isBusy, withBusy } = useBusyIds();

  useEffect(() => {
    if (!id) return;

    async function load() {
      const { data: profileRows } = await supabase.rpc('get_profile_with_email', {
        target_user_id: id,
      });

      const profileData = profileRows?.[0];
      if (!profileData) {
        setLoading(false);
        return;
      }
      setUser(profileData as UserProfile);

      const [restRes, reviewsRes, menuPhotosRes] = await Promise.all([
        supabase
          .from('restaurants')
          .select('id, name, city, country, created_at')
          .eq('added_by', id)
          .order('created_at', { ascending: false })
          .limit(50),
        supabase
          .from('reviews')
          .select('id, restaurant_id, rating, comment, photos, allergens_snapshot, dietary_snapshot, likes_count, created_at, restaurants!inner(name, country, city)')
          .eq('user_id', id)
          .order('created_at', { ascending: false })
          .limit(50),
        supabase
          .from('menu_photos')
          .select('id, restaurant_id, image_url, thumbnail_url, created_at, restaurants!inner(name)')
          .eq('user_id', id)
          .order('created_at', { ascending: false })
          .limit(50),
      ]);

      setRestaurants((restRes.data ?? []) as Restaurant[]);
      setReviews(flattenJoinAll(reviewsRes.data ?? [], {
        restaurants: { name: 'restaurant_name', country: 'restaurant_country', city: 'restaurant_city' },
      }));
      setMenuPhotos((menuPhotosRes.data ?? []).map((p: any) => ({
        ...p,
        uploader_name: null,
        restaurant_name: p.restaurants?.name ?? null,
        restaurants: undefined,
      })));

      setLoading(false);
    }
    load();
  }, [id]);

  // -- Media gallery: raccolta unificata foto recensioni + menu --
  const allMedia = useMemo<MediaItem[]>(() => {
    const items: MediaItem[] = [];
    for (const r of reviews) {
      const photos = (r.photos as { url: string; thumbnailUrl?: string }[]) ?? [];
      photos.forEach((p, i) => {
        items.push({
          kind: 'review',
          reviewId: r.id,
          photoIndex: i,
          url: p.url,
          thumb: p.thumbnailUrl ?? p.url,
          restaurantName: r.restaurant_name || '—',
          date: new Date(r.created_at).toLocaleDateString('it-IT'),
        });
      });
    }
    for (const mp of menuPhotos) {
      items.push({
        kind: 'menu',
        photoId: mp.id,
        url: mp.image_url,
        thumb: mp.thumbnail_url ?? mp.image_url,
        restaurantName: mp.restaurant_name || '—',
        date: new Date(mp.created_at).toLocaleDateString('it-IT'),
      });
    }
    return items;
  }, [reviews, menuPhotos]);

  // -- Raggruppamento per Paese (mantiene ordine per count desc) --
  const reviewsByCountry = useMemo(() => groupByCountry(reviews, (r) => r.restaurant_country), [reviews]);
  const restaurantsByCountry = useMemo(() => groupByCountry(restaurants, (r) => r.country), [restaurants]);

  // -- Azioni --
  const deleteReviewPhoto = async (reviewId: string, photoIndex: number) => {
    if (!confirm('Eliminare questa foto dalla recensione?')) return;
    const key = `rv_${reviewId}_${photoIndex}`;
    await withBusy(key, async () => {
      const { error } = await deleteReviewPhotoWithCleanup(supabase, reviewId, photoIndex);
      if (error) { alert(`Errore: ${error}`); return; }
      setReviews((prev) => prev.map((r) => {
        if (r.id !== reviewId) return r;
        const photos = [...(r.photos as any[])];
        photos.splice(photoIndex, 1);
        return { ...r, photos };
      }));
    });
  };

  const deleteMenuPhotoItem = async (photoId: string) => {
    if (!confirm('Eliminare questa foto del menu?')) return;
    await withBusy(photoId, async () => {
      await supabase.from('reports').update({ status: 'resolved' }).eq('menu_photo_id', photoId).eq('status', 'pending');
      const { error } = await deleteMenuPhotoWithCleanup(supabase, photoId);
      if (error) { alert(`Errore: ${error}`); return; }
      setMenuPhotos((prev) => prev.filter((p) => p.id !== photoId));
    });
  };

  const deleteUser = async () => {
    const name = user?.username || user?.email || id;
    if (!confirmDestructive(`Eliminerai definitivamente l'utente "${name}" e tutti i suoi dati.`)) return;

    setIsDeleting(true);
    const res = await supabase.functions.invoke('delete-account', {
      body: { target_user_id: id },
    });

    if (res.error) {
      alert(`Errore: ${res.error.message}`);
      setIsDeleting(false);
      return;
    }

    router.push('/users');
  };

  if (loading) return <p className="text-muted-foreground">Caricamento...</p>;
  if (!user) return <p className="text-danger">Utente non trovato</p>;

  return (
    <div>
      <Link href="/users" className="text-primary hover:underline text-sm">&larr; Torna alla lista</Link>

      <UserProfileCard
        user={user}
        restaurantCount={restaurants.length}
        reviewCount={reviews.length}
        isDeleting={isDeleting}
        onDelete={deleteUser}
      />

      <MediaGallery
        items={allMedia}
        isBusy={isBusy}
        onDeleteReviewPhoto={deleteReviewPhoto}
        onDeleteMenuPhoto={deleteMenuPhotoItem}
      />

      {/* Recensioni */}
      <div className="bg-card rounded-lg shadow p-4 mb-6">
        <h2 className="font-semibold mb-3">Recensioni ({reviews.length})</h2>
        {reviews.length === 0 ? (
          <p className="text-sm text-faint">Nessuna recensione</p>
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead className="bg-background text-left">
              <tr>
                <th className="px-4 py-2 font-medium">Ristorante</th>
                <th className="px-4 py-2 font-medium">Luogo</th>
                <th className="px-4 py-2 font-medium">Rating</th>
                <th className="px-4 py-2 font-medium">Commento</th>
                <th className="px-4 py-2 font-medium">Foto</th>
                <th className="px-4 py-2 font-medium">Likes</th>
                <th className="px-4 py-2 font-medium">Data</th>
              </tr>
            </thead>
            {reviewsByCountry.map(([country, items]) => (
              <tbody key={country}>
                <tr className="bg-background border-t">
                  <td colSpan={7} className="px-4 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    {country} ({items.length})
                  </td>
                </tr>
                {items.map((r) => (
                  <tr key={r.id} className="border-t">
                    <td className="px-4 py-2">
                      <Link href={`/restaurants/${r.restaurant_id}`} className="text-primary hover:underline">
                        {r.restaurant_name || '—'}
                      </Link>
                    </td>
                    <td className="px-4 py-2 text-muted-foreground">{r.restaurant_city || '—'}</td>
                    <td className="px-4 py-2">
                      {r.rating > 0 ? <span className="text-star">{'★'.repeat(r.rating)}</span> : '—'}
                    </td>
                    <td className="px-4 py-2 text-foreground-secondary max-w-xs">
                      <div className="truncate">{r.comment || '—'}</div>
                      <DietaryBadges allergens={r.allergens_snapshot} diets={r.dietary_snapshot} className="mt-1" />
                    </td>
                    <td className="px-4 py-2">
                      {r.photos?.length > 0 ? (
                        <div className="flex gap-1">
                          {(r.photos as { url: string; thumbnailUrl?: string }[]).map((photo, i) => (
                            <a key={i} href={photo.url} target="_blank" rel="noreferrer">
                              <img src={photo.thumbnailUrl ?? photo.url} alt="" className="w-10 h-10 rounded object-cover hover:opacity-80 transition-opacity" />
                            </a>
                          ))}
                        </div>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-2 text-muted-foreground">{r.likes_count ?? 0}</td>
                    <td className="px-4 py-2 text-muted-foreground">
                      {new Date(r.created_at).toLocaleDateString('it-IT')}
                    </td>
                  </tr>
                ))}
              </tbody>
            ))}
          </table>
          </div>
        )}
      </div>

      {/* Ristoranti aggiunti */}
      <div className="bg-card rounded-lg shadow p-4">
        <h2 className="font-semibold mb-3">Ristoranti aggiunti ({restaurants.length})</h2>
        {restaurants.length === 0 ? (
          <p className="text-sm text-faint">Nessun ristorante aggiunto</p>
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[480px]">
            <thead className="bg-background text-left">
              <tr>
                <th className="px-4 py-2 font-medium">Nome</th>
                <th className="px-4 py-2 font-medium">Citta</th>
                <th className="px-4 py-2 font-medium">Data</th>
              </tr>
            </thead>
            {restaurantsByCountry.map(([country, items]) => (
              <tbody key={country}>
                <tr className="bg-background border-t">
                  <td colSpan={3} className="px-4 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    {country} ({items.length})
                  </td>
                </tr>
                {items.map((r) => (
                  <tr key={r.id} className="border-t">
                    <td className="px-4 py-2">
                      <Link href={`/restaurants/${r.id}`} className="text-primary hover:underline">
                        {r.name}
                      </Link>
                    </td>
                    <td className="px-4 py-2 text-muted-foreground">{r.city}</td>
                    <td className="px-4 py-2 text-muted-foreground">
                      {new Date(r.created_at).toLocaleDateString('it-IT')}
                    </td>
                  </tr>
                ))}
              </tbody>
            ))}
          </table>
          </div>
        )}
      </div>
    </div>
  );
}

function groupByCountry<T>(items: T[], getCountry: (item: T) => string | null | undefined): Array<[string, T[]]> {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const country = getCountry(item) || 'Sconosciuto';
    const bucket = groups.get(country) ?? [];
    bucket.push(item);
    groups.set(country, bucket);
  }
  return Array.from(groups.entries()).sort((a, b) => b[1].length - a[1].length);
}
