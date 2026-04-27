// Tipi allineati allo schema Supabase

export type ReportStatus = 'pending' | 'resolved' | 'dismissed';

export type ReportReason = 'closed' | 'incorrect_info' | 'hygiene' | 'inappropriate' | 'incorrect_image' | 'spam' | 'false_info' | 'other';

export const REPORT_REASON_LABELS: Record<ReportReason, string> = {
  closed: 'Chiuso definitivamente',
  incorrect_info: 'Informazioni errate',
  hygiene: 'Condizioni igieniche',
  inappropriate: 'Contenuto inappropriato',
  incorrect_image: 'Foto non pertinente',
  spam: 'Spam o pubblicità',
  false_info: 'Informazioni false',
  other: 'Altro',
};

export const REPORT_STATUS_LABELS: Record<ReportStatus, string> = {
  pending: 'In attesa',
  resolved: 'Eliminata',
  dismissed: 'Ignorata',
};

export interface Restaurant {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  country: string | null;
  country_code: string | null;
  phone: string | null;
  website: string | null;
  cuisine_types: string[];
  price_range: number | null;
  photo_urls: string[];
  added_by: string | null;
  owner_id: string | null;
  google_place_id: string | null;
  is_premium: boolean;
  created_at: string;
  updated_at: string;
  // Aggregati (calcolati nelle query)
  review_count?: number;
  review_photo_count?: number;
  menu_photo_count?: number;
  average_rating?: number;
  favorite_count?: number;
  report_count?: number;
  // Join
  adder_name?: string | null;
}

export interface Review {
  id: string;
  restaurant_id: string;
  user_id: string | null;
  rating: number;
  comment: string | null;
  photos: { url: string; thumbnailUrl?: string }[];
  allergens_snapshot: string[];
  dietary_snapshot: string[];
  created_at: string;
  updated_at: string;
  // Join
  reviewer_name?: string | null;
  restaurant_name?: string | null;
}

export interface UserProfile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  allergens: string[];
  dietary_preferences: string[];
  profile_color: string | null;
  role: 'user' | 'restaurant_owner' | 'admin';
  created_at: string;
  // Aggregati
  restaurants_count?: number;
  reviews_count?: number;
  email?: string;
  last_sign_in_at?: string | null;
  email_confirmed_at?: string | null;
}

export interface MenuPhoto {
  id: string;
  restaurant_id: string;
  user_id: string | null;
  image_url: string;
  thumbnail_url: string | null;
  created_at: string;
  uploader_name?: string | null;
}

export interface Report {
  id: string;
  restaurant_id: string | null;
  review_id: string | null;
  menu_photo_id: string | null;
  user_id: string | null;
  reason: string;
  details: string | null;
  status: ReportStatus;
  created_at: string;
  // Join
  reporter_name?: string | null;
  reporter_is_anonymous?: boolean | null;
  restaurant_name?: string | null;
  restaurant_city?: string | null;
  menu_photo_thumbnail_url?: string | null;
  menu_photo_image_url?: string | null;
  review_comment?: string | null;
  review_rating?: number | null;
  review_reviewer_name?: string | null;
}
