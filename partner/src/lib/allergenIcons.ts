// I PITTOGRAMMI DEGLI ALLERGENI per il menù al tavolo (colonna
// partner_venues.allergen_display, migration 711).
//
// Disegnati a TRATTO e non a silhouette piena: è la scelta dell'utente, ed è
// anche quella giusta per il posto — una linea sottile sta dentro una riga di
// testo, una macchia piena ci si posa sopra come un adesivo.
//
// ⚠️ MISURE, imparate provandole nel browser il 2026-09-06:
//   * la griglia è 24×24 e il tratto è 2. A 12px una linea da 1,5 diventa
//     mezzo pixel sullo schermo e impasta;
//   * si disegnano a 16px, non a 11 come il testo che sostituiscono. Le icone
//     in quella riga NON fanno risparmiare spazio: ne chiedono;
//   * a questa misura conta la SAGOMA, non il dettaglio interno. Ogni linea
//     interna che non cambia il profilo è rumore: toglierla.
//
// ⚠️ QUESTE SONO UNA PRIMA STESURA, approvata dall'utente come punto di
// partenza («nel caso le cambieremo in seguito»). Quelle che alla prova
// reggono meglio sono la chiocciola dei molluschi, l'arachide e il pesce;
// le tre baccelle — soia, lupini, fave — si somigliano fra loro ed è il
// primo posto da rivedere. La frutta a guscio non ha un profilo distintivo e
// resta la più debole di tutte.
//
// ⚠️ COPIA GEMELLA sul sito (landing/lib/allergen-icons.js): questi disegni
// li vede il cliente al tavolo, e l'anteprima nel portale deve mostrare la
// stessa cosa. Si controllano con `npm run gemelle`.
import type { AllergenDisplay } from './venues';

export type { AllergenDisplay };

