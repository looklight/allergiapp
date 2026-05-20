/**
 * Hook che compone:
 *  - currentLikes  → totale like ricevuti dall'utente (live da reviews.likes_count)
 *  - lastSeenLikes → snapshot persistito su profiles.last_seen_likes_count
 *  - unseen        → delta positivo (currentLikes - lastSeenLikes), floored a 0
 *  - markAsSeen()  → persiste currentLikes come nuovo lastSeenLikes
 *
 * Usato dalla home (per il pallino sull'avatar) e dal profilo (per l'animazione
 * "+N" + count-up). `useFocusEffect` rinfresca currentLikes quando lo schermo
 * che usa il hook torna in focus, cosi' il pallino si auto-aggiorna al rientro.
 *
 * markAsSeen e' un no-op se currentLikes <= lastSeenLikes: niente UPDATE quando
 * non ci sono nuovi like, e in caso di unlike (currentLikes minore) NON facciamo
 * scendere last_seen — resta come highwatermark.
 */

import { useCallback, useEffect, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { RestaurantService } from '../services/restaurantService';
import { markLikesAsSeen } from '../services/likesNotificationService';

export function useLikesNotification() {
  const { user, userProfile, refreshProfile } = useAuth();
  // null = non ancora caricato. Esposto al chiamante come `lastSeenLikes` finche'
  // la fetch non risolve, cosi' non ci sono mai delta fasulli (currentLikes=0 a
  // freddo causerebbe shouldAnimate=false con onAnimationEnd intempestivo).
  const [fetchedLikes, setFetchedLikes] = useState<number | null>(null);

  // Reset al logout: senza utente non ci sono like da contare, altrimenti il
  // valore stale farebbe restare acceso il pallino o trapelare nel prossimo
  // utente sullo stesso device prima del primo refresh.
  useEffect(() => {
    if (!user?.uid) setFetchedLikes(null);
  }, [user?.uid]);

  const lastSeenLikes = userProfile?.last_seen_likes_count ?? 0;
  const currentLikes = fetchedLikes ?? lastSeenLikes;

  const refresh = useCallback(async () => {
    if (!user?.uid) return;
    try {
      const c = await RestaurantService.getLikesReceivedByUser(user.uid);
      setFetchedLikes(c);
    } catch (err) {
      console.warn('[useLikesNotification] refresh failed:', err);
    }
  }, [user?.uid]);

  // useFocusEffect copre anche il primo mount, niente useEffect ridondante.
  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const unseen = user?.uid ? Math.max(currentLikes - lastSeenLikes, 0) : 0;

  const markAsSeen = useCallback(async () => {
    if (!user?.uid) return;
    // Persist solo quando saliamo: se currentLikes <= lastSeenLikes non c'e'
    // nulla di nuovo da mostrare, e il caso "minore" (unlike) NON deve far
    // scendere last_seen — il valore alto resta come highwatermark.
    if (currentLikes <= lastSeenLikes) return;
    try {
      await markLikesAsSeen(user.uid, currentLikes);
      await refreshProfile();
    } catch {
      // Silenzioso: alla prossima apertura del profilo l'animazione ripartira'
      // con lo stesso delta e ritenteremo la persist.
    }
  }, [user?.uid, currentLikes, lastSeenLikes, refreshProfile]);

  return { currentLikes, lastSeenLikes, unseen, markAsSeen };
}
