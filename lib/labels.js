// Etichette IT + EN per allergeni, diete, intolleranze, sensibilità alimentari, cuisine_id.
// Subset di quanto vive in allergiapp/constants/{allergens,diets,otherFoods,restaurantCategories}.ts
// Per codici non coperti, il renderer mostra il codice capitalizzato come fallback.
//
// Quando si aggiungono codici nuovi nell'app, ricordare di aggiungerli anche qui
// (oppure migrare a una fonte unica via Supabase translations table in M2).

const ALLERGEN_LABELS = {
  gluten:       { it: 'Glutine',            en: 'Gluten' },
  milk:         { it: 'Latte e latticini',  en: 'Milk and dairy' },
  eggs:         { it: 'Uova',               en: 'Eggs' },
  nuts:         { it: 'Frutta a guscio',    en: 'Tree nuts' },
  peanuts:      { it: 'Arachidi',           en: 'Peanuts' },
  crustaceans:  { it: 'Crostacei',          en: 'Crustaceans' },
  fish:         { it: 'Pesce',              en: 'Fish' },
  mollusks:     { it: 'Molluschi',          en: 'Mollusks' },
  soy:          { it: 'Soia',               en: 'Soy' },
  sesame:       { it: 'Sesamo',             en: 'Sesame' },
  mustard:      { it: 'Senape',             en: 'Mustard' },
  celery:       { it: 'Sedano',             en: 'Celery' },
  sulfites:     { it: 'Solfiti',            en: 'Sulfites' },
  lupin:        { it: 'Lupini',             en: 'Lupin' },
  fava_beans:   { it: 'Fave (favismo)',     en: 'Fava beans (favism)' },
};

const DIET_LABELS = {
  vegetarian:   { it: 'Vegetariano',        en: 'Vegetarian' },
  vegan:        { it: 'Vegano',             en: 'Vegan' },
  diabetes:     { it: 'Diabete',            en: 'Diabetes' },
  histamine:    { it: 'Istamina',           en: 'Histamine' },
  nickel:       { it: 'Nichel',             en: 'Nickel' },
  gluten_free:  { it: 'Senza glutine',      en: 'Gluten-free' },
};

const OTHER_FOOD_LABELS = {
  tomato:       { it: 'Pomodoro',           en: 'Tomato' },
  onion:        { it: 'Cipolla',            en: 'Onion' },
  garlic:       { it: 'Aglio',              en: 'Garlic' },
  bell_pepper:  { it: 'Peperoni',           en: 'Bell peppers' },
  eggplant:     { it: 'Melanzane',          en: 'Eggplant' },
  carrot:       { it: 'Carote',             en: 'Carrots' },
  mushrooms:    { it: 'Funghi',             en: 'Mushrooms' },
  pumpkin:      { it: 'Zucca',              en: 'Pumpkin' },
  zucchini:     { it: 'Zucchine',           en: 'Zucchini' },
  fennel:       { it: 'Finocchio',          en: 'Fennel' },
  celeriac:     { it: 'Sedano rapa',        en: 'Celeriac' },
  spinach:      { it: 'Spinaci',            en: 'Spinach' },
  potato:       { it: 'Patate',             en: 'Potatoes' },
  peach:        { it: 'Pesca',              en: 'Peach' },
  kiwi:         { it: 'Kiwi',               en: 'Kiwi' },
  strawberries: { it: 'Fragole',            en: 'Strawberries' },
  apple:        { it: 'Mela',               en: 'Apple' },
  banana:       { it: 'Banana',             en: 'Banana' },
  cherry:       { it: 'Ciliegia',           en: 'Cherry' },
  apricot:      { it: 'Albicocca',          en: 'Apricot' },
  corn:         { it: 'Mais',               en: 'Corn' },
};

const CUISINE_LABELS = {
  gluten_free:    { it: 'Senza glutine',    en: 'Gluten-free' },
  vegan:          { it: 'Vegano',           en: 'Vegan' },
  vegetarian:     { it: 'Vegetariano',      en: 'Vegetarian' },
  italian:        { it: 'Italiana',         en: 'Italian' },
  pizza:          { it: 'Pizza',            en: 'Pizza' },
  french:         { it: 'Francese',         en: 'French' },
  spanish:        { it: 'Spagnola',         en: 'Spanish' },
  mediterranean:  { it: 'Mediterranea',     en: 'Mediterranean' },
  meat_grill:     { it: 'Carne / Grill',    en: 'Meat / Grill' },
  seafood:        { it: 'Pesce',            en: 'Seafood' },
  hamburger:      { it: 'Hamburger',        en: 'Burgers' },
  sushi:          { it: 'Sushi',            en: 'Sushi' },
  japanese:       { it: 'Giapponese',       en: 'Japanese' },
  chinese:        { it: 'Cinese',           en: 'Chinese' },
  korean:         { it: 'Coreana',          en: 'Korean' },
  vietnamese:     { it: 'Vietnamita',       en: 'Vietnamese' },
  thai:           { it: 'Thailandese',      en: 'Thai' },
  indian:         { it: 'Indiana',          en: 'Indian' },
  middle_eastern: { it: 'Mediorientale',    en: 'Middle Eastern' },
  mexican:        { it: 'Messicana',        en: 'Mexican' },
  latin_american: { it: 'Latinoamericana',  en: 'Latin American' },
  bakery:         { it: 'Forno / Pasticceria', en: 'Bakery' },
  cafe:           { it: 'Caffè',            en: 'Café' },
  ice_cream:      { it: 'Gelateria',        en: 'Ice cream' },
};

// Lookup unico: cerca tra tutti i dictionari, ritorna la label tradotta o un fallback.
function labelFor(code, locale) {
  if (!code) return '';
  const dicts = [ALLERGEN_LABELS, DIET_LABELS, OTHER_FOOD_LABELS, CUISINE_LABELS];
  for (const d of dicts) {
    if (d[code] && d[code][locale]) return d[code][locale];
    if (d[code] && d[code].en) return d[code].en;
  }
  // Fallback: capitalize + replace underscores
  return code.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

function cuisineLabel(id, locale) {
  if (CUISINE_LABELS[id] && CUISINE_LABELS[id][locale]) return CUISINE_LABELS[id][locale];
  if (CUISINE_LABELS[id] && CUISINE_LABELS[id].en) return CUISINE_LABELS[id].en;
  return id.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

module.exports = {
  ALLERGEN_LABELS,
  DIET_LABELS,
  OTHER_FOOD_LABELS,
  CUISINE_LABELS,
  labelFor,
  cuisineLabel,
};
