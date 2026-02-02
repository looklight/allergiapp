import { AllergenId, DownloadableLanguageCode, AppLanguage, AllLanguageCode, TrackingConsent } from '../types';

// Modular Firebase Analytics API
let firebaseAnalytics: any = null;
let logEvent: any = null;
let setAnalyticsCollectionEnabled: any = null;
let setUserProperty: any = null;
let isFirebaseAvailable = false;

try {
  // Import modular API functions
  const analyticsModule = require('@react-native-firebase/analytics');
  const { getAnalytics } = analyticsModule;

  firebaseAnalytics = getAnalytics();
  logEvent = analyticsModule.logEvent;
  setAnalyticsCollectionEnabled = analyticsModule.setAnalyticsCollectionEnabled;
  setUserProperty = analyticsModule.setUserProperty;
  isFirebaseAvailable = true;
  console.log('[Analytics] Firebase Analytics disponibile (modular API)');
} catch (error) {
  console.log('[Analytics] Firebase non disponibile (probabilmente Expo Go), usando mock');
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
    console.log(`[Analytics] Tracking consent set: ${consent.status}, authorized: ${isTrackingAuthorized}`);

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
   * Eventi allergie
   */
  async logAllergyAdded(allergyId: AllergenId) {
    if (!canSendAnalytics()) return;
    try {
      await logEvent(firebaseAnalytics, 'allergy_added', {
        allergen_id: allergyId,
        timestamp: new Date().toISOString(),
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
        timestamp: new Date().toISOString(),
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
        timestamp: new Date().toISOString(),
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
        timestamp: new Date().toISOString(),
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
        timestamp: new Date().toISOString(),
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
        timestamp: new Date().toISOString(),
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
        timestamp: new Date().toISOString(),
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
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.warn('[Analytics] Error logging card_viewed:', error);
    }
  },

  async logCardLanguageToggled(showInAppLanguage: boolean, cardLanguage: AllLanguageCode, appLanguage: AppLanguage) {
    if (!canSendAnalytics()) return;
    try {
      await logEvent(firebaseAnalytics, 'card_language_toggled', {
        show_in_app_language: showInAppLanguage,
        card_language: cardLanguage,
        app_language: appLanguage,
        timestamp: new Date().toISOString(),
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
      await logEvent(firebaseAnalytics, 'app_opened', {
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.warn('[Analytics] Error logging app_opened:', error);
    }
  },

  async logDataCleared() {
    if (!canSendAnalytics()) return;
    try {
      await logEvent(firebaseAnalytics, 'data_cleared', {
        timestamp: new Date().toISOString(),
      });
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
        timestamp: new Date().toISOString(),
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
        timestamp: new Date().toISOString(),
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
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.warn('[Analytics] Error logging ad_impression:', error);
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

  // Proprietà demografiche opzionali (da chiamare se l'utente le fornisce)
  async setDemographics(ageRange?: string, gender?: string, country?: string) {
    if (!canSendAnalytics()) return;
    try {
      if (ageRange) {
        await setUserProperty(firebaseAnalytics, 'age_range', ageRange);
      }
      if (gender) {
        await setUserProperty(firebaseAnalytics, 'gender', gender);
      }
      if (country) {
        await setUserProperty(firebaseAnalytics, 'country', country);
      }
    } catch (error) {
      console.warn('[Analytics] Error setting demographics:', error);
    }
  },
};
