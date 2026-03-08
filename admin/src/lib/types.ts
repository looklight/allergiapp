import type { Timestamp } from 'firebase/firestore';

export type ContentStatus = 'pending' | 'active' | 'removed';

export type ReportReason = 'closed' | 'incorrect_info' | 'hygiene' | 'inappropriate' | 'other';

export const REPORT_REASON_LABELS: Record<ReportReason, string> = {
  closed: 'Chiuso definitivamente',
  incorrect_info: 'Informazioni errate',
  hygiene: 'Condizioni igieniche',
  inappropriate: 'Contenuto inappropriato',
  other: 'Altro',
};

export interface Restaurant {
  googlePlaceId: string;
  name: string;
  address: string;
  city: string;
  cityNormalized: string;
  country: string;
  countryCode: string;
  phone?: string;
  website?: string;
  categories: string[];
  addedBy: string;
  addedByName?: string;
  addedAt: Timestamp;
  updatedAt: Timestamp;
  status: ContentStatus;
  reviewCount: number;
  dishCount: number;
  favoriteCount: number;
  contributionCount?: number;
  averageRating: number;
  ratingCount: number;
  reportCount?: number;
}

export interface Contribution {
  id: string;
  userId: string;
  displayName: string;
  rating?: 1 | 2 | 3 | 4 | 5;
  text?: string;
  dishes: {
    name: string;
    allergenSafe: string[];
    allergenContains?: string[];
    imageUrl?: string;
  }[];
  createdAt: Timestamp;
  status: ContentStatus;
}

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string;
  createdAt: Timestamp;
  restaurantsAdded: number;
  dishesAdded: number;
  reviewsAdded: number;
  avatarId?: string;
  profileColor?: string;
}

export interface RestaurantReport {
  id: string;
  restaurantId: string;
  userId: string;
  displayName: string;
  reason: ReportReason;
  description: string;
  createdAt: Timestamp;
  status: ContentStatus;
}