// Il contenuto di un <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
export const ALLERGEN_ICON_PATHS: Record<string, string> = {
  // Spiga: gambo e chicchi a coppie. Il profilo a lisca la rende
  // riconoscibile anche quando i chicchi si chiudono.
  gluten:
    '<path d="M12 21V8"/><path d="M12 8c0-2.2 1.3-4.1 3.2-5-.2 2.2-1.4 4.1-3.2 5Zm0 0c0-2.2-1.3-4.1-3.2-5 .2 2.2 1.4 4.1 3.2 5Zm0 4.6c0-2.2 1.3-4.1 3.2-5-.2 2.2-1.4 4.1-3.2 5Zm0 0c0-2.2-1.3-4.1-3.2-5 .2 2.2 1.4 4.1 3.2 5Zm0 4.6c0-2.2 1.3-4.1 3.2-5-.2 2.2-1.4 4.1-3.2 5Zm0 0c0-2.2-1.3-4.1-3.2-5 .2 2.2 1.4 4.1 3.2 5Z"/>',
  // Goccia: il latte non ha una forma sua, la goccia sì.
  milk: '<path d="M12 3.4c3.4 4 5.1 6.9 5.1 8.8 0 3-2.3 5.4-5.1 5.4s-5.1-2.4-5.1-5.4c0-1.9 1.7-4.8 5.1-8.8Z"/>',
  // Uovo: ovale asimmetrico, più largo in basso.
  eggs: '<path d="M12 3.2c3.1 0 5.6 4.4 5.6 8.6 0 4-2.5 6.8-5.6 6.8s-5.6-2.8-5.6-6.8c0-4.2 2.5-8.6 5.6-8.6Z"/>',
  // Noce: la più debole del set (v. sopra). Guscio tondo con la cucitura.
  nuts: '<path d="M12 20.7c-4.4-1.1-7.7-4.6-7.7-8.9 0-4.3 3.4-7.8 7.7-7.8s7.7 3.5 7.7 7.8c0 4.3-3.3 7.8-7.7 8.9Z"/><path d="M12 20.7V9.9"/><path d="M12 9.9c-1-1.7-2.6-3-4.4-3.7M12 9.9c1-1.7 2.6-3 4.4-3.7"/>',
  // Arachide: due lobi e due semi. Regge bene a 12px.
  peanuts:
    '<path d="M9 3.6c2.6 0 4 1.7 4.4 3.5.3 1.4.7 2 2 2.6 2 .9 3.1 2.7 3.1 4.9 0 3.1-2.3 5.4-5.4 5.4-2.6 0-4.1-1.7-4.5-3.5-.3-1.4-.6-2-1.9-2.5-2-.9-3.2-2.7-3.2-5 0-3.1 2.3-5.4 5.5-5.4Z"/><path d="M8.4 8.2h.01M14.5 15h.01"/>',
  // Granchio e non gambero: la scelta dell'utente, e in effetti due chele
  // sporgenti si riconoscono dove una coda arrotolata è uno scarabocchio.
  crustaceans:
    '<path d="M12 9.2c2.8 0 5 1.9 5 4.2 0 .9-.3 1.7-.9 2.4H7.9c-.6-.7-.9-1.5-.9-2.4 0-2.3 2.2-4.2 5-4.2Z"/><path d="M9.8 12.4h.01M14.2 12.4h.01"/><path d="M7.2 9.1c-1.2 0-2.2-1-2.2-2.2V5.6M16.8 9.1c1.2 0 2.2-1 2.2-2.2V5.6"/><path d="M7.4 16.6 5.2 18.8M16.6 16.6l2.2 2.2M6.8 13.4H4.1M17.2 13.4h2.7"/>',
  // Pesce: profilo e coda. Fra le più solide del set.
  fish: '<path d="M15.6 12c0 3-3.4 5.4-7 5.4-1.6 0-3-.4-4.1-1.1.7-1.2 1.1-2.7 1.1-4.3s-.4-3.1-1.1-4.3c1.1-.7 2.5-1.1 4.1-1.1 3.6 0 7 2.4 7 5.4Z"/><path d="M15.6 12c1.5.4 3 1.5 4.3 3.2V8.8c-1.3 1.7-2.8 2.8-4.3 3.2Z"/><path d="M8.6 10.6h.01"/>',
  // Chiocciola: la più leggibile di tutte, e non somiglia a nient'altro.
  mollusks:
    '<path d="M12 21c-5 0-9-4-9-9s4-9 9-9 9 4 9 9c0 3.3-2.7 6-6 6s-6-2.7-6-6 2-4.2 4.2-4.2S17 9.8 17 12s-1.6 3.3-3.1 3.1"/>',
  // Baccello curvo con tre semi.
  soy: '<path d="M5.4 6.2c3.6-1.4 7.5.4 10.2 3.1 2.7 2.7 3.4 6 2.9 8.5-2.5.5-5.8-.2-8.5-2.9C7.3 12.2 5.5 8.3 5.4 6.2Z"/><path d="M9.4 9.9h.01M12 12.5h.01M14.6 15.1h.01"/>',
  // Tre semi: il sesamo non ha un contenitore, ha solo i semi.
  sesame:
    '<path d="M8.4 6.2c1.2 0 2.2 1.3 2.2 2.9s-1 2.9-2.2 2.9-2.2-1.3-2.2-2.9 1-2.9 2.2-2.9Z"/><path d="M15.6 8.6c1.2 0 2.2 1.3 2.2 2.9s-1 2.9-2.2 2.9-2.2-1.3-2.2-2.9 1-2.9 2.2-2.9Z"/><path d="M10.4 14.4c1.2 0 2.2 1.3 2.2 2.9s-1 2.9-2.2 2.9-2.2-1.3-2.2-2.9 1-2.9 2.2-2.9Z"/>',
  // Barattolo col coperchio: la senape sta in un vasetto, in ogni cucina.
  mustard:
    '<path d="M7.6 9.4h8.8v9.4a1.8 1.8 0 0 1-1.8 1.8H9.4a1.8 1.8 0 0 1-1.8-1.8V9.4Z"/><path d="M6.8 5.6h10.4v3.8H6.8z"/><path d="M10.4 13h3.2"/>',
  // Gambi legati: il sedano è un mazzo, non uno stelo solo.
  celery:
    '<path d="M8.2 3.6c-.8 3.8-1.1 7.6-.9 11.4M12 3.2c.2 3.9.1 7.8-.4 11.6M15.8 3.6c.9 3.7 1.3 7.5 1.1 11.3"/><path d="M6.6 14.6h10.8l-1 4.5a1.8 1.8 0 0 1-1.8 1.4H9.4a1.8 1.8 0 0 1-1.8-1.4l-1-4.5Z"/>',
  // Calice: i solfiti al tavolo sono il vino, ed è così che li si riconosce.
  sulfites:
    '<path d="M6.8 3.6h10.4l-.8 5.2a4.7 4.7 0 0 1-4.4 4 4.7 4.7 0 0 1-4.4-4L6.8 3.6Z"/><path d="M12 12.8v5.6M8.6 20.4h6.8"/>',
  // Spiga di fiori: il lupino in campo è un fiore alto, e così si distingue
  // dalle altre due baccelle. ⚠️ Da rivedere insieme a soia e fave.
  lupin:
    '<path d="M12 21v-6.4"/><path d="M12 14.6c-1.6 0-2.9-1.2-2.9-2.6s1.3-2.6 2.9-2.6 2.9 1.2 2.9 2.6-1.3 2.6-2.9 2.6Z"/><path d="M12 9.4c-1.3 0-2.4-1-2.4-2.2s1.1-2.2 2.4-2.2 2.4 1 2.4 2.2-1.1 2.2-2.4 2.2Z"/><path d="M12 5c-.7 0-1.3-.5-1.3-1.2"/>',
  // Baccello dritto con quattro fave: più largo e più rigido di quello
  // della soia. ⚠️ La somiglianza resta, è il difetto noto del set.
  fava_beans:
    '<path d="M9.2 3.4c1.8 0 3.2 1.5 3.2 3.3v10.6c0 1.8-1.4 3.3-3.2 3.3S6 19.1 6 17.3V6.7c0-1.8 1.4-3.3 3.2-3.3Z"/><path d="M9.2 7.4h.01M9.2 10.8h.01M9.2 14.2h.01M9.2 17.6h.01"/><path d="M15.4 5.6c1.4 3.4 1.4 9.4 0 12.8"/>',
};

// Chi non ce l'ha (nessuno dei 15, oggi) non deve sparire dalla riga: un
// allergene senza pittogramma resta la sua parola.
export function hasAllergenIcon(code: string): boolean {
  return code in ALLERGEN_ICON_PATHS;
}
