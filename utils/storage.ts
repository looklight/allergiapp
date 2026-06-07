import AsyncStorage from '@react-native-async-storage/async-storage';
import { AllergenId, AllLanguageCode, AppLanguage, UserSettings, DownloadableLanguageCode, DownloadedLanguageData, LegalConsent, TrackingConsent } from '../types';
import { RestrictionItemId } from '../constants/otherRestrictions';
import { OtherFoodId } from '../constants/otherFoods';
import { DietModeId, VegetarianLevel, DEFAULT_VEGETARIAN_LEVEL } from '../constants/dietModes';
import { UserCard } from '../types/card';
import { getDeviceLanguage } from './i18n';

const STORAGE_KEYS = {
  SELECTED_ALLERGENS: 'allergiapp_selected_allergens',
  SELECTED_RESTRICTIONS: 'allergiapp_selected_restrictions',
  SELECTED_OTHER_FOODS: 'allergiapp_selected_other_foods',
  ACTIVE_DIET_MODES: 'allergiapp_active_diet_modes',
  VEGETARIAN_LEVEL: 'allergiapp_vegetarian_level',
  SETTINGS: 'allergiapp_settings',
  DOWNLOADED_LANGUAGES: 'allergiapp_downloaded_languages',
  LEGAL_CONSENT: 'allergiapp_legal_consent',
  TRACKING_CONSENT: 'allergiapp_tracking_consent',
  FOR_MY_NEEDS: 'allergiapp_for_my_needs',
  DISMISSED_POPUPS: 'allergiapp_dismissed_popups',
  RECENT_PLACES: 'allergiapp_recent_places',
  USER_CARDS: 'allergiapp_user_cards',
  ACTIVE_CARD_ID: 'allergiapp_active_card_id',
  PROFILE_COUNTS: 'allergiapp_profile_counts',
  PROFILE_SELECTED_PILL: 'allergiapp_profile_selected_pill',
  COLLECTIONS_META: 'allergiapp_collections_meta',
  MAP_HIDDEN_COLLECTIONS: 'allergiapp_map_hidden_collections',
  THEME_MODE: 'allergiapp_theme_mode',
};

export type ThemeMode = 'system' | 'light' | 'dark';
const DEFAULT_THEME_MODE: ThemeMode = 'system';

export type ProfileCounts = { reviews: number; favorites: number };

/** Metadati pill lista (per la cache-first delle pill liste nel profilo). */
export type CollectionMeta = { id: string; name: string; emoji: string | null; item_count: number };

export type RecentPlace = {
  name: string;
  latitude: number;
  longitude: number;
  placeType?: string;
};

const MAX_RECENT_PLACES = 4;

const recentPlaceKey = (p: RecentPlace) =>
  `${p.name}|${p.latitude.toFixed(3)}|${p.longitude.toFixed(3)}`;

export const CURRENT_LEGAL_VERSION = '1.0';

const DEFAULT_SETTINGS: UserSettings = {
  cardLanguage: 'en',
  appLanguage: getDeviceLanguage(),
  reviewsDisclaimerDismissed: false,
};

export interface AppData {
  selectedAllergens: AllergenId[];
  selectedOtherFoods: OtherFoodId[];
  selectedRestrictions: RestrictionItemId[];
  activeDietModes: DietModeId[];
  vegetarianLevel: VegetarianLevel;
  settings: UserSettings;
  downloadedLanguages: Partial<Record<DownloadableLanguageCode, DownloadedLanguageData>>;
  legalConsent: LegalConsent;
  trackingConsent: TrackingConsent;
  userCards: UserCard[];
  activeCardId: string | null;
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
    const keys = [
      STORAGE_KEYS.SELECTED_ALLERGENS,
      STORAGE_KEYS.SELECTED_OTHER_FOODS,
      STORAGE_KEYS.SELECTED_RESTRICTIONS,
      STORAGE_KEYS.ACTIVE_DIET_MODES,
      STORAGE_KEYS.VEGETARIAN_LEVEL,
      STORAGE_KEYS.SETTINGS,
      STORAGE_KEYS.DOWNLOADED_LANGUAGES,
      STORAGE_KEYS.LEGAL_CONSENT,
      STORAGE_KEYS.TRACKING_CONSENT,
      STORAGE_KEYS.USER_CARDS,
      STORAGE_KEYS.ACTIVE_CARD_ID,
    ];

