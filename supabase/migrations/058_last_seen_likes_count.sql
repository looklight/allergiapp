-- Migration 058: last_seen_likes_count
-- Snapshot del totale "like ricevuti" all'ultima apertura del profilo da parte
-- dell'utente. Permette di calcolare unseen = currentLikes - lastSeenLikesCount
-- per il pallino di notifica in home + animazione count-up al rientro nel
-- profilo. La fonte di verità dei like resta review_likes / reviews.likes_count;
-- questa colonna e' solo un cursore di lettura per la UI.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS last_seen_likes_count INT NOT NULL DEFAULT 0;
