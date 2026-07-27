// Lingue selezionabili per i link menù: le 15 lingue UI dell'app.
// Nomi nativi (auto-descrittivi, non serve tradurli).
export interface MenuLanguage {
  code: string;
  native: string;
}

export const MENU_LANGUAGES: MenuLanguage[] = [
  { code: 'it', native: 'Italiano' },
  { code: 'en', native: 'English' },
  { code: 'fr', native: 'Français' },
  { code: 'de', native: 'Deutsch' },
  { code: 'es', native: 'Español' },
  { code: 'pt', native: 'Português' },
  { code: 'nl', native: 'Nederlands' },
  { code: 'pl', native: 'Polski' },
  { code: 'ru', native: 'Русский' },
  { code: 'sv', native: 'Svenska' },
  { code: 'zh', native: '中文' },
  { code: 'ja', native: '日本語' },
  { code: 'ko', native: '한국어' },
  { code: 'th', native: 'ไทย' },
  { code: 'ar', native: 'العربية' },
];