    let results: readonly [string, string | null][];
    try {
      results = await AsyncStorage.multiGet(keys);
    } catch {
      return {
        selectedAllergens: [],
        selectedOtherFoods: [],
        selectedRestrictions: [],
        activeDietModes: [],
        vegetarianLevel: DEFAULT_VEGETARIAN_LEVEL,
        settings: DEFAULT_SETTINGS,
        downloadedLanguages: {},
        legalConsent: DEFAULT_LEGAL_CONSENT,
        trackingConsent: DEFAULT_TRACKING_CONSENT,
        userCards: [],
        activeCardId: null,
      };
    }

    const [allergensRaw, otherFoodsRaw, restrictionsRaw, dietModesRaw, vegLevelRaw, settingsRaw, downloadedRaw, legalRaw, trackingRaw, userCardsRaw, activeCardIdRaw] = results.map(([, v]) => v);

    const safeParse = <T>(raw: string | null | undefined, fallback: T): T => {
      if (!raw) return fallback;
      try { return JSON.parse(raw); } catch { return fallback; }
    };

    // Clean up legacy 'vegan' from activeDietModes
    const rawModes: DietModeId[] = safeParse(dietModesRaw, []);
    const validModeIds: DietModeId[] = ['pregnancy', 'vegetarian', 'nickel', 'histamine', 'diabetes'];
    const cleanModes = rawModes.filter(id => validModeIds.includes(id as DietModeId)) as DietModeId[];

    const userCards: UserCard[] = safeParse(userCardsRaw, []);

    return {
      selectedAllergens: safeParse(allergensRaw, []),
      selectedOtherFoods: safeParse(otherFoodsRaw, []),
      selectedRestrictions: safeParse(restrictionsRaw, []),
      activeDietModes: cleanModes,
      vegetarianLevel: vegLevelRaw && ['no_meat', 'no_meat_fish', 'no_animal_products'].includes(vegLevelRaw) ? vegLevelRaw as VegetarianLevel : DEFAULT_VEGETARIAN_LEVEL,
      settings: { ...DEFAULT_SETTINGS, ...safeParse(settingsRaw, {}) },
      downloadedLanguages: safeParse(downloadedRaw, {}),
      legalConsent: safeParse(legalRaw, DEFAULT_LEGAL_CONSENT),
      trackingConsent: safeParse(trackingRaw, DEFAULT_TRACKING_CONSENT),
      userCards,
      activeCardId: activeCardIdRaw && userCards.some(c => c.id === activeCardIdRaw) ? activeCardIdRaw : null,
    };
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

