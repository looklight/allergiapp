// Mantenere sincronizzato con allergiapp/constants/restaurantCategories.ts
// Solo id e label italiana — l'admin è monolingua

export interface AdminCategory {
  id: string;
  label: string;
}

export const DIETARY_CATEGORIES: AdminCategory[] = [
  { id: 'gluten_free', label: 'Gluten Free' },
  { id: 'vegan', label: 'Vegan' },
  { id: 'vegetarian', label: 'Vegetariano' },
];

export const CUISINE_CATEGORIES: AdminCategory[] = [
  { id: 'italian', label: 'Italiana' },
  { id: 'pizza', label: 'Pizza' },
  { id: 'french', label: 'Francese' },
  { id: 'spanish', label: 'Spagnola' },
  { id: 'mediterranean', label: 'Mediterranea' },
  { id: 'meat_grill', label: 'Carne e grigliate' },
  { id: 'seafood', label: 'Pesce e frutti di mare' },
  { id: 'hamburger', label: 'Hamburger e panini' },
  { id: 'sushi', label: 'Sushi' },
  { id: 'japanese', label: 'Giapponese' },
  { id: 'chinese', label: 'Cinese' },
  { id: 'korean', label: 'Coreana' },
  { id: 'vietnamese', label: 'Vietnamita' },
  { id: 'thai', label: 'Thailandese' },
  { id: 'indian', label: 'Indiana' },
  { id: 'middle_eastern', label: 'Arabo e mediorientale' },
  { id: 'mexican', label: 'Messicana' },
  { id: 'latin_american', label: 'Latino americana' },
  { id: 'bakery', label: 'Bakery' },
  { id: 'cafe', label: 'Caffè e bar' },
  { id: 'ice_cream', label: 'Gelateria' },
];

export const ALL_CATEGORIES: AdminCategory[] = [
  ...DIETARY_CATEGORIES,
  ...CUISINE_CATEGORIES,
];
