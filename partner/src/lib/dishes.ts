'use client';

// Il catalogo piatti del partner: sta SOPRA le vetrine, perché lo stesso
// ristoratore con due locali riusa gli stessi piatti. La vetrina ne tiene
// solo gli id accesi, quindi da qui si scrive anche là — mai il contrario.
// Dal 30/08 vive in partner_dishes invece che nel localStorage.
import { supabase } from './supabase';
import { currentUserId, reportError, useRemoteList } from './storage';
import type { Showcase, ShowcaseDraft } from './showcases';

export interface DishTranslation {
  language: string; // codice da MENU_LANGUAGES
  name: string;
  description: string;
}

export interface Dish {
  id: string;
  name: string; // l'originale: c'è sempre ed è il ripiego di ogni traduzione
  description: string;
  category: string; // codici da DISH_CATEGORIES; '' = nessuna categoria
  photoUrl: string;
  allergens: string[]; // codici da allergens.code (presenti nel piatto)
  dietTags: string[]; // codici da DIETS (compatibilità dichiarate)
  translations: DishTranslation[];
}

/* eslint-disable @typescript-eslint/no-explicit-any */

// Il database usa NULL per "senza categoria" e per i campi non compilati;
// l'interfaccia lavora con stringhe vuote. La conversione sta qui, in un
// punto solo, e non sparsa nei componenti.
function toDish(row: any): Dish {
  return {
    id: row.id,
    name: row.name ?? '',
    description: row.description ?? '',
    category: row.category ?? '',
    photoUrl: row.photo_url ?? '',
    allergens: row.declared_allergens ?? [],
    dietTags: row.diet_tags ?? [],
    translations: (row.partner_dish_translations ?? []).map((t: any) => ({
      language: t.language,
      name: t.name ?? '',
      description: t.description ?? '',
    })),
  };
}

/* eslint-enable @typescript-eslint/no-explicit-any */

function fromDish(data: Omit<Dish, 'id'>) {
  return {
    name: data.name,
    description: data.description.trim() || null,
    category: data.category || null,
    photo_url: data.photoUrl || null,
    declared_allergens: data.allergens,
    diet_tags: data.dietTags,
  };
}

async function loadDishes(): Promise<Dish[]> {
  const { data, error } = await supabase
    .from('partner_dishes')
    .select('*, partner_dish_translations(language, name, description)')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });
  reportError('lettura piatti', error);
  return (data ?? []).map(toDish);
}

// Le traduzioni si riscrivono tutte: sono poche e i campi vuoti non vanno
// salvati, quindi calcolare la differenza costerebbe più di quanto risparmi.
async function saveTranslations(dishId: string, translations: DishTranslation[]) {
  const { error: cancella } = await supabase
    .from('partner_dish_translations')
    .delete()
    .eq('dish_id', dishId);
  reportError('cancellazione traduzioni', cancella);
  const righe = translations
    .filter((t) => t.language !== '' && (t.name.trim() !== '' || t.description.trim() !== ''))
    .map((t) => ({
      dish_id: dishId,
      language: t.language,
      name: t.name.trim() || null,
      description: t.description.trim() || null,
    }));
  if (righe.length > 0) {
    const { error } = await supabase.from('partner_dish_translations').insert(righe);
    reportError('scrittura traduzioni', error);
  }
}

// dishes è null finché la prima lettura non è tornata
export function useDishes() {
  const { list: dishes, setList, reload } = useRemoteList(loadDishes);

  async function create(data: Omit<Dish, 'id'>): Promise<Dish | null> {
    const ownerId = await currentUserId();
    if (!ownerId) return null;
    const { data: row, error } = await supabase
      .from('partner_dishes')
      .insert({ owner_user_id: ownerId, ...fromDish(data) })
      .select('id')
      .single();
    reportError('creazione piatto', error);
    if (!row) return null;
    await saveTranslations(row.id, data.translations);
    const creato: Dish = { ...data, id: row.id };
    setList([...(dishes ?? []), creato]);
    return creato;
  }

  async function update(id: string, data: Omit<Dish, 'id'>) {
    setList((dishes ?? []).map((dish) => (dish.id === id ? { ...data, id } : dish)));
    const { error } = await supabase.from('partner_dishes').update(fromDish(data)).eq('id', id);
    reportError('modifica piatto', error);
    await saveTranslations(id, data.translations);
  }

  // Il piatto eliminato sparisce anche dalle vetrine in cui era acceso: se ne
  // occupa il database con la cascata sull'accostamento.
  async function remove(id: string) {
    setList((dishes ?? []).filter((dish) => dish.id !== id));
    const { error } = await supabase.from('partner_dishes').delete().eq('id', id);
    reportError('eliminazione piatto', error);
  }

  // Ripristino dopo l'undo: il piatto torna con lo stesso id e si riaccende
  // nelle vetrine in cui era acceso prima.
  async function restore(dish: Dish, _index: number, showcaseIds: string[]) {
    const ownerId = await currentUserId();
    if (!ownerId) return;
    await supabase.from('partner_dishes').insert({
      id: dish.id,
      owner_user_id: ownerId,
      ...fromDish(dish),
    });
    await saveTranslations(dish.id, dish.translations);
    await setDishShowcases(dish.id, showcaseIds);
    await reload();
  }

  return { dishes, create, update, remove, restore };
}

// Accende un piatto esattamente nelle vetrine elencate e lo spegne nelle
// altre: le caselle "In vetrina" della maschera ne cambiano più d'una insieme.
export async function setDishShowcases(dishId: string, showcaseIds: string[]) {
  const ownerId = await currentUserId();
  if (!ownerId) return;
  const { error: cancella } = await supabase
    .from('partner_showcase_dishes')
    .delete()
    .eq('dish_id', dishId);
  reportError('spegnimento piatto nelle vetrine', cancella);
  if (showcaseIds.length > 0) {
    const { error } = await supabase.from('partner_showcase_dishes').insert(
      showcaseIds.map((showcaseId) => ({
        showcase_id: showcaseId,
        dish_id: dishId,
        owner_user_id: ownerId,
      }))
    );
    reportError('accensione piatto nelle vetrine', error);
  }
}

// Le lingue già usate nel catalogo: nella maschera si propongono per prime,
// così dal secondo piatto in poi non si ripesca la stessa in fondo a quindici.
export function catalogLanguages(dishes: Dish[]): string[] {
  const codes = new Set<string>();
  for (const dish of dishes) {
    for (const t of dish.translations) if (t.language !== '') codes.add(t.language);
  }
  return [...codes];
}

// Piatti accesi in una vetrina, nell'ordine del catalogo
export function showcaseDishes(dishes: Dish[], showcase: ShowcaseDraft): Dish[] {
  return dishes.filter((dish) => showcase.dishIds.includes(dish.id));
}

// In quante vetrine un piatto è acceso (colonna del gestionale)
export function showcasesWithDish(showcases: Showcase[], dishId: string): Showcase[] {
  return showcases.filter((s) => s.dishIds.includes(dishId));
}

// Il testo da mostrare in una lingua: la traduzione se c'è, altrimenti
// l'originale. Campo per campo.
export function dishText(dish: Dish, language: string): { name: string; description: string } {
  const t = dish.translations.find((x) => x.language === language);
  return {
    name: t?.name.trim() ? t.name : dish.name,
    description: t?.description.trim() ? t.description : dish.description,
  };
}
