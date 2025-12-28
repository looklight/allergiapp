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
  | 'mollusks';

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

export const LANGUAGES: LanguageInfo[] = [
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

export type AppLanguage = 'it' | 'en';

export interface UserSettings {
  cardLanguage: Language;
  appLanguage: AppLanguage;
}

export interface AppState {
  selectedAllergens: AllergenId[];
  settings: UserSettings;
}
