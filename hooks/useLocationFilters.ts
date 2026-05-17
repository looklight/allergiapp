import { useMemo, useState } from 'react';
import i18n from '../utils/i18n';
import { getCountryName } from '../utils/countryNames';

export interface LocationStats {
  items: number;
  cities: number;
  countries: number;
}

export interface CountryOption {
  /** Chiave canonica: country_code ISO2 quando disponibile, altrimenti il testo grezzo come fallback */
  key: string;
  /** Nome paese localizzato nella lingua utente */
  name: string;
  count: number;
}

export interface LocationParts {
  city?: string | null;
  country?: string | null;
  countryCode?: string | null;
}

// Chiave canonica del raggruppamento: code ISO2 se disponibile, altrimenti
// il testo prefissato per evitare collisioni con codici reali (oggi 0 record).
function locationKey(loc: LocationParts): string | null {
  const code = loc.countryCode?.toUpperCase().trim();
  if (code) return code;
  const text = loc.country?.trim();
  return text ? `__txt:${text}` : null;
}

/**
 * Aggrega stats geografici e gestisce il filtro per paese.
 * Raggruppa per country_code (source of truth); il testo `country` è usato
 * solo come fallback per record senza code.
 */
export function useLocationFilters<T>(items: T[], getLocation: (item: T) => LocationParts) {
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const locale = i18n.locale;

  const stats = useMemo<LocationStats>(() => {
    const cities = new Set<string>();
    const countries = new Set<string>();
    for (const it of items) {
      const loc = getLocation(it);
      if (loc.city) cities.add(loc.city);
      const k = locationKey(loc);
      if (k) countries.add(k);
    }
    return { items: items.length, cities: cities.size, countries: countries.size };
  }, [items, getLocation]);

  const countryOptions = useMemo<CountryOption[]>(() => {
    const counts = new Map<string, { count: number; sampleText: string | null }>();
    for (const it of items) {
      const loc = getLocation(it);
      const k = locationKey(loc);
      if (!k) continue;
      const existing = counts.get(k);
      if (existing) existing.count += 1;
      else counts.set(k, { count: 1, sampleText: loc.country ?? null });
    }
    return Array.from(counts.entries())
      .map(([key, { count, sampleText }]) => ({
        key,
        name: key.startsWith('__txt:')
          ? key.slice(6)
          : getCountryName(key, locale, sampleText),
        count,
      }))
      .sort((a, b) => b.count - a.count);
  }, [items, getLocation, locale]);

  const filteredItems = useMemo(
    () => (selectedCountry ? items.filter((it) => locationKey(getLocation(it)) === selectedCountry) : items),
    [items, selectedCountry, getLocation],
  );

  return { stats, countryOptions, selectedCountry, setSelectedCountry, filteredItems };
}
