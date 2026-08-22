// Esigenze/diete che il ristoratore può dichiarare compatibili per piatto.
// STESSA lista di constants/diets.ts dell'app (esigenze profilo utente):
// il matching resta uniforme. Checkbox strutturate, MAI testo libero.
// NOTA legale: per histamine/nickel/diabetes il wording va vagliato
// dall'avvocato prima del lancio (voce già aperta in MONETIZATION.md).
export interface DietInfo {
  code: string;
  it: string; // tag dichiarato sul piatto (centrato sulle persone)
  en: string;
  needIt: string; // esigenza dal punto di vista dell'utente (breve)
  needEn: string;
}

// Due wording per lo stesso codice: il TAG sul piatto è centrato sulle
// persone come i peopleLabel dell'app ("adatto per…" — descrive il
// pubblico, non una proprietà chimica: "senza istamina" sarebbe una
// promessa non verificabile); l'ESIGENZA è il nome breve con cui
// l'utente si descrive (profilo/simulatore).
export const DIETS: DietInfo[] = [
  { code: 'vegetarian', it: 'Per vegetariani', en: 'For vegetarians', needIt: 'Vegetariano', needEn: 'Vegetarian' },
  { code: 'vegan', it: 'Per vegani', en: 'For vegans', needIt: 'Vegano', needEn: 'Vegan' },
  { code: 'histamine', it: 'Per intolleranti all’istamina', en: 'For histamine intolerance', needIt: 'Istamina', needEn: 'Histamine' },
  { code: 'nickel', it: 'Per intolleranti al nichel', en: 'For nickel intolerance', needIt: 'Nichel', needEn: 'Nickel' },
  { code: 'diabetes', it: 'Per diabetici', en: 'For diabetics', needIt: 'Diabete', needEn: 'Diabetes' },
];

export function dietName(code: string, locale: 'it' | 'en'): string {
  const found = DIETS.find((d) => d.code === code);
  return found ? found[locale] : code;
}

export function dietNeedName(code: string, locale: 'it' | 'en'): string {
  const found = DIETS.find((d) => d.code === code);
  if (!found) return code;
  return locale === 'it' ? found.needIt : found.needEn;
}
