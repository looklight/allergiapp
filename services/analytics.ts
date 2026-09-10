import { AllergenId, DownloadableLanguageCode, AppLanguage, AllLanguageCode, TrackingConsent } from '../types';
import { DietModeId } from '../constants/dietModes';
import { OtherFoodId } from '../constants/otherFoods';

// Modular Firebase Analytics API (dynamically required — may not be available in Expo Go)
type FirebaseAnalyticsInstance = object;
type LogEventFn = (analytics: FirebaseAnalyticsInstance, name: string, params?: Record<string, unknown>) => Promise<void>;
type SetCollectionFn = (analytics: FirebaseAnalyticsInstance, enabled: boolean) => Promise<void>;

// Initialized via dynamic require — only used after canSendAnalytics() guard
let firebaseAnalytics: FirebaseAnalyticsInstance = null!;
let logEvent: LogEventFn = null!;
let setAnalyticsCollectionEnabled: SetCollectionFn = null!;
let isFirebaseAvailable = false;

try {
  const analyticsModule = require('@react-native-firebase/analytics');
  const { getAnalytics } = analyticsModule;

  firebaseAnalytics = getAnalytics();
  logEvent = analyticsModule.logEvent;
  setAnalyticsCollectionEnabled = analyticsModule.setAnalyticsCollectionEnabled;
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
      // logScreenView è deprecato (namespaced e modular): si usa logEvent('screen_view')
      await logEvent(firebaseAnalytics, 'screen_view', {
        screen_name: screenName,
        screen_class: screenName,
      });
    } catch (error) {
      console.warn('[Analytics] Error logging screen_view:', error);
    }
  },

  /**
   * Eventi allergie e alimenti (solo conteggi: QUALI vive nei contatori
   * anonimi UE, mig 086)
   */
  async logAllergiesSaved(allergenIds: AllergenId[], previousCount: number, newCount: number) {
    if (!canSendAnalytics()) return;
    try {
      await logEvent(firebaseAnalytics, 'allergies_saved', {
        allergen_count: allergenIds.length,
        previous_count: previousCount,
        new_count: newCount,
      });
    } catch (error) {
      console.warn('[Analytics] Error logging allergies_saved:', error);
    }
  },

  async logOtherFoodsSaved(foodIds: OtherFoodId[], previousCount: number, newCount: number) {
    if (!canSendAnalytics()) return;
    try {
      await logEvent(firebaseAnalytics, 'other_foods_saved', {
        food_count: foodIds.length,
        previous_count: previousCount,
        new_count: newCount,
      });
    } catch (error) {
      console.warn('[Analytics] Error logging other_foods_saved:', error);
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
  // Niente elenco allergeni: quale allergene sta su una card e' dato sanitario
  // (art. 9) e non esce piu' verso Google. Il conteggio resta perche' da solo
  // non dice quale condizione. Il dettaglio vive nei contatori anonimi UE
  // (mig 086, SupabaseAnalytics.bumpCardOpen).
  async logCardViewed(
    cardLanguage: AllLanguageCode,
    allergenCount: number,
    isDownloadedLanguage: boolean
  ) {
    if (!canSendAnalytics()) return;
    try {
      await logEvent(firebaseAnalytics, 'card_viewed', {
        card_language: cardLanguage,
        allergen_count: allergenCount,
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
   * Eventi banner
   */
  async logBannerViewed(bannerId: string, title?: string) {
    if (!canSendAnalytics()) return;
    try {
      await logEvent(firebaseAnalytics, 'banner_viewed', {
        banner_id: bannerId,
        banner_title: title || '',
      });
    } catch (error) {
      console.warn('[Analytics] Error logging banner_viewed:', error);
    }
  },

  async logBannerClicked(bannerId: string, title?: string) {
    if (!canSendAnalytics()) return;
    try {
      await logEvent(firebaseAnalytics, 'banner_clicked', {
        banner_id: bannerId,
        banner_title: title || '',
      });
    } catch (error) {
      console.warn('[Analytics] Error logging banner_clicked:', error);
    }
  },

  /**
   * Eventi restrizioni e diete (solo conteggi, vedi sopra)
   */
  async logRestrictionsSaved(restrictionIds: string[], dietModes: DietModeId[]) {
    if (!canSendAnalytics()) return;
    try {
      await logEvent(firebaseAnalytics, 'restrictions_saved', {
        restriction_count: restrictionIds.length,
        diet_mode_count: dietModes.length,
      });
    } catch (error) {
      console.warn('[Analytics] Error logging restrictions_saved:', error);
    }
  },

};
