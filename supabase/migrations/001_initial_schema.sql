-- AllergiApp - Schema iniziale Supabase
-- Eseguire nel SQL Editor di Supabase

-- Abilita PostGIS per query geospaziali
CREATE EXTENSION IF NOT EXISTS postgis;

-- ============================================
-- TABELLA: allergens (riferimento)
-- ============================================
CREATE TABLE allergens (
  code TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('allergen', 'dietary')),
  name_it TEXT NOT NULL,
  name_en TEXT NOT NULL
);

-- 14 EU obbligatori + fave
INSERT INTO allergens (code, type, name_it, name_en) VALUES
  ('gluten', 'allergen', 'Glutine', 'Gluten'),
  ('crustaceans', 'allergen', 'Crostacei', 'Crustaceans'),
  ('eggs', 'allergen', 'Uova', 'Eggs'),
  ('fish', 'allergen', 'Pesce', 'Fish'),
  ('peanuts', 'allergen', 'Arachidi', 'Peanuts'),
  ('soy', 'allergen', 'Soia', 'Soy'),
  ('milk', 'allergen', 'Latte', 'Milk'),
  ('nuts', 'allergen', 'Frutta a guscio', 'Tree nuts'),
  ('celery', 'allergen', 'Sedano', 'Celery'),
  ('mustard', 'allergen', 'Senape', 'Mustard'),
  ('sesame', 'allergen', 'Sesamo', 'Sesame'),
  ('sulphites', 'allergen', 'Solfiti', 'Sulphites'),
  ('lupin', 'allergen', 'Lupini', 'Lupin'),
  ('molluscs', 'allergen', 'Molluschi', 'Molluscs'),
  ('fava_beans', 'allergen', 'Fave (favismo)', 'Fava beans (favism)'),
  -- Preferenze alimentari
  ('vegan', 'dietary', 'Vegano', 'Vegan'),
  ('vegetarian', 'dietary', 'Vegetariano', 'Vegetarian'),
  ('halal', 'dietary', 'Halal', 'Halal'),
  ('kosher', 'dietary', 'Kosher', 'Kosher');

-- ============================================
-- TABELLA: profiles
-- ============================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  allergens TEXT[] DEFAULT '{}',
  dietary_preferences TEXT[] DEFAULT '{}',
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'restaurant_owner', 'admin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- NOTA: il trigger handle_new_user e stato rimosso.
-- Il profilo viene creato da app code con ensureProfile() dopo il signup.

-- ============================================
-- TABELLA: restaurants
-- ============================================
CREATE TABLE restaurants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT,
  city TEXT,
  country TEXT,
  location GEOGRAPHY(Point, 4326),
  phone TEXT,
  website TEXT,
  cuisine_type TEXT,
  price_range SMALLINT CHECK (price_range BETWEEN 1 AND 4),
  photo_urls TEXT[] DEFAULT '{}',
  added_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  owner_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  is_premium BOOLEAN NOT NULL DEFAULT false,
  subscription_status TEXT NOT NULL DEFAULT 'none' CHECK (subscription_status IN ('active', 'expired', 'none')),
  subscription_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- TABELLA: restaurant_allergens (solo premium)
-- ============================================
CREATE TABLE restaurant_allergens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  allergen_code TEXT NOT NULL REFERENCES allergens(code),
  notes TEXT,
  UNIQUE(restaurant_id, allergen_code)
);

-- ============================================
-- TABELLA: restaurant_dishes (solo premium)
-- ============================================
CREATE TABLE restaurant_dishes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  photo_url TEXT,
  allergen_free TEXT[] DEFAULT '{}',
  dietary_tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- TABELLA: reviews
-- ============================================
CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  allergens_snapshot TEXT[] DEFAULT '{}',
  dietary_snapshot TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- TABELLA: review_dishes
-- ============================================
CREATE TABLE review_dishes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id UUID NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  photo_url TEXT
);

-- ============================================
-- TABELLA: reports
-- ============================================
CREATE TABLE reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
  review_id UUID REFERENCES reviews(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  reason TEXT NOT NULL,
  details TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'resolved', 'dismissed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- TABELLA: restaurant_claims
-- ============================================
CREATE TABLE restaurant_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  business_name TEXT,
  vat_number TEXT,
  document_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMPTZ
);

