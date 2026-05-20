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
};

export const labelAllergen = (id: string): string => ALLERGEN_LABELS[id] ?? id;
export const labelDiet = (id: string): string => DIET_LABELS[id] ?? id;
