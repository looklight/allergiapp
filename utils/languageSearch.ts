import { AppLanguage } from '../types';
import { getLocalizedLanguageName } from '../constants/languageNames';
import { LANGUAGE_COUNTRIES } from '../constants/languageCountries';

/**
 * Verifica se una lingua corrisponde a una query di ricerca.
 * Cerca per: nome nativo, nome inglese, nome localizzato, codice lingua (opzionale), paese (opzionale).
 */
export function languageMatchesQuery(
  code: string,
  query: string,
  names: { nativeName: string; englishName: string; localizedName?: string },
  appLanguage: AppLanguage,
  options: { searchCode?: boolean } = {}
): boolean {
  const q = query.toLowerCase();

  if (names.nativeName.toLowerCase().includes(q)) return true;
  if (names.englishName.toLowerCase().includes(q)) return true;

  const localizedName = names.localizedName ?? getLocalizedLanguageName(code, appLanguage);
  if (localizedName && localizedName.toLowerCase().includes(q)) return true;

  if (options.searchCode && code.toLowerCase().includes(q)) return true;

  const countries = LANGUAGE_COUNTRIES[code];
  if (countries?.some(c => c.toLowerCase().includes(q))) return true;

  return false;
}