-- ============================================
-- INDICI
-- ============================================

-- Geospaziale
CREATE INDEX idx_restaurants_location ON restaurants USING GIST (location);

-- Reviews
CREATE INDEX idx_reviews_restaurant ON reviews (restaurant_id);
CREATE INDEX idx_reviews_user ON reviews (user_id);
CREATE INDEX idx_reviews_allergens ON reviews USING GIN (allergens_snapshot);
CREATE INDEX idx_reviews_dietary ON reviews USING GIN (dietary_snapshot);

-- Restaurant allergens
CREATE INDEX idx_restaurant_allergens_restaurant ON restaurant_allergens (restaurant_id);

-- Restaurant dishes
CREATE INDEX idx_restaurant_dishes_restaurant ON restaurant_dishes (restaurant_id);

-- Reports
CREATE INDEX idx_reports_status ON reports (status);
CREATE INDEX idx_reports_restaurant ON reports (restaurant_id);

-- Claims
CREATE INDEX idx_claims_status ON restaurant_claims (status);
CREATE INDEX idx_claims_restaurant ON restaurant_claims (restaurant_id);

-- ============================================
-- UPDATED_AT TRIGGER
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON restaurants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON reviews
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Abilita RLS su tutte le tabelle
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurant_allergens ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurant_dishes ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_dishes ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurant_claims ENABLE ROW LEVEL SECURITY;

-- ALLERGENS: leggibili da tutti
ALTER TABLE allergens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allergens are readable by everyone"
  ON allergens FOR SELECT USING (true);

-- PROFILES
CREATE POLICY "Profiles are readable by everyone"
  ON profiles FOR SELECT USING (true);

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE USING (auth.uid() = id);

-- RESTAURANTS: leggibili da tutti, inseribili da autenticati
CREATE POLICY "Restaurants are readable by everyone"
  ON restaurants FOR SELECT USING (true);

CREATE POLICY "Authenticated users can add restaurants"
  ON restaurants FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Owners can update their restaurants"
  ON restaurants FOR UPDATE USING (auth.uid() = owner_id);

-- RESTAURANT_ALLERGENS: leggibili da tutti, gestibili dall'owner
CREATE POLICY "Restaurant allergens are readable by everyone"
  ON restaurant_allergens FOR SELECT USING (true);

CREATE POLICY "Owners can manage restaurant allergens"
  ON restaurant_allergens FOR ALL USING (
    EXISTS (
      SELECT 1 FROM restaurants
      WHERE id = restaurant_allergens.restaurant_id
      AND owner_id = auth.uid()
      AND is_premium = true
    )
  );

-- RESTAURANT_DISHES: leggibili da tutti, gestibili dall'owner premium
CREATE POLICY "Restaurant dishes are readable by everyone"
  ON restaurant_dishes FOR SELECT USING (true);

CREATE POLICY "Owners can manage restaurant dishes"
  ON restaurant_dishes FOR ALL USING (
    EXISTS (
      SELECT 1 FROM restaurants
      WHERE id = restaurant_dishes.restaurant_id
      AND owner_id = auth.uid()
      AND is_premium = true
    )
  );

-- REVIEWS: leggibili da tutti
CREATE POLICY "Reviews are readable by everyone"
  ON reviews FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create reviews"
  ON reviews FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reviews"
  ON reviews FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reviews"
  ON reviews FOR DELETE USING (auth.uid() = user_id);

-- REVIEW_DISHES: leggibili da tutti
CREATE POLICY "Review dishes are readable by everyone"
  ON review_dishes FOR SELECT USING (true);

CREATE POLICY "Users can manage dishes on their reviews"
  ON review_dishes FOR ALL USING (
    EXISTS (
      SELECT 1 FROM reviews
      WHERE id = review_dishes.review_id
      AND user_id = auth.uid()
    )
  );

-- REPORTS: solo il proprio report, admin vede tutto (via service_role)
CREATE POLICY "Users can create reports"
  ON reports FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own reports"
  ON reports FOR SELECT USING (auth.uid() = user_id);

-- RESTAURANT_CLAIMS: l'utente vede i propri
CREATE POLICY "Users can create claims"
  ON restaurant_claims FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own claims"
  ON restaurant_claims FOR SELECT USING (auth.uid() = user_id);
