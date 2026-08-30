'use client';

// Il catalogo piatti del partner: sta SOPRA le vetrine, perché lo stesso
// ristoratore con due locali riusa gli stessi piatti. La vetrina ne tiene
// solo gli id accesi, quindi da qui si scrive anche là — mai il contrario.
import { readList, useStoredList, writeList } from './storage';
import { rewriteShowcases, type Showcase, type ShowcaseDraft } from './showcases';

export interface Dish {
  id: string;
  name: string;
  description: string;
  category: string; // codici da DISH_CATEGORIES; '' = nessuna categoria
  photoUrl: string; // data-URL ridimensionato (localStorage); Storage in futuro
  allergens: string[]; // codici da allergens.code (presenti nel piatto)
  dietTags: string[]; // codici da DIETS (compatibilità dichiarate)
}

const DISHES_KEY = 'partner-dishes';

// `any` deliberato: v. il commento di readList in storage.ts
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeDish(parsed: any): Dish {
  return {
    id: typeof parsed?.id === 'string' ? parsed.id : crypto.randomUUID(),
    name: typeof parsed?.name === 'string' ? parsed.name : '',
    description: typeof parsed?.description === 'string' ? parsed.description : '',
    category: typeof parsed?.category === 'string' ? parsed.category : '',
    photoUrl: typeof parsed?.photoUrl === 'string' ? parsed.photoUrl : '',
    allergens: Array.isArray(parsed?.allergens) ? parsed.allergens : [],
    dietTags: Array.isArray(parsed?.dietTags) ? parsed.dietTags : [],
  };
}

function loadDishes(): Dish[] {
  return readList(DISHES_KEY, normalizeDish) ?? [];
}

// dishes è null finché il localStorage non è stato letto (solo client)
export function useDishes() {
  const [dishes, setDishes] = useStoredList(loadDishes);

  function persist(next: Dish[]) {
    setDishes(next);
    writeList(DISHES_KEY, next);
  }

  function create(data: Omit<Dish, 'id'>): Dish {
    const created: Dish = { ...data, id: crypto.randomUUID() };
    persist([...(dishes ?? []), created]);
    return created;
  }

  function update(id: string, data: Omit<Dish, 'id'>) {
    persist((dishes ?? []).map((dish) => (dish.id === id ? { ...data, id } : dish)));
  }

  // Il piatto eliminato sparisce anche dalle vetrine in cui era acceso:
  // un id orfano lì dentro non mostrerebbe niente, ma resterebbe nel conteggio.
  function remove(id: string) {
    persist((dishes ?? []).filter((dish) => dish.id !== id));
    setDishShowcases(id, []);
  }

  // Ripristino dopo l'undo: il piatto torna dov'era nel catalogo e si
  // riaccende nelle vetrine in cui era acceso prima
  function restore(dish: Dish, index: number, showcaseIds: string[]) {
    const next = [...(dishes ?? [])];
    next.splice(index, 0, dish);
    persist(next);
    setDishShowcases(dish.id, showcaseIds);
  }

  return { dishes, create, update, remove, restore };
}

// Accende un piatto esattamente nelle vetrine elencate e lo spegne nelle
// altre, in una scrittura sola: le caselle "In vetrina" del gestionale ne
// cambiano più d'una insieme, e chiamare setDishOn in fila lavorerebbe ogni
// volta su uno stato già vecchio.
export function setDishShowcases(dishId: string, showcaseIds: string[]) {
  rewriteShowcases((s) => {
    const on = showcaseIds.includes(s.id);
    if (on === s.dishIds.includes(dishId)) return s;
    return {
      ...s,
      dishIds: on ? [...s.dishIds, dishId] : s.dishIds.filter((id) => id !== dishId),
    };
  });
}

// Piatti accesi in una vetrina, nell'ordine del catalogo (che è l'ordine in
// cui il partner li ha creati): non c'è un ordinamento per vetrina.
export function showcaseDishes(dishes: Dish[], showcase: ShowcaseDraft): Dish[] {
  return dishes.filter((dish) => showcase.dishIds.includes(dish.id));
}

// In quante vetrine un piatto è acceso (colonna del gestionale)
export function showcasesWithDish(showcases: Showcase[], dishId: string): Showcase[] {
  return showcases.filter((s) => s.dishIds.includes(dishId));
}
