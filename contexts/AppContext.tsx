import React, { createContext, useContext, useState, useCallback, useEffect, useMemo, useRef } from 'react';
import * as Crypto from 'expo-crypto';
import { storage, AppData, CURRENT_LEGAL_VERSION } from '../utils/storage';
import { setAppLanguage, getDeviceLanguage } from '../utils/i18n';
import { AllergenId, AllLanguageCode, AppLanguage, UserSettings, DownloadableLanguageCode, DownloadedLanguageData, LegalConsent, TrackingConsent } from '../types';
import { UserCard, MAX_USER_CARDS } from '../types/card';
import { RestrictionItemId } from '../constants/otherRestrictions';
import { OtherFoodId } from '../constants/otherFoods';
import { DietModeId, VegetarianLevel, DEFAULT_VEGETARIAN_LEVEL } from '../constants/dietModes';

export type CardCreateInput = Omit<UserCard, 'id' | 'createdAt'>;
export type CardUpdateInput = Partial<Omit<UserCard, 'id' | 'createdAt'>>;

interface AppContextValue {
  // State — these are "smart": they reflect the active card if one is selected,
  // otherwise they reflect the personal profile. Setters route to the same target.
  selectedAllergens: AllergenId[];
  selectedOtherFoods: OtherFoodId[];
  selectedRestrictions: RestrictionItemId[];
  activeDietModes: DietModeId[];
  vegetarianLevel: VegetarianLevel;
  settings: UserSettings;
  downloadedLanguages: Partial<Record<DownloadableLanguageCode, DownloadedLanguageData>>;
  legalConsent: LegalConsent;
  trackingConsent: TrackingConsent;
  isReady: boolean;

  // Raw profile state (NEVER routed to a card) — used by map "For my needs" and analytics
  profileAllergens: AllergenId[];
  profileOtherFoods: OtherFoodId[];
  profileRestrictions: RestrictionItemId[];
  profileActiveDietModes: DietModeId[];
  profileVegetarianLevel: VegetarianLevel;

  // User cards (extra cards, separate from profile)
  userCards: UserCard[];
  activeCardId: string | null;
  activeCard: UserCard | null;
  canCreateMoreCards: boolean;

  // Derived
  pregnancyMode: boolean;

  // Derived
  hasAcceptedLegalTerms: boolean;
  needsLegalConsent: boolean;
  downloadedLanguageCodes: DownloadableLanguageCode[];

  // Actions
  setSelectedAllergens: (allergens: AllergenId[]) => Promise<void>;
  setSelectedOtherFoods: (foods: OtherFoodId[]) => Promise<void>;
  setSelectedRestrictions: (restrictions: RestrictionItemId[]) => Promise<void>;
  setActiveDietModes: (modes: DietModeId[]) => Promise<void>;
  setVegetarianLevel: (level: VegetarianLevel) => Promise<void>;
  isDietModeActive: (id: DietModeId) => boolean;
  setCardLanguage: (language: AllLanguageCode) => Promise<void>;
  setAppLang: (language: AppLanguage) => Promise<void>;
  saveDownloadedLanguage: (langCode: DownloadableLanguageCode, data: DownloadedLanguageData) => Promise<void>;
  deleteDownloadedLanguage: (langCode: DownloadableLanguageCode) => Promise<void>;
  acceptLegalTerms: () => Promise<void>;
  setTrackingConsent: (consent: TrackingConsent) => Promise<void>;
  clearAll: () => Promise<void>;

  // Card actions
  createCard: (input: CardCreateInput) => Promise<UserCard | null>;
  updateCard: (id: string, input: CardUpdateInput) => Promise<void>;
  deleteCard: (id: string) => Promise<void>;
  setActiveCard: (id: string | null) => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [profileAllergens, setProfileAllergensState] = useState<AllergenId[]>([]);
  const [profileOtherFoods, setProfileOtherFoodsState] = useState<OtherFoodId[]>([]);
  const [profileRestrictions, setProfileRestrictionsState] = useState<RestrictionItemId[]>([]);
  const [profileActiveDietModes, setProfileActiveDietModesState] = useState<DietModeId[]>([]);
  const [profileVegetarianLevel, setProfileVegetarianLevelState] = useState<VegetarianLevel>(DEFAULT_VEGETARIAN_LEVEL);
  const [settings, setSettingsState] = useState<UserSettings>({ cardLanguage: 'en', appLanguage: 'en' });
  const [downloadedLanguages, setDownloadedLanguagesState] = useState<Partial<Record<DownloadableLanguageCode, DownloadedLanguageData>>>({});
  const [legalConsent, setLegalConsentState] = useState<LegalConsent>({ acceptedAt: null, version: '' });
  const [trackingConsent, setTrackingConsentState] = useState<TrackingConsent>({ status: 'not-determined', askedAt: null });
  const [userCards, setUserCardsState] = useState<UserCard[]>([]);
  const [activeCardId, setActiveCardIdState] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  // Refs as synchronous mirrors of the state we read inside async writers.
  // We update both ref and state in lock-step so consecutive writes within
  // the same tick (or before React flushes a render) see the latest values
  // without relying on the timing of functional state updaters.
  const userCardsRef = useRef<UserCard[]>([]);
  const activeCardIdRef = useRef<string | null>(null);

