-- Migration 031: Performance indexes
-- Indexes mancanti su colonne usate nelle RLS policy e nelle query frequenti.
-- Senza questi, PostgreSQL fa sequential scan su ogni operazione di write
-- che coinvolge le RLS policy con added_by, owner_id, o is_admin().

-- Restaurants: chi ha aggiunto il ristorante (RLS delete/insert)
CREATE INDEX IF NOT EXISTS idx_restaurants_added_by
  ON restaurants (added_by);

-- Restaurants: proprietario verificato (RLS update, query premium)
CREATE INDEX IF NOT EXISTS idx_restaurants_owner_id
  ON restaurants (owner_id);

-- Reviews: ordinamento per data + filtro per ristorante in una sola scansione index
-- Copre la query più frequente: "recensioni del ristorante X ordinate per data"
CREATE INDEX IF NOT EXISTS idx_reviews_restaurant_created_at
  ON reviews (restaurant_id, created_at DESC);

-- Profiles: ruolo utente, usato da is_admin() chiamata in molte RLS policy
-- Con pochi admin, il partial index è più leggero di un index completo
CREATE INDEX IF NOT EXISTS idx_profiles_role_admin
  ON profiles (id) WHERE role = 'admin';
