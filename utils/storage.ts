import AsyncStorage from '@react-native-async-storage/async-storage';
import { AllergenId, Language, AppLanguage, UserSettings, DownloadableLanguageCode, DownloadedLanguageData } from '../types';

const STORAGE_KEYS = {
  SELECTED_ALLERGENS: 'allergiapp_selected_allergens',
  SETTINGS: 'allergiapp_settings',
  DOWNLOADED_LANGUAGES: 'allergiapp_downloaded_languages',
};

const DEFAULT_SETTINGS: UserSettings = {
  cardLanguage: 'en',
  appLanguage: 'it',
};

export const storage = {
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
    } catch (error) {
      console.error('Error saving allergens:', error);
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
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  },

  async setCardLanguage(language: Language): Promise<void> {
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
    } catch (error) {
      console.error('Error clearing storage:', error);
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
    } catch (error) {
      console.error('Error saving downloaded language:', error);
    }
  },

  async deleteDownloadedLanguage(langCode: DownloadableLanguageCode): Promise<void> {
    try {
      const languages = await this.getDownloadedLanguages();
      delete languages[langCode];
      await AsyncStorage.setItem(STORAGE_KEYS.DOWNLOADED_LANGUAGES, JSON.stringify(languages));
    } catch (error) {
      console.error('Error deleting downloaded language:', error);
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
