import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { storage, AppData } from './storage';
import { setAppLanguage } from './i18n';
import { AllergenId, AllLanguageCode, AppLanguage, UserSettings, DownloadableLanguageCode, DownloadedLanguageData } from '../types';

interface AppContextValue {
  // State
  selectedAllergens: AllergenId[];
  settings: UserSettings;
  downloadedLanguages: Partial<Record<DownloadableLanguageCode, DownloadedLanguageData>>;
  isReady: boolean;

  // Actions
  setSelectedAllergens: (allergens: AllergenId[]) => Promise<void>;
  setCardLanguage: (language: AllLanguageCode) => Promise<void>;
  setAppLang: (language: AppLanguage) => Promise<void>;
  saveDownloadedLanguage: (langCode: DownloadableLanguageCode, data: DownloadedLanguageData) => Promise<void>;
  deleteDownloadedLanguage: (langCode: DownloadableLanguageCode) => Promise<void>;
  clearAll: () => Promise<void>;

  // Derived
  downloadedLanguageCodes: DownloadableLanguageCode[];
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [selectedAllergens, setSelectedAllergensState] = useState<AllergenId[]>([]);
  const [settings, setSettingsState] = useState<UserSettings>({ cardLanguage: 'en', appLanguage: 'it' });
  const [downloadedLanguages, setDownloadedLanguagesState] = useState<Partial<Record<DownloadableLanguageCode, DownloadedLanguageData>>>({});
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const init = async () => {
      const data = await storage.loadAll();
      setSelectedAllergensState(data.selectedAllergens);
      setSettingsState(data.settings);
      setDownloadedLanguagesState(data.downloadedLanguages);
      setAppLanguage(data.settings.appLanguage);
      setIsReady(true);
    };
    init();
  }, []);

  const setSelectedAllergens = useCallback(async (allergens: AllergenId[]) => {
    setSelectedAllergensState(allergens);
    await storage.setSelectedAllergens(allergens);
  }, []);

  const setCardLanguage = useCallback(async (language: AllLanguageCode) => {
    setSettingsState(prev => ({ ...prev, cardLanguage: language }));
    await storage.setCardLanguage(language);
  }, []);

  const setAppLang = useCallback(async (language: AppLanguage) => {
    setSettingsState(prev => ({ ...prev, appLanguage: language }));
    setAppLanguage(language);
    await storage.setAppLanguage(language);
  }, []);

  const saveDownloadedLanguage = useCallback(async (langCode: DownloadableLanguageCode, data: DownloadedLanguageData) => {
    setDownloadedLanguagesState(prev => ({ ...prev, [langCode]: data }));
    await storage.saveDownloadedLanguage(langCode, data);
  }, []);

  const deleteDownloadedLanguage = useCallback(async (langCode: DownloadableLanguageCode) => {
    setDownloadedLanguagesState(prev => {
      const next = { ...prev };
      delete next[langCode];
      return next;
    });
    await storage.deleteDownloadedLanguage(langCode);
  }, []);

  const clearAll = useCallback(async () => {
    const defaultSettings = { cardLanguage: 'en' as AllLanguageCode, appLanguage: 'it' as AppLanguage };
    setSelectedAllergensState([]);
    setSettingsState(defaultSettings);
    setDownloadedLanguagesState({});
    setAppLanguage(defaultSettings.appLanguage);
    await storage.clearAll();
  }, []);

  const downloadedLanguageCodes = Object.keys(downloadedLanguages) as DownloadableLanguageCode[];

  return (
    <AppContext.Provider value={{
      selectedAllergens,
      settings,
      downloadedLanguages,
      isReady,
      setSelectedAllergens,
      setCardLanguage,
      setAppLang,
      saveDownloadedLanguage,
      deleteDownloadedLanguage,
      clearAll,
      downloadedLanguageCodes,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppContext must be used within AppProvider');
  return ctx;
}
