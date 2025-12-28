import AsyncStorage from '@react-native-async-storage/async-storage';
import { AllergenId, Language, AppLanguage, UserSettings } from '../types';

const STORAGE_KEYS = {
  SELECTED_ALLERGENS: 'allergiapp_selected_allergens',
  SETTINGS: 'allergiapp_settings',
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
      ]);
    } catch (error) {
      console.error('Error clearing storage:', error);
    }
  },
};
