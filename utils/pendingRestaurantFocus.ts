// Segnale effimero cross-screen per "apri questo ristorante sulla mappa".
// Due sorgenti:
//  • flusso "Aggiungi ristorante": torna al tab mappa con router.dismissAll() e
//    deposita id (+coordinate) già risolti.
//  • deep link /r/{slug}: deposita solo lo slug; la mappa lo risolve quando è
//    pronta (stesse condizioni della selezione da ricerca).
//
// La mappa lo consuma quando è "viva" (montata + primo layout), così il focus
// avviene su una mappa idle come nella ricerca — non durante il mount.
// È un singleton volutamente semplice: il valore è one-shot (consume lo azzera),
// quindi non c'è rischio di riaperture accidentali a refocus successivi.

export type PendingRestaurantFocus = {
  /** Id già risolto (flusso "Aggiungi ristorante"). */
  id?: string;
  /** Slug da risolvere (deep link); la mappa fa il fetch id+coordinate. */
  slug?: string;
  /** Coordinate per centrare la mappa; assenti = apri la scheda senza ricentrare. */
  lat?: number;
  lng?: number;
};

let pending: PendingRestaurantFocus | null = null;

export const pendingRestaurantFocus = {
  set(focus: PendingRestaurantFocus) {
    pending = focus;
  },
  /** Ritorna il focus in attesa (una sola volta) e lo azzera. */
  consume(): PendingRestaurantFocus | null {
    const current = pending;
    pending = null;
    return current;
  },
};
