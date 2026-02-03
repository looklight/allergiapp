import { I18n } from 'i18n-js';
import { getLocales } from 'expo-localization';
import it from '../locales/it.json';
import en from '../locales/en.json';
import es from '../locales/es.json';
import de from '../locales/de.json';
import fr from '../locales/fr.json';
import { AppLanguage } from '../types';

const SUPPORTED_LANGUAGES: AppLanguage[] = ['it', 'en', 'es', 'de', 'fr'];

export function getDeviceLanguage(): AppLanguage {
  try {
    const locales = getLocales();
    if (locales && locales.length > 0) {
      const deviceLang = locales[0].languageCode;
      if (deviceLang && SUPPORTED_LANGUAGES.includes(deviceLang as AppLanguage)) {
        return deviceLang as AppLanguage;
      }
    }
  } catch {
    // Fallback silenzioso
  }
  return 'en'; // Fallback inglese (più universale)
}

const i18n = new I18n({
  it,
  en,
  es,
  de,
  fr,
});

i18n.locale = getDeviceLanguage();
i18n.enableFallback = true;
i18n.defaultLocale = 'en';

export const setAppLanguage = (language: AppLanguage) => {
  i18n.locale = language;
};

export const getAppLanguage = (): AppLanguage => {
  return i18n.locale as AppLanguage;
};

export default i18n;
