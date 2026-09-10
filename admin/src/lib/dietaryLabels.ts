// Label italiane per allergeni e diete — allineate ai constants/ dell'app.
// Tenute duplicate qui per non far dipendere admin/ dal codice mobile.

export const ALLERGEN_LABELS: Record<string, string> = {
  gluten: 'Glutine (cereali)',
  crustaceans: 'Crostacei',
  eggs: 'Uova',
  fish: 'Pesce',
  peanuts: 'Arachidi',
  soy: 'Soia',
  milk: 'Latte e latticini',
  nuts: 'Frutta a guscio',
  celery: 'Sedano',
  mustard: 'Senape',
  sesame: 'Semi di sesamo',
  sulfites: 'Anidride solforosa e solfiti',
  lupin: 'Lupini',
  mollusks: 'Molluschi',
  fava_beans: 'Fave (favismo)',
};

export const DIET_LABELS: Record<string, string> = {
  vegetarian: 'Vegetariano',
  vegan: 'Vegano',
  histamine: 'Istamina',
  nickel: 'Nichel',
  diabetes: 'Diabete',
  pregnancy: 'Gravidanza',
};

export const labelAllergen = (id: string): string => ALLERGEN_LABELS[id] ?? id;
export const labelDiet = (id: string): string => DIET_LABELS[id] ?? id;

// Etichetta per un codice esigenza qualsiasi: allergeni e diete note, altrimenti
// snake_case → "Snake Case". Il fallback mostra il codice invece di nasconderlo:
// gli alimenti extra sono 79 e le restrizioni 39, duplicarli tutti qui non vale
// la pena, ma una voce nuova nell'app deve comunque comparire subito nei conteggi
// (brutta e leggibile, non assente).
export function labelNeed(code: string): string {
  const known = labelAllergen(code);
  if (known !== code) return known;
  const diet = labelDiet(code);
  if (diet !== code) return diet;
  return code.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

// Nome della lingua dal codice ISO, senza mappa da mantenere: le lingue della
// card sono 86 e Intl le conosce tutte.
export function labelLanguage(code: string): string {
  try {
    const name = new Intl.DisplayNames(['it'], { type: 'language' }).of(code);
    if (name && name !== code) return name.charAt(0).toUpperCase() + name.slice(1);
  } catch {
    // Codice non valido o Intl senza quei dati: si mostra il codice.
  }
  return code;
}
