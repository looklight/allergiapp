-- Migration 060: RPC pubbliche per la feature share ristorante
-- Due funzioni con GRANT EXECUTE TO anon per consentire l'accesso dal landing pubblico:
--   1. get_restaurant_by_slug(slug) -> UUID    (deep link app: slug -> id per redirect)
--   2. get_restaurant_public_by_slug(slug) -> JSONB    (full data per la pagina web)
--
-- Le tabelle sottostanti restano protette dal RLS esistente: solo queste RPC sono il
-- canale autorizzato per la lettura anonima. SECURITY DEFINER consente bypass del RLS
-- in modo controllato (i campi privati non vengono mai esposti dalla function).

-- ═══════════════════════════════════════════════════════════════════════════════
-- 1. get_restaurant_by_slug — leggera, ritorna solo l'id
-- ═══════════════════════════════════════════════════════════════════════════════
-- Usata dal deep link app: l'utente apre /r/[slug] -> l'app chiama questa RPC ->
-- ottiene id -> naviga alla scheda dettaglio esistente /restaurant/[id].

CREATE OR REPLACE FUNCTION get_restaurant_by_slug(p_slug TEXT)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  SELECT id FROM restaurants WHERE slug = p_slug LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION get_restaurant_by_slug(TEXT) TO anon, authenticated;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 2. get_restaurant_public_by_slug — full payload per la pagina web pubblica
-- ═══════════════════════════════════════════════════════════════════════════════
-- Ritorna un singolo JSONB con tutti i dati che la pagina /r/[slug] mostra:
-- meta ristorante + cuisine_votes + menu_photos + prime 20 reviews (per recency).
-- Calcola average_rating + review_count aggregando direttamente (i campi non sono
-- memorizzati su restaurants).
-- Limit hardcoded a 20 reviews: se la pagina diventa molto popolare evitiamo payload
-- enormi; gli utenti possono aprire l'app per vedere tutte le recensioni.
--
-- Campi privati esclusi by-design: added_by, owner_id, is_premium, subscription_*.

CREATE OR REPLACE FUNCTION get_restaurant_public_by_slug(p_slug TEXT)
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  WITH r AS (
    SELECT * FROM restaurants WHERE slug = p_slug LIMIT 1
  ),
  stats AS (
    SELECT
      COUNT(*) AS review_count,
      ROUND(AVG(rating)::numeric, 2) AS average_rating
    FROM reviews
    WHERE restaurant_id = (SELECT id FROM r)
  ),
  cuisine AS (
    SELECT COALESCE(
      jsonb_agg(jsonb_build_object(
        'cuisine_id', cuisine_id,
        'vote_count', vote_count
      ) ORDER BY vote_count DESC),
      '[]'::jsonb
    ) AS votes
    FROM (
      SELECT cuisine_id, COUNT(*)::int AS vote_count
      FROM restaurant_cuisine_votes
      WHERE restaurant_id = (SELECT id FROM r)
      GROUP BY cuisine_id
    ) cv
  ),
  menu AS (
    SELECT COALESCE(
      jsonb_agg(jsonb_build_object(
        'id', id,
        'image_url', image_url,
        'thumbnail_url', thumbnail_url
      ) ORDER BY created_at DESC),
      '[]'::jsonb
    ) AS photos
    FROM menu_photos
    WHERE restaurant_id = (SELECT id FROM r)
  ),
  recent_reviews AS (
    SELECT COALESCE(
      jsonb_agg(jsonb_build_object(
        'id', rv.id,
        'rating', rv.rating,
        'comment', rv.comment,
        'allergens_snapshot', rv.allergens_snapshot,
        'dietary_snapshot', rv.dietary_snapshot,
        'photos', rv.photos,
        'language', rv.language,
        'created_at', rv.created_at,
        'likes_count', rv.likes_count,
        'user_username', CASE
          WHEN rv.user_id IS NULL THEN NULL
          WHEN COALESCE(p.is_anonymous, false) THEN NULL
          ELSE p.username
        END,
        'user_avatar_url', CASE
          WHEN rv.user_id IS NULL THEN NULL
          WHEN COALESCE(p.is_anonymous, false) THEN NULL
          ELSE p.avatar_url
        END,
        'user_is_anonymous', COALESCE(p.is_anonymous, false),
        'user_is_inactive', rv.user_id IS NULL
      ) ORDER BY rv.created_at DESC),
      '[]'::jsonb
    ) AS list
    FROM (
      SELECT * FROM reviews
      WHERE restaurant_id = (SELECT id FROM r)
      ORDER BY created_at DESC
      LIMIT 20
    ) rv
    LEFT JOIN profiles p ON p.id = rv.user_id
  )
  SELECT CASE
    WHEN r.id IS NULL THEN NULL
    ELSE jsonb_build_object(
      'id', r.id,
      'slug', r.slug,
      'name', r.name,
      'address', r.address,
      'city', r.city,
      'country', r.country,
      'google_place_id', r.google_place_id,
      'price_range', r.price_range,
      'menu_url', r.menu_url,
      'average_rating', stats.average_rating,
      'review_count', stats.review_count,
      'cuisine_votes', cuisine.votes,
      'menu_photos', menu.photos,
      'reviews', recent_reviews.list
    )
  END
  FROM r, stats, cuisine, menu, recent_reviews;
$$;

GRANT EXECUTE ON FUNCTION get_restaurant_public_by_slug(TEXT) TO anon, authenticated;
