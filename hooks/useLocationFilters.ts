import { useMemo, useState } from 'react';

export interface LocationStats {
  items: number;
  cities: number;
  countries: number;
}

export interface CountryOption {
  name: string;
  count: number;
}

export interface LocationParts {
  city?: string | null;
  country?: string | null;
}

/**
 * Aggrega stats geografici (totale, città uniche, paesi unici) e gestisce il
 * filtro per paese. Generico sulla forma dell'item: il consumer fornisce un
 * selettore `getLocation` che mappa l'item a { city, country }.
 */
export function useLocationFilters<T>(items: T[], getLocation: (item: T) => LocationParts) {
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);

  const stats = useMemo<LocationStats>(() => {
    const cities = new Set<string>();
    const countries = new Set<string>();
    for (const it of items) {
      const loc = getLocation(it);
      if (loc.city) cities.add(loc.city);
      if (loc.country) countries.add(loc.country);
    }
    return { items: items.length, cities: cities.size, countries: countries.size };
  }, [items, getLocation]);

  const countryOptions = useMemo<CountryOption[]>(() => {
    const counts = new Map<string, number>();
    for (const it of items) {
      const country = getLocation(it).country;
      if (!country) continue;
      counts.set(country, (counts.get(country) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ name, count }));
  }, [items, getLocation]);

  const filteredItems = useMemo(
    () => (selectedCountry ? items.filter((it) => getLocation(it).country === selectedCountry) : items),
    [items, selectedCountry, getLocation],
  );

  return { stats, countryOptions, selectedCountry, setSelectedCountry, filteredItems };
}