  const setUserCards = useCallback((next: UserCard[]) => {
    userCardsRef.current = next;
    setUserCardsState(next);
  }, []);

  const setActiveCardIdSync = useCallback((next: string | null) => {
    activeCardIdRef.current = next;
    setActiveCardIdState(next);
  }, []);

  useEffect(() => {
    const init = async () => {
      const data = await storage.loadAll();
      setProfileAllergensState(data.selectedAllergens);
      setProfileOtherFoodsState(data.selectedOtherFoods);
      setProfileRestrictionsState(data.selectedRestrictions);
      setProfileActiveDietModesState(data.activeDietModes);
      setProfileVegetarianLevelState(data.vegetarianLevel);
      setSettingsState(data.settings);
      setDownloadedLanguagesState(data.downloadedLanguages);
      setLegalConsentState(data.legalConsent);
      setTrackingConsentState(data.trackingConsent);
      setUserCards(data.userCards);
      setActiveCardIdSync(data.activeCardId);
      setAppLanguage(data.settings.appLanguage);
      setIsReady(true);
    };
    init();
  }, [setUserCards, setActiveCardIdSync]);

  // activeCard derived early so smart setters can depend on it
  const activeCard = useMemo<UserCard | null>(
    () => userCards.find(c => c.id === activeCardId) ?? null,
    [userCards, activeCardId],
  );

  // Smart reads: route to active card if any, else profile
  const selectedAllergens = activeCard ? activeCard.allergens : profileAllergens;
  const selectedOtherFoods = activeCard ? activeCard.otherFoods : profileOtherFoods;
  const selectedRestrictions = activeCard ? activeCard.restrictions : profileRestrictions;
  const activeDietModes = activeCard ? activeCard.dietModes : profileActiveDietModes;
  const vegetarianLevel = activeCard ? activeCard.vegetarianLevel : profileVegetarianLevel;

  const pregnancyMode = activeDietModes.includes('pregnancy');

  // Derived state: check if user has accepted current version of legal terms
  const hasAcceptedLegalTerms = legalConsent.acceptedAt !== null && legalConsent.version === CURRENT_LEGAL_VERSION;
  const needsLegalConsent = !hasAcceptedLegalTerms;

  // Smart write helper: route to active card (in-memory + storage) or profile.
  // Reads from refs (synchronous mirrors of state) so consecutive saves within
  // one handler (e.g. saveAllergens + saveOtherFoods) always see the latest
  // values, regardless of React's render scheduling.
  const writeToActiveTarget = useCallback(async (patch: CardUpdateInput) => {
    const targetId = activeCardIdRef.current;
    if (targetId) {
      const current = userCardsRef.current;
      if (!current.some(c => c.id === targetId)) return;
      const next = current.map(c => c.id === targetId ? { ...c, ...patch } : c);
      setUserCards(next);
      await storage.setUserCards(next);
      return;
    }
    if (patch.allergens !== undefined) {
      setProfileAllergensState(patch.allergens);
      await storage.setSelectedAllergens(patch.allergens);
    }
    if (patch.otherFoods !== undefined) {
      setProfileOtherFoodsState(patch.otherFoods);
      await storage.setSelectedOtherFoods(patch.otherFoods);
    }
    if (patch.restrictions !== undefined) {
      setProfileRestrictionsState(patch.restrictions);
      await storage.setSelectedRestrictions(patch.restrictions);
    }
    if (patch.dietModes !== undefined) {
      setProfileActiveDietModesState(patch.dietModes);
      await storage.setActiveDietModes(patch.dietModes);
    }
    if (patch.vegetarianLevel !== undefined) {
      setProfileVegetarianLevelState(patch.vegetarianLevel);
      await storage.setVegetarianLevel(patch.vegetarianLevel);
    }
  }, [setUserCards]);

  const setSelectedAllergens = useCallback(async (allergens: AllergenId[]) => {
    await writeToActiveTarget({ allergens });
  }, [writeToActiveTarget]);

  const setSelectedOtherFoods = useCallback(async (foods: OtherFoodId[]) => {
    await writeToActiveTarget({ otherFoods: foods });
  }, [writeToActiveTarget]);

  const setSelectedRestrictions = useCallback(async (restrictions: RestrictionItemId[]) => {
    await writeToActiveTarget({ restrictions });
  }, [writeToActiveTarget]);

  const setActiveDietModes = useCallback(async (modes: DietModeId[]) => {
    await writeToActiveTarget({ dietModes: modes });
  }, [writeToActiveTarget]);

