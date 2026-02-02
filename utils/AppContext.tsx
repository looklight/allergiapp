import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { storage, AppData, CURRENT_LEGAL_VERSION } from './storage';
import { setAppLanguage } from './i18n';
import { AllergenId, AllLanguageCode, AppLanguage, UserSettings, DownloadableLanguageCode, DownloadedLanguageData, LegalConsent, TrackingConsent } from '../types';

interface AppContextValue {
  // State
  selectedAllergens: AllergenId[];
  settings: UserSettings;
  downloadedLanguages: Partial<Record<DownloadableLanguageCode, DownloadedLanguageData>>;
  legalConsent: LegalConsent;
  trackingConsent: TrackingConsent;
  isReady: boolean;

  // Derived
  hasAcceptedLegalTerms: boolean;
  needsLegalConsent: boolean;
  downloadedLanguageCodes: DownloadableLanguageCode[];

  // Actions
  setSelectedAllergens: (allergens: AllergenId[]) => Promise<void>;
  setCardLanguage: (language: AllLanguageCode) => Promise<void>;
  setAppLang: (language: AppLanguage) => Promise<void>;
  saveDownloadedLanguage: (langCode: DownloadableLanguageCode, data: DownloadedLanguageData) => Promise<void>;
  deleteDownloadedLanguage: (langCode: DownloadableLanguageCode) => Promise<void>;
  acceptLegalTerms: () => Promise<void>;
  setTrackingConsent: (consent: TrackingConsent) => Promise<void>;
  clearAll: () => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [selectedAllergens, setSelectedAllergensState] = useState<AllergenId[]>([]);
  const [settings, setSettingsState] = useState<UserSettings>({ cardLanguage: 'en', appLanguage: 'it' });
  const [downloadedLanguages, setDownloadedLanguagesState] = useState<Partial<Record<DownloadableLanguageCode, DownloadedLanguageData>>>({});
  const [legalConsent, setLegalConsentState] = useState<LegalConsent>({ acceptedAt: null, version: '' });
  const [trackingConsent, setTrackingConsentState] = useState<TrackingConsent>({ status: 'not-determined', askedAt: null });
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const init = async () => {
      const data = await storage.loadAll();
      setSelectedAllergensState(data.selectedAllergens);
      setSettingsState(data.settings);
      setDownloadedLanguagesState(data.downloadedLanguages);
      setLegalConsentState(data.legalConsent);
      setTrackingConsentState(data.trackingConsent);
      setAppLanguage(data.settings.appLanguage);
      setIsReady(true);
    };
    init();
  }, []);

  // Derived state: check if user has accepted current version of legal terms
  const hasAcceptedLegalTerms = legalConsent.acceptedAt !== null && legalConsent.version === CURRENT_LEGAL_VERSION;
  const needsLegalConsent = !hasAcceptedLegalTerms;

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

    // Se la lingua eliminata era la cardLanguage selezionata, imposta il default (inglese)
    setSettingsState(prev => {
      if (prev.cardLanguage === langCode) {
        return { ...prev, cardLanguage: 'en' };
      }
      return prev;
    });
    // Salva anche su storage (fuori da setState per poter fare await)
    const currentSettings = await storage.getSettings();
    if (currentSettings.cardLanguage === langCode) {
      await storage.setCardLanguage('en');
    }
  }, []);

  const acceptLegalTerms = useCallback(async () => {
    const consent = await storage.acceptLegalTerms();
    setLegalConsentState(consent);
  }, []);

  const setTrackingConsentAction = useCallback(async (consent: TrackingConsent) => {
    setTrackingConsentState(consent);
    await storage.setTrackingConsent(consent);
  }, []);

  const clearAll = useCallback(async () => {
    const defaultSettings = { cardLanguage: 'en' as AllLanguageCode, appLanguage: 'it' as AppLanguage };
    setSelectedAllergensState([]);
    setSettingsState(defaultSettings);
    setDownloadedLanguagesState({});
    // Note: we keep legal consent when clearing data (user already accepted terms)
    setAppLanguage(defaultSettings.appLanguage);
    await storage.clearAll();
  }, []);

  const downloadedLanguageCodes = Object.keys(downloadedLanguages) as DownloadableLanguageCode[];

  return (
    <AppContext.Provider value={{
      selectedAllergens,
      settings,
      downloadedLanguages,
      legalConsent,
      trackingConsent,
      isReady,
      hasAcceptedLegalTerms,
      needsLegalConsent,
      downloadedLanguageCodes,
      setSelectedAllergens,
      setCardLanguage,
      setAppLang,
      saveDownloadedLanguage,
      deleteDownloadedLanguage,
      acceptLegalTerms,
      setTrackingConsent: setTrackingConsentAction,
      clearAll,
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
