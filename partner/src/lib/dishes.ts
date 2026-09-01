'use client';

// Il catalogo piatti del partner: sta SOPRA i locali, perché lo stesso
// ristoratore con due locali riusa gli stessi piatti. La scheda ne tiene
// solo gli id accesi, quindi da qui si scrive anche là — mai il contrario.
// Dal 30/08 vive in partner_dishes invece che nel localStorage.
import { supabase } from './supabase';
import { currentUserId, reportError, useRemoteList } from './storage';
import { write } from './saveState';
import { deleteDishPhoto } from './photos';
import type { Venue, VenueDraft } from './venues';

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
  photoUrl: string; // foto grande, o un data-URL sulle righe anteriori alla 702
  photoThumbUrl: string; // miniatura per le liste; vuota sulle foto vecchie
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
    photoThumbUrl: row.photo_thumb_url ?? '',
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
    photo_thumb_url: data.photoThumbUrl || null,
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

// Una traduzione senza lingua o senza niente scritto dentro non è una riga:
// il conto sta qui, in un posto solo, perché lo usano sia la scrittura sia la
// decisione di non scrivere affatto.
function compilate(translations: DishTranslation[]) {
  return translations.filter(
    (t) => t.language !== '' && (t.name.trim() !== '' || t.description.trim() !== '')
  );
}

// Le traduzioni si riscrivono tutte: sono poche e i campi vuoti non vanno
// salvati, quindi calcolare la differenza costerebbe più di quanto risparmi.
async function saveTranslations(
  dishId: string,
  translations: DishTranslation[],
  precedenti: DishTranslation[] = []
) {
  const righe = compilate(translations);
  // Quasi tutti i ristoratori scrivono solo in italiano: senza questa uscita,
  // ogni salvataggio di ogni piatto porterebbe con sé una cancellazione di
  // righe che non sono mai esistite.
  if (righe.length === 0 && compilate(precedenti).length === 0) return;

  await write(
    'cancellazione traduzioni',
    () => supabase.from('partner_dish_translations').delete().eq('dish_id', dishId),
    `trad-cancella:${dishId}`
  );
  if (righe.length > 0) {
    await write(
      'scrittura traduzioni',
      () =>
        supabase.from('partner_dish_translations').insert(
          righe.map((t) => ({
            dish_id: dishId,
            language: t.language,
            name: t.name.trim() || null,
            description: t.description.trim() || null,
          }))
        ),
      `trad-scrivi:${dishId}`
    );
  }
}