  const setVegetarianLevel = useCallback(async (level: VegetarianLevel) => {
    await writeToActiveTarget({ vegetarianLevel: level });
  }, [writeToActiveTarget]);

  const isDietModeActive = useCallback((id: DietModeId) => {
    return activeDietModes.includes(id);
  }, [activeDietModes]);

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
    let didReset = false;
    setSettingsState(prev => {
      if (prev.cardLanguage === langCode) {
        didReset = true;
        return { ...prev, cardLanguage: 'en' };
      }
      return prev;
    });
    if (didReset) {
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
    const deviceLanguage = getDeviceLanguage();
    const defaultSettings = { cardLanguage: 'en' as AllLanguageCode, appLanguage: deviceLanguage };
    setProfileAllergensState([]);
    setProfileOtherFoodsState([]);
    setProfileRestrictionsState([]);
    setProfileActiveDietModesState([]);
    setProfileVegetarianLevelState(DEFAULT_VEGETARIAN_LEVEL);
    setSettingsState(defaultSettings);
    setDownloadedLanguagesState({});
    setUserCards([]);
    setActiveCardIdSync(null);
    // Note: we keep legal consent when clearing data (user already accepted terms)
    setAppLanguage(deviceLanguage);
    await storage.clearAll();
  }, [setUserCards, setActiveCardIdSync]);

  const createCard = useCallback(async (input: CardCreateInput): Promise<UserCard | null> => {
    const current = userCardsRef.current;
    if (current.length >= MAX_USER_CARDS) return null;
    const created: UserCard = {
      ...input,
      id: Crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    const next = [...current, created];
    setUserCards(next);
    await storage.setUserCards(next);
    return created;
  }, [setUserCards]);

  const updateCard = useCallback(async (id: string, input: CardUpdateInput) => {
    const current = userCardsRef.current;
    if (!current.some(c => c.id === id)) return;
    const next = current.map(c => c.id === id ? { ...c, ...input } : c);
    setUserCards(next);
    await storage.setUserCards(next);
  }, [setUserCards]);

  const deleteCard = useCallback(async (id: string) => {
    const current = userCardsRef.current;
    const next = current.filter(c => c.id !== id);
    setUserCards(next);
    await storage.setUserCards(next);
    if (activeCardIdRef.current === id) {
      setActiveCardIdSync(null);
      await storage.setActiveCardId(null);
    }
  }, [setUserCards, setActiveCardIdSync]);

  const setActiveCard = useCallback(async (id: string | null) => {
    setActiveCardIdSync(id);
    await storage.setActiveCardId(id);
  }, [setActiveCardIdSync]);

  const downloadedLanguageCodes = useMemo(
    () => Object.keys(downloadedLanguages) as DownloadableLanguageCode[],
    [downloadedLanguages],
  );

  const canCreateMoreCards = userCards.length < MAX_USER_CARDS;

  const value = useMemo<AppContextValue>(() => ({
    selectedAllergens,
    selectedOtherFoods,
    selectedRestrictions,
    activeDietModes,
    vegetarianLevel,
    pregnancyMode,
    settings,
    downloadedLanguages,
    legalConsent,
    trackingConsent,
    isReady,
    profileAllergens,
    profileOtherFoods,
    profileRestrictions,
    profileActiveDietModes,
    profileVegetarianLevel,
    userCards,
    activeCardId,
    activeCard,
    canCreateMoreCards,
    hasAcceptedLegalTerms,
    needsLegalConsent,
    downloadedLanguageCodes,
    setSelectedAllergens,
    setSelectedOtherFoods,
    setSelectedRestrictions,
    setActiveDietModes,
    setVegetarianLevel,
    isDietModeActive,
    setCardLanguage,
    setAppLang,
    saveDownloadedLanguage,
    deleteDownloadedLanguage,
    acceptLegalTerms,
    setTrackingConsent: setTrackingConsentAction,
    clearAll,
    createCard,
    updateCard,
    deleteCard,
    setActiveCard,
  }), [
    selectedAllergens, selectedOtherFoods, selectedRestrictions,
    activeDietModes, vegetarianLevel, pregnancyMode,
    settings, downloadedLanguages, legalConsent, trackingConsent,
    isReady,
    profileAllergens, profileOtherFoods, profileRestrictions,
    profileActiveDietModes, profileVegetarianLevel,
    userCards, activeCardId, activeCard, canCreateMoreCards,
    hasAcceptedLegalTerms, needsLegalConsent, downloadedLanguageCodes,
    setSelectedAllergens, setSelectedOtherFoods, setSelectedRestrictions,
    setActiveDietModes, setVegetarianLevel, isDietModeActive,
    setCardLanguage, setAppLang, saveDownloadedLanguage,
    deleteDownloadedLanguage, acceptLegalTerms, setTrackingConsentAction, clearAll,
    createCard, updateCard, deleteCard, setActiveCard,
  ]);

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppContext must be used within AppProvider');
  return ctx;
}
