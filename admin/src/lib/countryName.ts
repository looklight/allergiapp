// Risolve il nome paese (in italiano) dal country_code ISO 3166-1 alpha-2,
// che è la sorgente di verità. Il campo testuale `country` del DB è legacy e
// in lingua mista — Google Places lo localizza secondo il device di chi ha
// aggiunto il ristorante ("Italia"/"Italy") — quindi va usato solo come
// fallback quando il code manca. Speculare a utils/countryNames.ts dell'app,
// ma qui nel browser Intl.DisplayNames è disponibile (Hermes no).
const regionNames = new Intl.DisplayNames(['it'], { type: 'region' });

export function getCountryName(
  code: string | null | undefined,
  fallbackText?: string | null,
): string {
  const upper = code?.toUpperCase().trim();
  if (upper && /^[A-Z]{2}$/.test(upper)) {
    try {
      const name = regionNames.of(upper);
      if (name && name !== upper) return name;
    } catch {
      // codice malformato: prosegue sul fallback
    }
  }
  return fallbackText?.trim() || upper || '';
}
