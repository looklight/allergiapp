import AsyncStorage from '@react-native-async-storage/async-storage';
import { AllergenId, AllLanguageCode, AppLanguage, UserSettings, DownloadableLanguageCode, DownloadedLanguageData, LegalConsent, TrackingConsent } from '../types';

const STORAGE_KEYS = {
  SELECTED_ALLERGENS: 'allergiapp_selected_allergens',
  SETTINGS: 'allergiapp_settings',
  DOWNLOADED_LANGUAGES: 'allergiapp_downloaded_languages',
  LEGAL_CONSENT: 'allergiapp_legal_consent',
  TRACKING_CONSENT: 'allergiapp_tracking_consent',
};

export const CURRENT_LEGAL_VERSION = '1.0';

const DEFAULT_SETTINGS: UserSettings = {
  cardLanguage: 'en',
  appLanguage: 'it',
};

export interface AppData {
  selectedAllergens: AllergenId[];
  settings: UserSettings;
  downloadedLanguages: Partial<Record<DownloadableLanguageCode, DownloadedLanguageData>>;
  legalConsent: LegalConsent;
  trackingConsent: TrackingConsent;
}

const DEFAULT_LEGAL_CONSENT: LegalConsent = {
  acceptedAt: null,
  version: '',
};

const DEFAULT_TRACKING_CONSENT: TrackingConsent = {
  status: 'not-determined',
  askedAt: null,
};

export const storage = {
  // Carica tutti i dati in una singola operazione (per il Context)
  async loadAll(): Promise<AppData> {
    try {
      const keys = [
        STORAGE_KEYS.SELECTED_ALLERGENS,
        STORAGE_KEYS.SETTINGS,
        STORAGE_KEYS.DOWNLOADED_LANGUAGES,
        STORAGE_KEYS.LEGAL_CONSENT,
        STORAGE_KEYS.TRACKING_CONSENT,
      ];
      const results = await AsyncStorage.multiGet(keys);
      const [allergensRaw, settingsRaw, downloadedRaw, legalRaw, trackingRaw] = results.map(([, v]) => v);

      return {
        selectedAllergens: allergensRaw ? JSON.parse(allergensRaw) : [],
        settings: settingsRaw ? { ...DEFAULT_SETTINGS, ...JSON.parse(settingsRaw) } : DEFAULT_SETTINGS,
        downloadedLanguages: downloadedRaw ? JSON.parse(downloadedRaw) : {},
        legalConsent: legalRaw ? JSON.parse(legalRaw) : DEFAULT_LEGAL_CONSENT,
        trackingConsent: trackingRaw ? JSON.parse(trackingRaw) : DEFAULT_TRACKING_CONSENT,
      };
    } catch {
      return {
        selectedAllergens: [],
        settings: DEFAULT_SETTINGS,
        downloadedLanguages: {},
        legalConsent: DEFAULT_LEGAL_CONSENT,
        trackingConsent: DEFAULT_TRACKING_CONSENT,
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

  // Legal consent methods
  async getLegalConsent(): Promise<LegalConsent> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.LEGAL_CONSENT);
      return data ? JSON.parse(data) : DEFAULT_LEGAL_CONSENT;
    } catch {
      return DEFAULT_LEGAL_CONSENT;
    }
  },

  async setLegalConsent(consent: LegalConsent): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.LEGAL_CONSENT, JSON.stringify(consent));
    } catch {
      // Storage write failed silently
    }
  },

  async acceptLegalTerms(): Promise<LegalConsent> {
    const consent: LegalConsent = {
      acceptedAt: new Date().toISOString(),
      version: CURRENT_LEGAL_VERSION,
    };
    await this.setLegalConsent(consent);
    return consent;
  },

  // Tracking consent methods
  async getTrackingConsent(): Promise<TrackingConsent> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.TRACKING_CONSENT);
      return data ? JSON.parse(data) : DEFAULT_TRACKING_CONSENT;
    } catch {
      return DEFAULT_TRACKING_CONSENT;
    }
  },

  async setTrackingConsent(consent: TrackingConsent): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.TRACKING_CONSENT, JSON.stringify(consent));
    } catch {
      // Storage write failed silently
    }
  },
};
