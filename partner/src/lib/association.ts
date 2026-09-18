'use client';

// L'ASSOCIAZIONE DI UN LOCALE AL SUO RISTORANTE SU ALLERGIAPP.
//
// Design in MONETIZATION.md «Associazione locale ↔ ristorante»; le regole
// stanno nel database (migration 721 e 723), non qui. Il portale non scrive
// mai le tabelle del collegamento: chiama le funzioni che controllano
// abbonamento, proprietà, P.IVA e ristoranti già presi, e ne traduce gli
// errori.
import { supabase } from './supabase';
import { reportError } from './storage';

// Chi tiene il ristorante, detto senza dire chi (nodo 2):
//   free   libero
//   yours  già associato a un tuo locale
//   taken  gestito da un altro account
export type Holder = 'free' | 'yours' | 'taken';

export type RestaurantHit = {
  id: string;
  name: string;
  address: string;
  city: string;
  countryCode: string;
  cuisines: string[];
  latitude: number;
  longitude: number;
  holder: Holder;
};

// Quanti risultati torna al massimo la ricerca: lo stesso `limit` della 723.
// Arrivati qui il proprio ristorante potrebbe essere rimasto fuori, e la
// pagina lo dice.
export const MAX_RESULTS = 20;

/**
 * Cerca fra i ristoranti di AllergiApp (723): ogni parola del nome nel nome,
 * ogni parola della città nella città o nell'indirizzo. La città si può
 * lasciare vuota. Torna null se la ricerca non ha risposto, per non
 * confondere un errore con «nessun risultato».
 */
export async function searchRestaurants(name: string, city: string): Promise<RestaurantHit[] | null> {
  const { data, error } = await supabase.rpc('partner_search_restaurants', {
    p_name: name,
    p_city: city || null,
  });
  if (error) {
    reportError('ricerca ristorante', error);
    return null;
  }
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  return (data ?? []).map((row: any) => ({
    id: row.id,
    name: row.name ?? '',
    address: row.address ?? '',
    city: row.city ?? '',
    countryCode: row.country_code ?? '',
    cuisines: row.cuisine_types ?? [],
    latitude: row.latitude,
    longitude: row.longitude,
    holder: row.holder,
  }));
}
