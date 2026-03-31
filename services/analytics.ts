import { AllergenId, DownloadableLanguageCode, AppLanguage, AllLanguageCode, TrackingConsent } from '../types';

// Analytics — attualmente no-op.
// L'interfaccia pubblica resta invariata: quando si sceglierà un backend
// (Supabase, PostHog, Firebase, ecc.) basterà implementare trackEvent().

let isTrackingAuthorized = false;

export const Analytics = {
  setTrackingConsent(consent: TrackingConsent) {
    isTrackingAuthorized = consent.status === 'authorized';
  },

  isTrackingAuthorized(): boolean {
    return isTrackingAuthorized;
  },

  async logScreenView(_screenName: string) {},
  async logAllergyAdded(_allergyId: AllergenId) {},
  async logAllergyRemoved(_allergyId: AllergenId) {},
  async logAllergiesSaved(_allergenIds: AllergenId[], _previousCount: number, _newCount: number) {},
  async logLanguageDownloaded(_languageCode: DownloadableLanguageCode, _success: boolean, _duration?: number) {},
  async logLanguageDeleted(_languageCode: DownloadableLanguageCode) {},
  async logAppLanguageChanged(_fromLanguage: AppLanguage, _toLanguage: AppLanguage) {},
  async logCardLanguageChanged(_fromLanguage: AllLanguageCode, _toLanguage: AllLanguageCode) {},
  async logCardViewed(_cardLanguage: AllLanguageCode, _allergenCount: number, _allergenIds: AllergenId[], _isDownloadedLanguage: boolean) {},
  async logCardLanguageToggled(_showInAppLanguage: boolean, _cardLanguage: AllLanguageCode, _appLanguage: AppLanguage) {},
  async logAppOpened() {},
  async logDataCleared() {},
  async logBannerViewed(_bannerId: string, _bannerType: 'info' | 'ad' | 'custom', _title?: string) {},
  async logBannerClicked(_bannerId: string, _bannerType: 'info' | 'ad' | 'custom', _title?: string, _adUrl?: string) {},
  async logAdImpression(_adId: string, _adUrl?: string, _adTitle?: string) {},
  async setUserPropertyValue(_property: string, _value: string) {},
};
