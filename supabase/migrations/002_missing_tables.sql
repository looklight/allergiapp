-- Tabelle mancanti dalla migration iniziale

-- ============================================
-- TABELLA: favorites
-- ============================================
CREATE TABLE favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, restaurant_id)
);

CREATE INDEX idx_favorites_user ON favorites (user_id);
CREATE INDEX idx_favorites_restaurant ON favorites (restaurant_id);

-- ============================================
-- TABELLA: menu_photos (foto menu community)
-- ============================================
CREATE TABLE menu_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  image_url TEXT NOT NULL,
  thumbnail_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_menu_photos_restaurant ON menu_photos (restaurant_id);

-- ============================================
-- TABELLA: dish_likes (like sui piatti delle review)
-- ============================================
CREATE TABLE dish_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_dish_id UUID NOT NULL REFERENCES review_dishes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(review_dish_id, user_id)
);

CREATE INDEX idx_dish_likes_dish ON dish_likes (review_dish_id);
CREATE INDEX idx_dish_likes_user ON dish_likes (user_id);

-- ============================================
-- RLS
-- ============================================
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE dish_likes ENABLE ROW LEVEL SECURITY;

-- FAVORITES
CREATE POLICY "Users can view all favorites"
  ON favorites FOR SELECT USING (true);

CREATE POLICY "Users can manage their own favorites"
  ON favorites FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own favorites"
  ON favorites FOR DELETE USING (auth.uid() = user_id);

-- MENU PHOTOS
CREATE POLICY "Menu photos are readable by everyone"
  ON menu_photos FOR SELECT USING (true);

CREATE POLICY "Authenticated users can add menu photos"
  ON menu_photos FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own menu photos"
  ON menu_photos FOR DELETE USING (auth.uid() = user_id);

-- DISH LIKES
CREATE POLICY "Dish likes are readable by everyone"
  ON dish_likes FOR SELECT USING (true);

CREATE POLICY "Users can manage their own dish likes"
  ON dish_likes FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove their own dish likes"
  ON dish_likes FOR DELETE USING (auth.uid() = user_id);
