/**
 * Pallino "nuove risposte dei ristoratori alle mie recensioni" (mig 733).
 *
 * Per DATA e non per conteggio: il database confronta la data di ogni
 * risposta visibile con `profiles.last_seen_review_replies_at`, quindi il
 * limite noto del pallino dei like (totali che si rincorrono) qui non c'è.
 *
 * Si spegne aprendo il proprio profilo, dove la risposta compare sotto la
 * recensione. Come i like: `useFocusEffect` rinfresca al rientro.
 */

import { useCallback, useEffect, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { countUnseenReviewReplies, markReviewRepliesSeen } from '../services/reviewReplyService';

export function useReviewRepliesNotification() {
  const { user } = useAuth();
  const [unseen, setUnseen] = useState(0);

  useEffect(() => {
    if (!user?.uid) setUnseen(0);
  }, [user?.uid]);

  const refresh = useCallback(async () => {
    if (!user?.uid) return;
    setUnseen(await countUnseenReviewReplies());
  }, [user?.uid]);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const markAsSeen = useCallback(async () => {
    if (!user?.uid) return;
    await markReviewRepliesSeen();
    setUnseen(0);
  }, [user?.uid]);

  return { unseen, markAsSeen };
}
