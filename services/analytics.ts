import { AllergenId, DownloadableLanguageCode, AppLanguage, AllLanguageCode, TrackingConsent } from '../types';
import { DietModeId } from '../constants/dietModes';

// Modular Firebase Analytics API (dynamically required — may not be available in Expo Go)
type FirebaseAnalyticsInstance = object;
type LogEventFn = (analytics: FirebaseAnalyticsInstance, name: string, params?: Record<string, unknown>) => Promise<void>;
type SetCollectionFn = (analytics: FirebaseAnalyticsInstance, enabled: boolean) => Promise<void>;
type SetPropertyFn = (analytics: FirebaseAnalyticsInstance, name: string, value: string) => Promise<void>;
type LogScreenViewFn = (analytics: FirebaseAnalyticsInstance, params: { screen_name: string; screen_class: string }) => Promise<void>;

// Initialized via dynamic require — only used after canSendAnalytics() guard
let firebaseAnalytics: FirebaseAnalyticsInstance = null!;
let logEvent: LogEventFn = null!;
let setAnalyticsCollectionEnabled: SetCollectionFn = null!;
let setUserProperty: SetPropertyFn = null!;
let firebaseLogScreenView: LogScreenViewFn = null!;
let isFirebaseAvailable = false;

try {
  const analyticsModule = require('@react-native-firebase/analytics');
  const { getAnalytics } = analyticsModule;

  firebaseAnalytics = getAnalytics();
  logEvent = analyticsModule.logEvent;
  setAnalyticsCollectionEnabled = analyticsModule.setAnalyticsCollectionEnabled;
  setUserProperty = analyticsModule.setUserProperty;
  firebaseLogScreenView = analyticsModule.logScreenView;
  isFirebaseAvailable = true;
  if (__DEV__) console.log('[Analytics] Firebase Analytics disponibile (modular API)');
} catch (error) {
  if (__DEV__) console.log('[Analytics] Firebase non disponibile (probabilmente Expo Go), usando mock');
  isFirebaseAvailable = false;
}

// Tracking consent state
let isTrackingAuthorized = false;

/**
 * Check if analytics can be sent based on:
 * 1. Firebase availability
 * 2. User tracking consent (ATT on iOS)
 */
function canSendAnalytics(): boolean {
  return isFirebaseAvailable && isTrackingAuthorized;
}

// Wrapper per tracciare eventi analytics in modo type-safe
// Se Firebase non è disponibile (Expo Go) o tracking non autorizzato, i metodi non fanno nulla

