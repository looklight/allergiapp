import { I18n } from 'i18n-js';
import it from '../locales/it.json';
import en from '../locales/en.json';
import { AppLanguage } from '../types';

const i18n = new I18n({
  it,
  en,
});

// Default to Italian
i18n.locale = 'it';
i18n.enableFallback = true;
i18n.defaultLocale = 'it';

export const setAppLanguage = (language: AppLanguage) => {
  i18n.locale = language;
};

export const getAppLanguage = (): AppLanguage => {
  return i18n.locale as AppLanguage;
};

export default i18n;
