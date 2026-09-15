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
// ⚠️ PRIMA STESURA DEL 06/09, RIVISTA IL 2026-09-15 guardando le icone a 16px
// (la misura della riga) una accanto all'altra. Cinque sostituite perché si
// confondevano: latte (goccia → cartone, era uguale all'uovo), frutta a guscio
// (noce → ghianda, sembrava il simbolo della pace), sedano (mazzo legato →
// gambi con foglie, sembrava una forchetta), lupini (spiga di fiori → ciotola
// di semi) e fave (baccello → seme; soia, lupini e fave erano tre baccelli).
// Reggono dall'inizio chiocciola, arachide, pesce, granchio e calice.
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
  // Cartone del latte, col tetto a capanna (2026-09-15). Prima era una goccia,
  // e a 16px goccia e uovo erano la stessa macchia chiusa: il cartone è la
  // sagoma che il latte ha in ogni supermercato, e non somiglia a niente del set.
  milk:
    '<path d="M7 9.5 9.5 4h5L17 9.5V20a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V9.5Z"/><path d="M7 9.5h10"/><path d="M12 4v5.5"/>',
  // Uovo: ovale asimmetrico, più largo in basso.
  eggs: '<path d="M12 3.2c3.1 0 5.6 4.4 5.6 8.6 0 4-2.5 6.8-5.6 6.8s-5.6-2.8-5.6-6.8c0-4.2 2.5-8.6 5.6-8.6Z"/>',
  // Ghianda (2026-09-15): cappello, frutto a punta, picciolo. Prima era una noce
  // con la cucitura a Y, che a 16px si leggeva come il simbolo della pace. La
  // ghianda non si mangia, ma è il segno di «frutto col guscio» che si riconosce
  // ovunque — la frutta a guscio non ha un profilo suo, e questo lo presta.
  nuts:
    '<path d="M5.2 10.6c0-3.6 3-6 6.8-6s6.8 2.4 6.8 6H5.2Z"/><path d="M6.8 10.6c.2 5 2.3 9 5.2 10 2.9-1 5-5 5.2-10"/><path d="M12 4.6V2.8"/>',
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
  // Tre gambi con le foglie in cima (2026-09-15). Prima i gambi erano legati in
  // un mazzo, e a 16px si leggevano come una forchetta.
  celery:
    '<path d="M9.5 21 10.4 11M12 21V10.5M14.5 21l-.9-10"/><path d="M10.4 11c-2.4-.3-4-2-4.2-4.4 2.3-.1 4 1.3 4.6 3.4M12 10.5c-1.6-1.6-1.9-4-.4-6.2 1.9 1.6 2 4.2.4 6.2M13.6 11c.6-2.1 2.3-3.5 4.6-3.4-.2 2.4-1.8 4.1-4.2 4.4"/>',
  // Calice: i solfiti al tavolo sono il vino, ed è così che li si riconosce.
  sulfites:
    '<path d="M6.8 3.6h10.4l-.8 5.2a4.7 4.7 0 0 1-4.4 4 4.7 4.7 0 0 1-4.4-4L6.8 3.6Z"/><path d="M12 12.8v5.6M8.6 20.4h6.8"/>',
  // Ciotola di semi (2026-09-15): i lupini si servono così, e soprattutto è una
  // sagoma che nessun'altra icona ha. Il fiore a spiga somigliava al glutine,
  // i semi tondi al sesamo e alle arachidi, il baccello alla soia.
  lupin:
    '<path d="M4 12.5h16a8 8 0 0 1-16 0Z"/><circle cx="8.6" cy="9" r="2.2"/><circle cx="13.2" cy="8.2" r="2.2"/><circle cx="16.4" cy="10.6" r="1.6"/>',
  // Il seme della fava, a rene con l'ilo (2026-09-15). Prima era un baccello
  // con quattro fave, troppo simile a quello della soia e letto come una pillola.
  fava_beans:
    '<path d="M10 3.6c3.6 0 7.8 2.9 8.2 7.6.4 4.8-2.9 9.2-7.4 9.2-3.2 0-5.4-2.1-5.4-4.8 0-1.6.9-2.6.9-3.8S5.4 9.6 5.4 8.3c0-2.6 2-4.7 4.6-4.7Z"/><path d="M8.4 11.8c.9.5 1.9.5 2.8 0"/>',
};

// Chi non ce l'ha (nessuno dei 15, oggi) non deve sparire dalla riga: un
// allergene senza pittogramma resta la sua parola.
export function hasAllergenIcon(code: string): boolean {
  return code in ALLERGEN_ICON_PATHS;
}