// dishes è null finché la prima lettura non è tornata
export function useDishes() {
  const { list: dishes, setList, reload } = useRemoteList('piatti', loadDishes);

  async function create(data: Omit<Dish, 'id'>): Promise<Dish | null> {
    const ownerId = await currentUserId();
    if (!ownerId) return null;
    const { data: row } = await write('creazione piatto', () =>
      supabase
        .from('partner_dishes')
        .insert({ owner_user_id: ownerId, ...fromDish(data) })
        .select('id')
        .single()
    );
    if (!row) return null;
    await saveTranslations(row.id, data.translations);
    const creato: Dish = { ...data, id: row.id };
    setList([...(dishes ?? []), creato]);
    return creato;
  }

  async function update(id: string, data: Omit<Dish, 'id'>) {
    const precedente = (dishes ?? []).find((dish) => dish.id === id);
    setList((dishes ?? []).map((dish) => (dish.id === id ? { ...data, id } : dish)));
    const { error } = await write(
      'modifica piatto',
      () => supabase.from('partner_dishes').update(fromDish(data)).eq('id', id),
      `piatto:${id}`
    );
    // La foto sostituita si cancella SOLO dopo che la riga che ha smesso di
    // puntarci è stata scritta davvero. Cancellandola prima, una scrittura
    // rifiutata lascerebbe il piatto con l'indirizzo di un file che non
    // c'è più — e un'immagine rotta è peggio di un file di troppo.
    if (!error && precedente && precedente.photoUrl !== '' && precedente.photoUrl !== data.photoUrl) {
      void deleteDishPhoto(precedente.photoUrl, precedente.photoThumbUrl);
    }
    await saveTranslations(id, data.translations, precedente?.translations ?? []);
  }

  // Il piatto eliminato sparisce anche dalle schede su cui era acceso: se ne
  // occupa il database con la cascata sull'accostamento.
  //
  // La FOTO invece resta, e non è una dimenticanza: per otto secondi
  // l'eliminazione è annullabile, e un ripristino che riporta il piatto senza
  // l'immagine sarebbe un annulla che non annulla. La cancella la schermata
  // quando l'annulla scade (v. /piatti), che è l'unico momento in cui
  // l'eliminazione diventa definitiva.
  // Restituisce se la riga è sparita davvero: la schermata ci si basa per
  // decidere se può portare via anche i file della foto.
  async function remove(id: string): Promise<boolean> {
    setList((dishes ?? []).filter((dish) => dish.id !== id));
    const { error } = await write('eliminazione piatto', () =>
      supabase.from('partner_dishes').delete().eq('id', id)
    );
    return !error;
  }

  // Ripristino dopo l'undo: il piatto torna con lo stesso id e si riaccende
  // sulle schede su cui era acceso prima.
  async function restore(dish: Dish, _index: number, venueIds: string[]) {
    const ownerId = await currentUserId();
    if (!ownerId) return;
    await write('ripristino piatto', () =>
      supabase.from('partner_dishes').insert({
        id: dish.id,
        owner_user_id: ownerId,
        ...fromDish(dish),
      })
    );
    await saveTranslations(dish.id, dish.translations);
    await setDishVenues(dish.id, venueIds);
    await reload();
  }

  return { dishes, create, update, remove, restore };
}

// Accende un piatto esattamente nei locali elencati e lo spegne negli altri:
// le caselle della maschera ne cambiano più d'uno insieme.
//
// Riceve id di LOCALI perché è quello che la maschera mostra, ma i piatti
// accesi stanno sulle SCHEDE (migration 703): la conversione si fa qui, in un
// punto solo. Un locale senza scheda non produce nessuna riga — non c'è
// ancora nessun posto in cui quel piatto potrebbe comparire.
export async function setDishVenues(dishId: string, venueIds: string[]) {
  const ownerId = await currentUserId();
  if (!ownerId) return;

  let cardIds: string[] = [];
  if (venueIds.length > 0) {
    const { data, error } = await supabase
      .from('partner_cards')
      .select('id')
      .in('venue_id', venueIds);
    reportError('lettura schede', error);
    cardIds = (data ?? []).map((row) => row.id);
  }

  await write(
    'spegnimento piatto sulle schede',
    () => supabase.from('partner_card_dishes').delete().eq('dish_id', dishId),
    `schede-spegni:${dishId}`
  );
  if (cardIds.length > 0) {
    await write(
      'accensione piatto sulle schede',
      () =>
        supabase.from('partner_card_dishes').insert(
          cardIds.map((cardId) => ({
            card_id: cardId,
            dish_id: dishId,
            owner_user_id: ownerId,
          }))
        ),
      `schede-accendi:${dishId}`
    );
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

// Piatti accesi su una scheda, nell'ordine del catalogo
export function venueDishes(dishes: Dish[], venue: VenueDraft): Dish[] {
  return dishes.filter((dish) => venue.dishIds.includes(dish.id));
}

// Su quante schede un piatto è acceso (colonna del gestionale)
export function venuesWithDish(venues: Venue[], dishId: string): Venue[] {
  return venues.filter((s) => s.dishIds.includes(dishId));
}

// L'indirizzo da usare dove la foto è piccola — righe, griglie, cerchi —
// cioè quasi ovunque. Ripiega sulla grande per le foto caricate prima della
// 702, che una miniatura non ce l'hanno.
export function dishThumb(dish: Dish): string {
  return dish.photoThumbUrl || dish.photoUrl;
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
