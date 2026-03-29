import { ReactNode } from 'react';

// Banner types (used by services/remoteConfig and components/BannerCarousel)
export type BannerType = 'info' | 'ad' | 'custom';

export interface BannerItem {
  id: string;
  type: BannerType;
  icon?: string;
  image?: any;
  title?: string;
  subtitle?: string;
  adUrl?: string;
  adAction?: 'open_url' | 'share';
  adImage?: string;
  adButtonText?: string;
  layout?: 'default' | 'full_image';
  backgroundColor?: string;
  textColor?: string;
  displayDuration?: number;
  customContent?: ReactNode;
}

export type AllergenId =
  | 'gluten'
  | 'crustaceans'
  | 'eggs'
  | 'fish'
  | 'peanuts'
  | 'soy'
  | 'milk'
  | 'nuts'
  | 'celery'
  | 'mustard'
  | 'sesame'
  | 'sulfites'
  | 'lupin'
  | 'mollusks'
  | 'fava_beans';

export type Language =
  | 'it'  // Italiano
  | 'en'  // English
  | 'fr'  // Français
  | 'de'  // Deutsch
  | 'es'  // Español
  | 'pt'  // Português
  | 'nl'  // Nederlands
  | 'pl'  // Polski
  | 'ru'  // Русский
  | 'sv'  // Svenska
  | 'zh'  // 中文
  | 'ja'  // 日本語
  | 'ko'  // 한국어
  | 'th'  // ไทย
  | 'ar'; // العربية

export interface LanguageInfo {
  code: Language;
  name: string;
  nativeName: string;
  flag: string;
}

export const LANGUAGES: readonly LanguageInfo[] = [
  { code: 'it', name: 'Italian', nativeName: 'Italiano', flag: '🇮🇹' },
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇬🇧' },
  { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português', flag: '🇵🇹' },
  { code: 'nl', name: 'Dutch', nativeName: 'Nederlands', flag: '🇳🇱' },
  { code: 'pl', name: 'Polish', nativeName: 'Polski', flag: '🇵🇱' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский', flag: '🇷🇺' },
  { code: 'sv', name: 'Swedish', nativeName: 'Svenska', flag: '🇸🇪' },
  { code: 'zh', name: 'Chinese', nativeName: '中文', flag: '🇨🇳' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', flag: '🇯🇵' },
  { code: 'ko', name: 'Korean', nativeName: '한국어', flag: '🇰🇷' },
  { code: 'th', name: 'Thai', nativeName: 'ไทย', flag: '🇹🇭' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', flag: '🇸🇦' },
];

export interface Allergen {
  id: AllergenId;
  icon: string;
  translations: Record<Language, string>;
}

export type AppLanguage = 'it' | 'en' | 'es' | 'de' | 'fr';

export interface UserSettings {
  cardLanguage: AllLanguageCode;
  appLanguage: AppLanguage;
}

export interface LegalConsent {
  acceptedAt: string | null;  // ISO date string when user accepted
  version: string;            // Version of terms accepted (e.g., "1.0")
}

export interface TrackingConsent {
  status: 'not-determined' | 'authorized' | 'denied' | 'restricted';
  askedAt: string | null;     // ISO date when user was asked
}

export interface AppState {
  selectedAllergens: AllergenId[];
  settings: UserSettings;
}

// Lingue scaricabili via LibreTranslate
export type DownloadableLanguageCode =
  // Europa
  | 'el'  // Greco
  | 'tr'  // Turco
  | 'cs'  // Ceco
  | 'hu'  // Ungherese
  | 'ro'  // Rumeno
  | 'uk'  // Ucraino
  | 'da'  // Danese
  | 'fi'  // Finlandese
  | 'no'  // Norvegese
  | 'hr'  // Croato
  | 'bg'  // Bulgaro
  | 'sk'  // Slovacco
  | 'sl'  // Sloveno
  | 'sr'  // Serbo
  | 'lt'  // Lituano
  | 'lv'  // Lettone
  | 'et'  // Estone
  | 'is'  // Islandese
  | 'mk'  // Macedone
  | 'sq'  // Albanese
  | 'bs'  // Bosniaco
  | 'mt'  // Maltese
  | 'ga'  // Irlandese
  | 'cy'  // Gallese
  | 'ca'  // Catalano
  | 'eu'  // Basco
  | 'gl'  // Galiziano
  // Asia
  | 'he'  // Ebraico
  | 'hi'  // Hindi
  | 'pa'  // Punjabi
  | 'gu'  // Gujarati
  | 'kn'  // Kannada
  | 'ml'  // Malayalam
  | 'vi'  // Vietnamita
  | 'id'  // Indonesiano
  | 'ms'  // Malese
  | 'tl'  // Filippino/Tagalog
  | 'bn'  // Bengalese
  | 'ta'  // Tamil
  | 'te'  // Telugu
  | 'mr'  // Marathi
  | 'ur'  // Urdu
  | 'fa'  // Persiano
  | 'ps'  // Pashto
  | 'ku'  // Curdo
  | 'ne'  // Nepalese
  | 'si'  // Singalese
  | 'dv'  // Dhivehi (Maldiviano)
  | 'km'  // Khmer
  | 'lo'  // Laotiano
  | 'my'  // Birmano
  | 'ka'  // Georgiano
  | 'hy'  // Armeno
  | 'az'  // Azero
  | 'kk'  // Kazako
  | 'uz'  // Uzbeco
  | 'tg'  // Tagico
  | 'ky'  // Kirghiso
  | 'tk'  // Turkmeno
  | 'mn'  // Mongolo
  // Africa
  | 'sw'  // Swahili
  | 'af'  // Afrikaans
  | 'am'  // Amarico
  | 'ha'  // Hausa
  | 'yo'  // Yoruba
  | 'zu'  // Zulu
  | 'so'  // Somalo
  | 'mg'  // Malgascio
  // Altro
  | 'ht'  // Creolo haitiano
  | 'eo'; // Esperanto

export type LanguageRegion = 'europe' | 'asia' | 'africa' | 'other';

export interface DownloadableLanguageInfo {
  code: DownloadableLanguageCode;
  name: string;
  nativeName: string;
  flag: string;
  region: LanguageRegion;
}

export interface DownloadedLanguageData {
  allergens: Record<AllergenId, string>;
  descriptions: Record<AllergenId, string>;
  warnings?: Record<AllergenId, string>;
  restrictions?: Record<string, string>;
  otherFoods?: Record<string, string>;
  restrictionCardTexts?: {
    header: string;
    message: string;
    dietModeTexts: Record<string, { header: string; message: string; sectionMessage: string }>;
  };
  dietFoods?: Record<string, string>;
  cardTexts: {
    header: string;
    subtitle: string;
    pregnancySubtitle?: string;
    message: string;
    pregnancyMessage?: string;
    thanks: string;
    tapToSee: string;
    examples?: string;
  };
  downloadedAt: string;
}

export type DownloadedLanguagesStorage = Record<DownloadableLanguageCode, DownloadedLanguageData>;

// Tipo combinato per lingue (hardcoded + scaricate)
export type AllLanguageCode = Language | DownloadableLanguageCode;

// Re-export restriction types for convenience
export type { RestrictionItemId, RestrictionCategoryId } from '../constants/otherRestrictions';
export type { OtherFoodId } from '../constants/otherFoods';
