// I tipi di cucina dei ristoranti dell'app, con i nomi che l'app mostra.
//
// ⚠️ COPIA di `CUISINE_CATEGORIES` in constants/restaurantCategories.ts
// dell'app, solo italiano e inglese (le lingue del portale). Se l'app ne
// aggiunge uno, va aggiunto anche qui — un codice che manca non rompe
// niente, semplicemente non si mostra. Servono nella ricerca del ristorante
// da associare, per distinguere due locali con lo stesso nome.
const CUISINES: Record<string, { it: string; en: string }> = {
  italian: { it: 'Italiana', en: 'Italian' },
  pizza: { it: 'Pizza', en: 'Pizza' },
  french: { it: 'Francese', en: 'French' },
  spanish: { it: 'Spagnola', en: 'Spanish' },
  mediterranean: { it: 'Mediterranea', en: 'Mediterranean' },
  meat_grill: { it: 'Carne e grigliate', en: 'Meat & Grill' },
  seafood: { it: 'Pesce e frutti di mare', en: 'Seafood' },
  hamburger: { it: 'Hamburger e panini', en: 'Burgers & Sandwiches' },
  sushi: { it: 'Sushi', en: 'Sushi' },
  japanese: { it: 'Giapponese', en: 'Japanese' },
  chinese: { it: 'Cinese', en: 'Chinese' },
  korean: { it: 'Coreana', en: 'Korean' },
  vietnamese: { it: 'Vietnamita', en: 'Vietnamese' },
  thai: { it: 'Thailandese', en: 'Thai' },
  indian: { it: 'Indiana', en: 'Indian' },
  middle_eastern: { it: 'Arabo e mediorientale', en: 'Middle Eastern & Arabic' },
  mexican: { it: 'Messicana', en: 'Mexican' },
  latin_american: { it: 'Latino americana', en: 'Latin American' },
  bakery: { it: 'Bakery', en: 'Bakery' },
  cafe: { it: 'Caffè e bar', en: 'Café & Bar' },
  ice_cream: { it: 'Gelateria', en: 'Ice Cream & Gelato' },
};

export function cuisineLabels(codes: string[], locale: 'it' | 'en'): string[] {
  return codes.flatMap((code) => (CUISINES[code] ? [CUISINES[code][locale]] : []));
}
