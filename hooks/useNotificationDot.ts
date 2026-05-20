/**
 * Aggrega le sorgenti di notifica utente in un singolo boolean per il pallino
 * rosso sull'avatar. Aggiungere qui future sorgenti (follow, messaggi, ecc.).
 */

import { useLikesNotification } from './useLikesNotification';

export function useNotificationDot(): boolean {
  const { unseen: unseenLikes } = useLikesNotification();
  return unseenLikes > 0;
}