export const Analytics = {
  /**
   * Tracking consent management
   */
  setTrackingConsent(consent: TrackingConsent) {
    isTrackingAuthorized = consent.status === 'authorized';
    if (__DEV__) console.log(`[Analytics] Tracking consent set: ${consent.status}, authorized: ${isTrackingAuthorized}`);

    // If tracking is authorized, enable Firebase Analytics collection
    if (isFirebaseAvailable && firebaseAnalytics && setAnalyticsCollectionEnabled) {
      try {
        setAnalyticsCollectionEnabled(firebaseAnalytics, isTrackingAuthorized);
      } catch (error) {
        console.warn('[Analytics] Error setting collection enabled:', error);
      }
    }
  },

  isTrackingAuthorized(): boolean {
    return isTrackingAuthorized;
  },

  /**
   * Screen views
   */
  async logScreenView(screenName: string) {
    if (!canSendAnalytics()) return;
    try {
      await firebaseLogScreenView(firebaseAnalytics, { screen_name: screenName, screen_class: screenName });
    } catch (error) {
      console.warn('[Analytics] Error logging screen_view:', error);
    }
  },

  /**
   * Eventi allergie
   */
  async logAllergyAdded(allergyId: AllergenId) {
    if (!canSendAnalytics()) return;
    try {
      await logEvent(firebaseAnalytics, 'allergy_added', {
        allergen_id: allergyId,
      });
    } catch (error) {
      console.warn('[Analytics] Error logging allergy_added:', error);
    }
  },

  async logAllergyRemoved(allergyId: AllergenId) {
    if (!canSendAnalytics()) return;
    try {
      await logEvent(firebaseAnalytics, 'allergy_removed', {
        allergen_id: allergyId,
      });
    } catch (error) {
      console.warn('[Analytics] Error logging allergy_removed:', error);
    }
  },

  async logAllergiesSaved(allergenIds: AllergenId[], previousCount: number, newCount: number) {
    if (!canSendAnalytics()) return;
    try {
      await logEvent(firebaseAnalytics, 'allergies_saved', {
        allergen_count: allergenIds.length,
        previous_count: previousCount,
        new_count: newCount,
        allergens: allergenIds.join(','),
      });
    } catch (error) {
      console.warn('[Analytics] Error logging allergies_saved:', error);
    }
  },

  /**
   * Eventi lingue
   */
  async logLanguageDownloaded(languageCode: DownloadableLanguageCode, success: boolean, duration?: number) {
    if (!canSendAnalytics()) return;
    try {
      await logEvent(firebaseAnalytics, 'language_downloaded', {
        language_code: languageCode,
        success: success,
        duration_ms: duration,
      });
    } catch (error) {
      console.warn('[Analytics] Error logging language_downloaded:', error);
    }
  },

  async logLanguageDeleted(languageCode: DownloadableLanguageCode) {
    if (!canSendAnalytics()) return;
    try {
      await logEvent(firebaseAnalytics, 'language_deleted', {
        language_code: languageCode,
      });
    } catch (error) {
      console.warn('[Analytics] Error logging language_deleted:', error);
    }
  },

  async logAppLanguageChanged(fromLanguage: AppLanguage, toLanguage: AppLanguage) {
    if (!canSendAnalytics()) return;
    try {
      await logEvent(firebaseAnalytics, 'app_language_changed', {
        from_language: fromLanguage,
        to_language: toLanguage,
      });
    } catch (error) {
      console.warn('[Analytics] Error logging app_language_changed:', error);
    }
  },

  async logCardLanguageChanged(fromLanguage: AllLanguageCode, toLanguage: AllLanguageCode) {
    if (!canSendAnalytics()) return;
    try {
      await logEvent(firebaseAnalytics, 'card_language_changed', {
        from_language: fromLanguage,
        to_language: toLanguage,
      });
    } catch (error) {
      console.warn('[Analytics] Error logging card_language_changed:', error);
    }
  },

  /**
   * Eventi card
   */
  async logCardViewed(
    cardLanguage: AllLanguageCode,
    allergenCount: number,
    allergenIds: AllergenId[],
    isDownloadedLanguage: boolean
  ) {
    if (!canSendAnalytics()) return;
    try {
      await logEvent(firebaseAnalytics, 'card_viewed', {
        card_language: cardLanguage,
        allergen_count: allergenCount,
        allergens: allergenIds.join(','),
        is_downloaded_language: isDownloadedLanguage,
      });
    } catch (error) {
      console.warn('[Analytics] Error logging card_viewed:', error);
    }
  },

  async logCardLanguageToggled(displayMode: 'card' | 'app' | 'english', cardLanguage: AllLanguageCode, appLanguage: AppLanguage) {
    if (!canSendAnalytics()) return;
    try {
      await logEvent(firebaseAnalytics, 'card_language_toggled', {
        display_mode: displayMode,
        card_language: cardLanguage,
        app_language: appLanguage,
      });
    } catch (error) {
      console.warn('[Analytics] Error logging card_language_toggled:', error);
    }
  },

  /**
   * Eventi app lifecycle
   */
  async logAppOpened() {
    if (!canSendAnalytics()) return;
    try {
      await logEvent(firebaseAnalytics, 'app_opened', {});
    } catch (error) {
      console.warn('[Analytics] Error logging app_opened:', error);
    }
  },

  async logDataCleared() {
    if (!canSendAnalytics()) return;
    try {
      await logEvent(firebaseAnalytics, 'data_cleared', {});
    } catch (error) {
      console.warn('[Analytics] Error logging data_cleared:', error);
    }
  },

  /**
   * Eventi banner/ads
   */
  async logBannerViewed(bannerId: string, bannerType: 'info' | 'ad' | 'custom', title?: string) {
    if (!canSendAnalytics()) return;
    try {
      await logEvent(firebaseAnalytics, 'banner_viewed', {
        banner_id: bannerId,
        banner_type: bannerType,
        banner_title: title || '',
      });
    } catch (error) {
      console.warn('[Analytics] Error logging banner_viewed:', error);
    }
  },

  async logBannerClicked(
    bannerId: string,
    bannerType: 'info' | 'ad' | 'custom',
    title?: string,
    adUrl?: string
  ) {
    if (!canSendAnalytics()) return;
    try {
      await logEvent(firebaseAnalytics, 'banner_clicked', {
        banner_id: bannerId,
        banner_type: bannerType,
        banner_title: title || '',
        ad_url: adUrl || '',
      });
    } catch (error) {
      console.warn('[Analytics] Error logging banner_clicked:', error);
    }
  },

  async logAdImpression(adId: string, adUrl?: string, adTitle?: string) {
    if (!canSendAnalytics()) return;
    try {
      await logEvent(firebaseAnalytics, 'ad_impression', {
        ad_id: adId,
        ad_url: adUrl || '',
        ad_title: adTitle || '',
      });
    } catch (error) {
      console.warn('[Analytics] Error logging ad_impression:', error);
    }
  },

  /**
   * Diet mode events
   */
  async logDietModeToggled(modeId: DietModeId, enabled: boolean) {
    if (!canSendAnalytics()) return;
    try {
      await logEvent(firebaseAnalytics, 'diet_mode_toggled', {
        mode_id: modeId,
        enabled: enabled,
      });
    } catch (error) {
      console.warn('[Analytics] Error logging diet_mode_toggled:', error);
    }
  },

  /**
   * User properties (informazioni demografiche aggregate)
   */
  async setUserPropertyValue(property: string, value: string) {
    if (!canSendAnalytics()) return;
    try {
      await setUserProperty(firebaseAnalytics, property, value);
    } catch (error) {
      console.warn('[Analytics] Error setting user property:', error);
    }
  },

  async updateUserProperties(props: {
    allergenCount: number;
    dietModes: DietModeId[];
    cardLanguage: AllLanguageCode;
  }) {
    if (!canSendAnalytics()) return;
    try {
      // User property values limited to 36 chars by Firebase
      await setUserProperty(firebaseAnalytics, 'allergen_count', String(props.allergenCount));
      // Abbreviate diet mode IDs to fit 36-char limit (preg,veg,nick,hist,diab)
      const modeAbbrev: Record<string, string> = { pregnancy: 'preg', vegetarian: 'veg', nickel: 'nick', histamine: 'hist', diabetes: 'diab' };
      const modes = props.dietModes.map(m => modeAbbrev[m] || m).join(',');
      await setUserProperty(firebaseAnalytics, 'diet_modes', modes || 'none');
      await setUserProperty(firebaseAnalytics, 'card_language', props.cardLanguage);
    } catch (error) {
      console.warn('[Analytics] Error updating user properties:', error);
    }
  },
};
