// Segnale effimero cross-screen per "apri questo ristorante sulla mappa".
// Usato quando un altro flusso (es. dopo "Aggiungi ristorante") torna al tab
// mappa con router.dismissAll(): non potendo passare param attraverso il
// dismiss, deposita qui l'id (+coordinate) e la mappa lo consuma al refocus.
//
// È un singleton volutamente semplice: il valore è one-shot (consume lo azzera),
// quindi non c'è rischio di riaperture accidentali a refocus successivi.

export type PendingRestaurantFocus = {
  id: string;
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
