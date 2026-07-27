// Categorie piatti: set fisso tradotto (niente testo libero).
// I codici devono combaciare col CHECK di partner_dishes.category (700).
export interface DishCategory {
  code: string;
  it: string;
  en: string;
}

export const DISH_CATEGORIES: DishCategory[] = [
  { code: 'starters', it: 'Antipasti', en: 'Starters' },
  { code: 'first_courses', it: 'Primi', en: 'First courses' },
  { code: 'second_courses', it: 'Secondi', en: 'Main courses' },
  { code: 'sides', it: 'Contorni', en: 'Sides' },
  { code: 'pizza', it: 'Pizza', en: 'Pizza' },
  { code: 'desserts', it: 'Dolci', en: 'Desserts' },
  { code: 'drinks', it: 'Bevande', en: 'Drinks' },
  { code: 'other', it: 'Altro', en: 'Other' },
];

export function categoryName(code: string, locale: 'it' | 'en'): string {
  const found = DISH_CATEGORIES.find((c) => c.code === code);
  return found ? found[locale] : code;
}
