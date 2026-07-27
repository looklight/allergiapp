// I 15 allergeni built-in dell'app (14 EU Reg. 1169/2011 + fave).
// I codici DEVONO combaciare con constants/allergens.ts dell'app
// e con allergens.code nel DB.
export interface AllergenInfo {
  code: string;
  it: string;
  en: string;
}

export const ALLERGENS: AllergenInfo[] = [
  { code: 'gluten', it: 'Glutine', en: 'Gluten' },
  { code: 'milk', it: 'Latte', en: 'Milk' },
  { code: 'eggs', it: 'Uova', en: 'Eggs' },
  { code: 'nuts', it: 'Frutta a guscio', en: 'Tree nuts' },
  { code: 'peanuts', it: 'Arachidi', en: 'Peanuts' },
  { code: 'crustaceans', it: 'Crostacei', en: 'Crustaceans' },
  { code: 'fish', it: 'Pesce', en: 'Fish' },
  { code: 'mollusks', it: 'Molluschi', en: 'Molluscs' },
  { code: 'soy', it: 'Soia', en: 'Soy' },
  { code: 'sesame', it: 'Sesamo', en: 'Sesame' },
  { code: 'mustard', it: 'Senape', en: 'Mustard' },
  { code: 'celery', it: 'Sedano', en: 'Celery' },
  { code: 'sulfites', it: 'Solfiti', en: 'Sulphites' },
  { code: 'lupin', it: 'Lupini', en: 'Lupin' },
  { code: 'fava_beans', it: 'Fave', en: 'Fava beans' },
];

export function allergenName(code: string, locale: 'it' | 'en'): string {
  const found = ALLERGENS.find((a) => a.code === code);
  return found ? found[locale] : code;
}