  async getSelectedOtherFoods(): Promise<OtherFoodId[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.SELECTED_OTHER_FOODS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  async setSelectedOtherFoods(foods: OtherFoodId[]): Promise<void> {
    try {
      await AsyncStorage.setItem(
        STORAGE_KEYS.SELECTED_OTHER_FOODS,
        JSON.stringify(foods)
      );
    } catch {
      // Storage write failed silently
    }
  },

  async getSelectedRestrictions(): Promise<RestrictionItemId[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.SELECTED_RESTRICTIONS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  async setSelectedRestrictions(restrictions: RestrictionItemId[]): Promise<void> {
    try {
      await AsyncStorage.setItem(
        STORAGE_KEYS.SELECTED_RESTRICTIONS,
        JSON.stringify(restrictions)
      );
    } catch {
      // Storage write failed silently
    }
  },

  async setActiveDietModes(modes: DietModeId[]): Promise<void> {
    try {
      await AsyncStorage.setItem(
        STORAGE_KEYS.ACTIVE_DIET_MODES,
        JSON.stringify(modes)
      );
    } catch {
      // Storage write failed silently
    }
  },

  async setVegetarianLevel(level: VegetarianLevel): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.VEGETARIAN_LEVEL, level);
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

  async getThemeMode(): Promise<ThemeMode> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.THEME_MODE);
      return data === 'light' || data === 'dark' || data === 'system'
        ? data
        : DEFAULT_THEME_MODE;
    } catch {
      return DEFAULT_THEME_MODE;
    }
  },

  async setThemeMode(mode: ThemeMode): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.THEME_MODE, mode);
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
        STORAGE_KEYS.SELECTED_OTHER_FOODS,
        STORAGE_KEYS.SELECTED_RESTRICTIONS,
        STORAGE_KEYS.ACTIVE_DIET_MODES,
        STORAGE_KEYS.VEGETARIAN_LEVEL,
        STORAGE_KEYS.SETTINGS,
        STORAGE_KEYS.DOWNLOADED_LANGUAGES,
        STORAGE_KEYS.FOR_MY_NEEDS,
        STORAGE_KEYS.USER_CARDS,
        STORAGE_KEYS.ACTIVE_CARD_ID,
        STORAGE_KEYS.PROFILE_COUNTS,
      ]);
    } catch {
      // Storage clear failed silently
    }
  },

  // Metodi per le card utente
  async getUserCards(): Promise<UserCard[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.USER_CARDS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  async setUserCards(cards: UserCard[]): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.USER_CARDS, JSON.stringify(cards));
    } catch {
      // Storage write failed silently
    }
  },

  async getActiveCardId(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(STORAGE_KEYS.ACTIVE_CARD_ID);
    } catch {
      return null;
    }
  },

  async setActiveCardId(cardId: string | null): Promise<void> {
    try {
      if (cardId === null) {
        await AsyncStorage.removeItem(STORAGE_KEYS.ACTIVE_CARD_ID);
      } else {
        await AsyncStorage.setItem(STORAGE_KEYS.ACTIVE_CARD_ID, cardId);
      }
    } catch {
      // Storage write failed silently
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

  async getForMyNeeds(): Promise<boolean | null> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.FOR_MY_NEEDS);
      if (data == null) return null;
      return data === 'true';
    } catch {
      return null;
    }
  },

  async setForMyNeeds(value: boolean): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.FOR_MY_NEEDS, value ? 'true' : 'false');
    } catch {
      // Storage write failed silently
    }
  },

  // Dismissed popups
  async getDismissedPopups(): Promise<string[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.DISMISSED_POPUPS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  async dismissPopup(popupId: string): Promise<void> {
    try {
      const dismissed = await this.getDismissedPopups();
      if (!dismissed.includes(popupId)) {
        dismissed.push(popupId);
        await AsyncStorage.setItem(STORAGE_KEYS.DISMISSED_POPUPS, JSON.stringify(dismissed));
      }
    } catch {
      // Storage write failed silently
    }
  },

  async getRecentPlaces(): Promise<RecentPlace[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.RECENT_PLACES);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  async addRecentPlace(place: RecentPlace): Promise<RecentPlace[]> {
    try {
      const current = await this.getRecentPlaces();
      const k = recentPlaceKey(place);
      const filtered = current.filter(p => recentPlaceKey(p) !== k);
      const updated = [place, ...filtered].slice(0, MAX_RECENT_PLACES);
      await AsyncStorage.setItem(STORAGE_KEYS.RECENT_PLACES, JSON.stringify(updated));
      return updated;
    } catch {
      return [];
    }
  },

  async clearRecentPlaces(): Promise<void> {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.RECENT_PLACES);
    } catch {
      // Storage clear failed silently
    }
  },

  // Conteggi profilo (recensioni/preferiti) per cache-first: mostriamo subito
  // l'ultimo valore noto alla riapertura del profilo, evitando il flash 0→N
  // mentre le liste complete si ricaricano. Mappa per userId: più utenti sullo
  // stesso device non si sovrascrivono il conteggio a vicenda.
  async getProfileCounts(userId: string): Promise<ProfileCounts | null> {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEYS.PROFILE_COUNTS);
      if (!raw) return null;
      const map = JSON.parse(raw) as Record<string, ProfileCounts>;
      return map[userId] ?? null;
    } catch {
      return null;
    }
  },

  async setProfileCounts(userId: string, counts: ProfileCounts): Promise<void> {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEYS.PROFILE_COUNTS);
      const map = raw ? (JSON.parse(raw) as Record<string, ProfileCounts>) : {};
      map[userId] = counts;
      await AsyncStorage.setItem(STORAGE_KEYS.PROFILE_COUNTS, JSON.stringify(map));
    } catch {
      // Storage write failed silently
    }
  },

  // Cache-first delle pill liste (stesso scopo di ProfileCounts ma per le liste
  // custom): a freddo mostra subito le pill con l'ultimo conteggio noto.
  async getCachedCollections(userId: string): Promise<CollectionMeta[] | null> {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEYS.COLLECTIONS_META);
      if (!raw) return null;
      const map = JSON.parse(raw) as Record<string, CollectionMeta[]>;
      return map[userId] ?? null;
    } catch {
      return null;
    }
  },

  async setCachedCollections(userId: string, meta: CollectionMeta[]): Promise<void> {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEYS.COLLECTIONS_META);
      const map = raw ? (JSON.parse(raw) as Record<string, CollectionMeta[]>) : {};
      map[userId] = meta;
      await AsyncStorage.setItem(STORAGE_KEYS.COLLECTIONS_META, JSON.stringify(map));
    } catch {
      // Storage write failed silently
    }
  },

  // Pill selezionata nel profilo ('reviews' | 'favorites' | id lista custom):
  // ricorda l'ultima scelta per utente. La validita' (lista cancellata, pill
  // sparita) e' gestita lato schermata contro le pill effettivamente visibili.
  async getSelectedProfilePill(userId: string): Promise<string | null> {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEYS.PROFILE_SELECTED_PILL);
      if (!raw) return null;
      const map = JSON.parse(raw) as Record<string, string>;
      return map[userId] ?? null;
    } catch {
      return null;
    }
  },

  async setSelectedProfilePill(userId: string, selection: string): Promise<void> {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEYS.PROFILE_SELECTED_PILL);
      const map = raw ? (JSON.parse(raw) as Record<string, string>) : {};
      map[userId] = selection;
      await AsyncStorage.setItem(STORAGE_KEYS.PROFILE_SELECTED_PILL, JSON.stringify(map));
    } catch {
      // Storage write failed silently
    }
  },

  // Liste custom che l'utente ha scelto di NON mostrare sulla mappa principale
  // (preferenza di vista per ridurre il clutter). Locale e per-utente by design:
  // è una scelta del singolo che guarda, non una proprietà della lista — così
  // regge anche le future liste condivise (proprietario vs iscritto decidono
  // indipendentemente). Vedi memory project_list_map_visibility.
  async getMapHiddenCollections(userId: string): Promise<string[]> {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEYS.MAP_HIDDEN_COLLECTIONS);
      if (!raw) return [];
      const map = JSON.parse(raw) as Record<string, string[]>;
      return map[userId] ?? [];
    } catch {
      return [];
    }
  },

  async setMapCollectionHidden(userId: string, collectionId: string, hidden: boolean): Promise<void> {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEYS.MAP_HIDDEN_COLLECTIONS);
      const map = raw ? (JSON.parse(raw) as Record<string, string[]>) : {};
      const current = new Set(map[userId] ?? []);
      if (hidden) current.add(collectionId);
      else current.delete(collectionId);
      map[userId] = [...current];
      await AsyncStorage.setItem(STORAGE_KEYS.MAP_HIDDEN_COLLECTIONS, JSON.stringify(map));
    } catch {
      // Storage write failed silently
    }
  },
};
