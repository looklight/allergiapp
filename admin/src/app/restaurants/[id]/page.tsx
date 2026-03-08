'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  doc, getDoc, updateDoc, deleteDoc, increment, setDoc,
  collection, query, orderBy, getDocs, where,
} from 'firebase/firestore';
import { getStorage, ref, deleteObject } from 'firebase/storage';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import type { Restaurant, Contribution, RestaurantReport, ContentStatus } from '@/lib/types';
import { REPORT_REASON_LABELS } from '@/lib/types';
import StatusBadge from '@/components/StatusBadge';
import Link from 'next/link';

export default function RestaurantDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [reports, setReports] = useState<RestaurantReport[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      // Ristorante
      const rSnap = await getDoc(doc(db, 'restaurants', id));
      if (rSnap.exists()) {
        setRestaurant({ ...rSnap.data(), googlePlaceId: rSnap.id } as Restaurant);
      }

      // Contributi
      const cSnap = await getDocs(
        query(collection(db, 'restaurants', id, 'contributions'), orderBy('createdAt', 'desc'))
      );
      setContributions(cSnap.docs.map((d) => ({ ...d.data(), id: d.id } as Contribution)));

      // Segnalazioni
      const sSnap = await getDocs(
        query(collection(db, 'restaurants', id, 'reports'), where('status', '==', 'active'), orderBy('createdAt', 'desc'))
      );
      setReports(sSnap.docs.map((d) => ({ ...d.data(), id: d.id } as RestaurantReport)));

      setLoading(false);
    }
    load();
  }, [id]);

  const changeRestaurantStatus = async (newStatus: ContentStatus) => {
    await updateDoc(doc(db, 'restaurants', id), { status: newStatus });
    setRestaurant((prev) => (prev ? { ...prev, status: newStatus } : prev));
  };

  const changeContributionStatus = async (cId: string, newStatus: ContentStatus) => {
    const contribution = contributions.find((c) => c.id === cId);
    if (!contribution) return;

    await updateDoc(doc(db, 'restaurants', id, 'contributions', cId), { status: newStatus });

    // Aggiorna contatori ristorante e profilo utente
    const direction = newStatus === 'removed' ? -1 : 1;
    const restaurantRef = doc(db, 'restaurants', id);
    const restUpdates: Record<string, any> = {
      contributionCount: increment(direction),
    };
    if (contribution.dishes.length > 0) {
      restUpdates.dishCount = increment(direction * contribution.dishes.length);
    }
    if (contribution.rating && contribution.rating > 0) {
      const r = restaurant!;
      const count = r.ratingCount;
      if (direction === -1) {
        if (count <= 1) {
          restUpdates.averageRating = 0;
          restUpdates.ratingCount = 0;
        } else {
          restUpdates.averageRating = Math.max(0, (r.averageRating * count - contribution.rating) / (count - 1));
          restUpdates.ratingCount = increment(-1);
        }
      } else {
        restUpdates.averageRating = (r.averageRating * count + contribution.rating) / (count + 1);
        restUpdates.ratingCount = increment(1);
      }
    }

    await Promise.all([
      updateDoc(restaurantRef, restUpdates),
      setDoc(doc(db, 'users', contribution.userId), { contributionsAdded: increment(direction) }, { merge: true }),
    ]);

    // Aggiorna stato locale
    setContributions((prev) => prev.map((c) => (c.id === cId ? { ...c, status: newStatus } : c)));
    setRestaurant((prev) => {
      if (!prev) return prev;
      const updated = {
        ...prev,
        contributionCount: (prev.contributionCount ?? 0) + direction,
        dishCount: prev.dishCount + direction * contribution.dishes.length,
      };
      if (contribution.rating && contribution.rating > 0) {
        if (direction === -1) {
          updated.ratingCount = prev.ratingCount <= 1 ? 0 : prev.ratingCount - 1;
          updated.averageRating = prev.ratingCount <= 1 ? 0 :
            Math.max(0, (prev.averageRating * prev.ratingCount - contribution.rating) / (prev.ratingCount - 1));
        } else {
          updated.ratingCount = prev.ratingCount + 1;
          updated.averageRating = (prev.averageRating * prev.ratingCount + contribution.rating) / (prev.ratingCount + 1);
        }
      }
      return updated;
    });
  };

  const deleteContributionPermanently = async (cId: string) => {
    if (!confirm('Eliminare definitivamente questo contributo?')) return;
    const contribution = contributions.find((c) => c.id === cId);
    if (!contribution) return;

    // Contatori già aggiornati al momento del soft-delete (changeContributionStatus)
    await deleteDoc(doc(db, 'restaurants', id, 'contributions', cId));

    // Elimina immagini piatti da Storage (best-effort)
    const storage = getStorage();
    for (const dish of contribution.dishes) {
      if (dish.imageUrl) {
        try {
          const path = decodeURIComponent(dish.imageUrl.split('/o/')[1]?.split('?')[0] ?? '');
          if (path) await deleteObject(ref(storage, path));
        } catch { /* ignore */ }
      }
    }

    setContributions((prev) => prev.filter((c) => c.id !== cId));
  };

  const deleteRestaurantPermanently = async () => {
    if (!confirm(`Eliminare definitivamente "${restaurant?.name}"? Questa azione non può essere annullata.`)) return;
    setIsDeleting(true);
    try {
      const storage = getStorage();

      // Helper: elimina immagine Storage da URL (best-effort)
      const deleteImage = async (url: string) => {
        try {
          const path = decodeURIComponent(url.split('/o/')[1]?.split('?')[0] ?? '');
          if (path) await deleteObject(ref(storage, path));
        } catch { /* ignore */ }
      };

      // 1. Aggiorna profili utenti: contributionsAdded per contributi ancora attivi
      const contribSnap = await getDocs(collection(db, 'restaurants', id, 'contributions'));
      for (const d of contribSnap.docs) {
        const data = d.data();
        if (data.status === 'active') {
          await setDoc(doc(db, 'users', data.userId), { contributionsAdded: increment(-1) }, { merge: true });
        }
        // Elimina immagini piatti
        for (const dish of data.dishes ?? []) {
          if (dish.imageUrl) await deleteImage(dish.imageUrl);
          if (dish.thumbnailUrl) await deleteImage(dish.thumbnailUrl);
        }
        await deleteDoc(d.ref);
      }

      // 2. Elimina menu photos + immagini Storage
      const menuSnap = await getDocs(collection(db, 'restaurants', id, 'menuPhotos'));
      for (const d of menuSnap.docs) {
        const data = d.data();
        if (data.imageUrl) await deleteImage(data.imageUrl);
        if (data.thumbnailUrl) await deleteImage(data.thumbnailUrl);
        await deleteDoc(d.ref);
      }

      // 3. Elimina altre subcollections
      for (const sub of ['reviews', 'dishes', 'reports', 'dishLikes']) {
        const snap = await getDocs(collection(db, 'restaurants', id, sub));
        for (const d of snap.docs) {
          await deleteDoc(d.ref);
        }
      }

      // 4. Aggiorna restaurantsAdded sul profilo dell'owner
      if (restaurant?.addedBy) {
        await setDoc(doc(db, 'users', restaurant.addedBy), { restaurantsAdded: increment(-1) }, { merge: true });
      }

      // 5. Elimina il documento ristorante
      await deleteDoc(doc(db, 'restaurants', id));
      router.push('/restaurants');
    } catch (err) {
      console.error('Errore eliminazione:', err);
      alert('Errore durante l\'eliminazione.');
      setIsDeleting(false);
    }
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
              {restaurant.city}, {restaurant.country} &middot; Aggiunto da {restaurant.addedByName ?? restaurant.addedBy}
            </p>
          </div>
          <StatusBadge status={restaurant.status} />
        </div>

        <div className="flex gap-4 mt-4 text-sm">
          <span>Contributi: <strong>{restaurant.contributionCount ?? 0}</strong></span>
          <span>Rating: <strong>{restaurant.averageRating.toFixed(1)}</strong> ({restaurant.ratingCount})</span>
          <span>Preferiti: <strong>{restaurant.favoriteCount}</strong></span>
          <span className="text-red-600">Segnalazioni: <strong>{restaurant.reportCount ?? 0}</strong></span>
        </div>

        <div className="flex gap-2 mt-4">
          {restaurant.status === 'pending' && (
            <button
              onClick={() => changeRestaurantStatus('active')}
              className="px-3 py-1.5 bg-green-600 text-white rounded text-sm hover:bg-green-700"
            >
              Approva
            </button>
          )}
          {restaurant.status === 'removed' && (
            <>
              <button
                onClick={() => changeRestaurantStatus('active')}
                className="px-3 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
              >
                Ripristina
              </button>
              <button
                onClick={deleteRestaurantPermanently}
                disabled={isDeleting}
                className="px-3 py-1.5 bg-red-800 text-white rounded text-sm hover:bg-red-900 disabled:opacity-50"
              >
                {isDeleting ? 'Eliminazione...' : 'Elimina definitivamente'}
              </button>
            </>
          )}
          {restaurant.status !== 'removed' && (
            <button
              onClick={() => changeRestaurantStatus('removed')}
              className="px-3 py-1.5 bg-red-600 text-white rounded text-sm hover:bg-red-700"
            >
              Rimuovi
            </button>
          )}
        </div>
      </div>

      {/* Segnalazioni */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="font-semibold mb-3">Segnalazioni ({reports.length})</h2>
        {reports.length === 0 ? (
          <p className="text-sm text-gray-400">Nessuna segnalazione attiva</p>
        ) : (
          <div className="space-y-3">
            {reports.map((r) => (
              <div key={r.id} className="border rounded p-3 text-sm">
                <div className="flex justify-between">
                  <span className="font-medium">{REPORT_REASON_LABELS[r.reason]}</span>
                  <span className="text-gray-400">{r.displayName}</span>
                </div>
                <p className="text-gray-600 mt-1">{r.description}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Contributi */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="font-semibold mb-3">Contributi ({contributions.length})</h2>
        {contributions.length === 0 ? (
          <p className="text-sm text-gray-400">Nessun contributo</p>
        ) : (
          <div className="space-y-3">
            {contributions.map((c) => (
              <div key={c.id} className="border rounded p-3 text-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-medium">{c.displayName}</span>
                    {c.rating && <span className="ml-2 text-yellow-600">{'★'.repeat(c.rating)}</span>}
                    <StatusBadge status={c.status} />
                  </div>
                  <div className="flex gap-2">
                    {c.status === 'removed' && (
                      <button
                        onClick={() => changeContributionStatus(c.id, 'active')}
                        className="text-blue-600 hover:underline text-xs"
                      >
                        Ripristina
                      </button>
                    )}
                    {c.status !== 'removed' && (
                      <button
                        onClick={() => changeContributionStatus(c.id, 'removed')}
                        className="text-red-600 hover:underline text-xs"
                      >
                        Rimuovi
                      </button>
                    )}
                    {c.status === 'removed' && (
                      <button
                        onClick={() => deleteContributionPermanently(c.id)}
                        className="text-red-800 hover:underline text-xs font-medium"
                      >
                        Elimina
                      </button>
                    )}
                  </div>
                </div>
                {c.text && <p className="text-gray-600 mt-1">{c.text}</p>}
                {c.dishes.length > 0 && (
                  <div className="mt-2">
                    <span className="text-gray-400">Piatti: </span>
                    {c.dishes.map((d, i) => (
                      <span key={i} className="text-gray-600">
                        {d.name}{i < c.dishes.length - 1 ? ', ' : ''}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
