import AsyncStorage from '@react-native-async-storage/async-storage';
import { AllergenId, AllLanguageCode, AppLanguage, UserSettings, DownloadableLanguageCode, DownloadedLanguageData } from '../types';

const STORAGE_KEYS = {
  SELECTED_ALLERGENS: 'allergiapp_selected_allergens',
  SETTINGS: 'allergiapp_settings',
  DOWNLOADED_LANGUAGES: 'allergiapp_downloaded_languages',
};

const DEFAULT_SETTINGS: UserSettings = {
  cardLanguage: 'en',
  appLanguage: 'it',
};

export interface AppData {
  selectedAllergens: AllergenId[];
  settings: UserSettings;
  downloadedLanguages: Partial<Record<DownloadableLanguageCode, DownloadedLanguageData>>;
}

export const storage = {
  // Carica tutti i dati in una singola operazione (per il Context)
  async loadAll(): Promise<AppData> {
    try {
      const keys = [
        STORAGE_KEYS.SELECTED_ALLERGENS,
        STORAGE_KEYS.SETTINGS,
        STORAGE_KEYS.DOWNLOADED_LANGUAGES,
      ];
      const results = await AsyncStorage.multiGet(keys);
      const [allergensRaw, settingsRaw, downloadedRaw] = results.map(([, v]) => v);

      return {
        selectedAllergens: allergensRaw ? JSON.parse(allergensRaw) : [],
        settings: settingsRaw ? { ...DEFAULT_SETTINGS, ...JSON.parse(settingsRaw) } : DEFAULT_SETTINGS,
        downloadedLanguages: downloadedRaw ? JSON.parse(downloadedRaw) : {},
      };
    } catch {
      return {
        selectedAllergens: [],
        settings: DEFAULT_SETTINGS,
        downloadedLanguages: {},
      };
    }
  },

  async getSelectedAllergens(): Promise<AllergenId[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.SELECTED_ALLERGENS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  async setSelectedAllergens(allergens: AllergenId[]): Promise<void> {
    try {
      await AsyncStorage.setItem(
        STORAGE_KEYS.SELECTED_ALLERGENS,
        JSON.stringify(allergens)
      );
    } catch {
      // Storage write failed silently
    }
  },

  async getSettings(): Promise<UserSettings> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.SETTINGS);
      return data ? { ...DEFAULT_SETTINGS, ...JSON.parse(data) } : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  },

  async setSettings(settings: Partial<UserSettings>): Promise<void> {
    try {
      const current = await this.getSettings();
      const updated = { ...current, ...settings };
      await AsyncStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(updated));
    } catch {
      // Storage write failed silently
    }
  },

  async setCardLanguage(language: AllLanguageCode): Promise<void> {
    await this.setSettings({ cardLanguage: language });
  },

  async setAppLanguage(language: AppLanguage): Promise<void> {
    await this.setSettings({ appLanguage: language });
  },

  async clearAll(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.SELECTED_ALLERGENS,
        STORAGE_KEYS.SETTINGS,
        STORAGE_KEYS.DOWNLOADED_LANGUAGES,
      ]);
    } catch {
      // Storage clear failed silently
    }
  },

  // Metodi per lingue scaricate
  async getDownloadedLanguages(): Promise<Partial<Record<DownloadableLanguageCode, DownloadedLanguageData>>> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.DOWNLOADED_LANGUAGES);
      return data ? JSON.parse(data) : {};
    } catch {
      return {};
    }
  },

  async getDownloadedLanguage(langCode: DownloadableLanguageCode): Promise<DownloadedLanguageData | null> {
    try {
      const languages = await this.getDownloadedLanguages();
      return languages[langCode] || null;
    } catch {
      return null;
    }
  },

  async saveDownloadedLanguage(langCode: DownloadableLanguageCode, data: DownloadedLanguageData): Promise<void> {
    try {
      const languages = await this.getDownloadedLanguages();
      languages[langCode] = data;
      await AsyncStorage.setItem(STORAGE_KEYS.DOWNLOADED_LANGUAGES, JSON.stringify(languages));
    } catch {
      // Storage write failed silently
    }
  },

  async deleteDownloadedLanguage(langCode: DownloadableLanguageCode): Promise<void> {
    try {
      const languages = await this.getDownloadedLanguages();
      delete languages[langCode];
      await AsyncStorage.setItem(STORAGE_KEYS.DOWNLOADED_LANGUAGES, JSON.stringify(languages));
    } catch {
      // Storage delete failed silently
    }
  },

  async getDownloadedLanguageCodes(): Promise<DownloadableLanguageCode[]> {
    try {
      const languages = await this.getDownloadedLanguages();
      return Object.keys(languages) as DownloadableLanguageCode[];
    } catch {
      return [];
    }
  },
};
