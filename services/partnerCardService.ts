import { supabase } from './supabase';
import { getAppLanguage } from '../utils/i18n';

// ─── La scheda del ristoratore ───────────────────────────────────────────────
// Quello che un ristoratore abbonato ha pubblicato per il SUO ristorante: i
// piatti che ha scelto di mostrare e i suoi collegamenti (prenotazione,
// delivery, menù, sito).
//
// Una chiamata sola, `get_restaurant_card` (migration 731). L'app non legge
// le tabelle del mondo partner: da quelle vedrebbe anche le bozze e chi
// gestisce cosa. Qui arriva solo il risultato, e solo quando si può vedere —
// abbonamento attivo, collegamento attivo, visto del nostro team. Se manca
// anche solo una di quelle cose la risposta e' `null`, indistinguibile da
// "questo ristorante non ha un partner": non si racconta all'utente che una
// volta c'era qualcosa.
//
// PIATTI E LINK sono la versione PUBBLICATA; nome, foto, allergeni e note
// arrivano vivi dal catalogo del ristoratore, quindi una correzione di
// allergeni si vede subito senza aspettare che qualcuno ripubblichi.
//
// LE DUE MISURE DELLE FOTO restano separate: `thumbUrl` (240px) e' quella
// delle liste, `photoUrl` (900px) si scarica solo quando si apre il piatto.
// Il database non fa ripiegare l'una sull'altra apposta — una lista non deve
// poter scaricare l'immagine pesante nemmeno per sbaglio.

export type PartnerLinkKind = 'booking' | 'delivery' | 'menu' | 'website';

export interface PartnerCardLink {
  kind: PartnerLinkKind;
  url: string;
  /** Solo `booking`: il numero da chiamare. Puo' esserci insieme all'url. */
  phone: string;
  /** Solo `menu`: lingua di quel menù esterno (codice ISO a due lettere). */
  language: string;
  /** Solo `delivery`: Glovo, Deliveroo, … */
  provider: string;
  /** Etichetta scritta dal ristoratore, quando c'e'. */
  label: string;
}

export interface PartnerCardDish {
  id: string;
  name: string;
  description: string;
  /** Codice da DISH_CATEGORIES del portale; '' = senza categoria. */
  category: string;
  /** Codici allergene dichiarati dal ristoratore (allergens.code). */
  allergens: string[];
  /** Compatibilita' dichiarate (stessa lista di constants/diets.ts). */
  diets: string[];
  /** Fatti sul piatto (surgelato, crudo, piccante…): non sono compatibilita'. */
  notes: string[];
  /** 240px, per le liste. Vuota se il piatto non ha foto. */
  thumbUrl: string;
  /** 900px, solo al tocco. Vuota se il piatto non ha foto. */
  photoUrl: string;
}

export interface PartnerCard {
  venueId: string;
  publishedAt: string;
  /** L'indirizzo del menù al tavolo, solo se e' davvero online. */
  menuSlug: string | null;
  links: PartnerCardLink[];
  dishes: PartnerCardDish[];
}

function mapLink(row: any): PartnerCardLink {
  return {
    kind: row.kind,
    url: row.url ?? '',
    phone: row.phone ?? '',
    language: row.language ?? '',
    provider: row.provider ?? '',
    label: row.label ?? '',
  };
}

function mapDish(row: any): PartnerCardDish {
  return {
    id: row.id,
    name: row.name ?? '',
    description: row.description ?? '',
    category: row.category ?? '',
    allergens: row.allergens ?? [],
    diets: row.diets ?? [],
    notes: row.notes ?? [],
    thumbUrl: row.thumbUrl ?? '',
    photoUrl: row.photoUrl ?? '',
  };
}

function mapCard(data: any): PartnerCard {
  return {
    venueId: data.venueId,
    publishedAt: data.publishedAt,
    menuSlug: data.menuSlug ?? null,
    links: (data.links ?? []).map(mapLink),
    dishes: (data.dishes ?? []).map(mapDish),
  };
}

/**
 * La scheda del ristoratore per questo ristorante, o `null` se non c'e'.
 *
 * Non solleva mai: la scheda e' un di piu', e un errore di rete non deve
 * rompere l'apertura di un ristorante. In caso di guaio si comporta come
 * "non c'e' scheda" — come il resto delle letture accessorie della scheda
 * ristorante (v. favoriteNoteService).
 *
 * La lingua e' quella dell'interfaccia: il database restituisce nome e
 * descrizione gia' tradotti, con l'originale come ripiego campo per campo.
 */
export async function getRestaurantCard(restaurantId: string): Promise<PartnerCard | null> {
  try {
    const { data, error } = await supabase.rpc('get_restaurant_card', {
      p_restaurant_id: restaurantId,
      p_language: getAppLanguage(),
    });
    if (error) throw error;
    return data ? mapCard(data) : null;
  } catch (error) {
    console.warn('[PartnerCardService] Errore getRestaurantCard:', error);
    return null;
  }
}

export const PartnerCardService = { getRestaurantCard };
