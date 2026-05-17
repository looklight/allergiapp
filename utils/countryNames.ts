import { COUNTRY_NAMES } from '../constants/countryNames';
import type { AppLanguage } from '../types';

// Risolve il nome paese a partire dal country_code ISO 3166-1 alpha-2 nella
// lingua UI dell'utente. La source of truth è il code; il `fallbackText`
// (campo `country` legacy nel DB) è usato solo se il code manca/non valido.
// Hermes non implementa Intl.DisplayNames, quindi usiamo COUNTRY_NAMES.

function normalizeLocale(locale: string): AppLanguage {
  const base = locale.toLowerCase().split('-')[0];
  return base in COUNTRY_NAMES ? (base as AppLanguage) : 'en';
}

export function getCountryName(
  code: string | null | undefined,
  locale: string,
  fallbackText?: string | null,
): string {
  const upper = code?.toUpperCase().trim();
  if (upper && /^[A-Z]{2}$/.test(upper)) {
    const lang = normalizeLocale(locale);
    return COUNTRY_NAMES[lang][upper]
      ?? COUNTRY_NAMES.en[upper]
      ?? fallbackText?.trim()
      ?? upper;
  }
  return fallbackText?.trim() || upper || '';
}
