/**
 * Aggrega le sorgenti di notifica utente in un singolo boolean per il pallino
 * rosso sull'avatar. Aggiungere qui future sorgenti (follow, messaggi, ecc.).
 */

import { useLikesNotification } from './useLikesNotification';
import { useReviewRepliesNotification } from './useReviewRepliesNotification';

export function useNotificationDot(): boolean {
  const { unseen: unseenLikes } = useLikesNotification();
  const { unseen: unseenReplies } = useReviewRepliesNotification();
  return unseenLikes > 0 || unseenReplies > 0;
}
