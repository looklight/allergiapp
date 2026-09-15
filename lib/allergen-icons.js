// I PITTOGRAMMI DEGLI ALLERGENI al tavolo: copia gemella di
// allergiapp/partner/src/lib/allergenIcons.ts.
//
// Stessa ragione di dish-notes.js: portale e sito sono due progetti che si
// rilasciano separatamente. Le tiene allineate `npm run gemelle` dentro
// partner/, che le confronta disegno per disegno.
//
// ⚠️ NON MODIFICARE A MANO SOLO QUI: il ristoratore approva questi disegni
// nell'anteprima, il cliente li legge al tavolo. Contenuto di un
// <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">.

const ALLERGEN_ICON_PATHS = {
  gluten: '<path d="M12 21V8"/><path d="M12 8c0-2.2 1.3-4.1 3.2-5-.2 2.2-1.4 4.1-3.2 5Zm0 0c0-2.2-1.3-4.1-3.2-5 .2 2.2 1.4 4.1 3.2 5Zm0 4.6c0-2.2 1.3-4.1 3.2-5-.2 2.2-1.4 4.1-3.2 5Zm0 0c0-2.2-1.3-4.1-3.2-5 .2 2.2 1.4 4.1 3.2 5Zm0 4.6c0-2.2 1.3-4.1 3.2-5-.2 2.2-1.4 4.1-3.2 5Zm0 0c0-2.2-1.3-4.1-3.2-5 .2 2.2 1.4 4.1 3.2 5Z"/>',
  milk:
    '<path d="M7 9.5 9.5 4h5L17 9.5V20a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V9.5Z"/><path d="M7 9.5h10"/><path d="M12 4v5.5"/>',
  eggs: '<path d="M12 3.2c3.1 0 5.6 4.4 5.6 8.6 0 4-2.5 6.8-5.6 6.8s-5.6-2.8-5.6-6.8c0-4.2 2.5-8.6 5.6-8.6Z"/>',
  nuts:
    '<path d="M5.2 10.6c0-3.6 3-6 6.8-6s6.8 2.4 6.8 6H5.2Z"/><path d="M6.8 10.6c.2 5 2.3 9 5.2 10 2.9-1 5-5 5.2-10"/><path d="M12 4.6V2.8"/>',
  peanuts: '<path d="M9 3.6c2.6 0 4 1.7 4.4 3.5.3 1.4.7 2 2 2.6 2 .9 3.1 2.7 3.1 4.9 0 3.1-2.3 5.4-5.4 5.4-2.6 0-4.1-1.7-4.5-3.5-.3-1.4-.6-2-1.9-2.5-2-.9-3.2-2.7-3.2-5 0-3.1 2.3-5.4 5.5-5.4Z"/><path d="M8.4 8.2h.01M14.5 15h.01"/>',
  crustaceans: '<path d="M12 9.2c2.8 0 5 1.9 5 4.2 0 .9-.3 1.7-.9 2.4H7.9c-.6-.7-.9-1.5-.9-2.4 0-2.3 2.2-4.2 5-4.2Z"/><path d="M9.8 12.4h.01M14.2 12.4h.01"/><path d="M7.2 9.1c-1.2 0-2.2-1-2.2-2.2V5.6M16.8 9.1c1.2 0 2.2-1 2.2-2.2V5.6"/><path d="M7.4 16.6 5.2 18.8M16.6 16.6l2.2 2.2M6.8 13.4H4.1M17.2 13.4h2.7"/>',
  fish: '<path d="M15.6 12c0 3-3.4 5.4-7 5.4-1.6 0-3-.4-4.1-1.1.7-1.2 1.1-2.7 1.1-4.3s-.4-3.1-1.1-4.3c1.1-.7 2.5-1.1 4.1-1.1 3.6 0 7 2.4 7 5.4Z"/><path d="M15.6 12c1.5.4 3 1.5 4.3 3.2V8.8c-1.3 1.7-2.8 2.8-4.3 3.2Z"/><path d="M8.6 10.6h.01"/>',
  mollusks: '<path d="M12 21c-5 0-9-4-9-9s4-9 9-9 9 4 9 9c0 3.3-2.7 6-6 6s-6-2.7-6-6 2-4.2 4.2-4.2S17 9.8 17 12s-1.6 3.3-3.1 3.1"/>',
  soy: '<path d="M5.4 6.2c3.6-1.4 7.5.4 10.2 3.1 2.7 2.7 3.4 6 2.9 8.5-2.5.5-5.8-.2-8.5-2.9C7.3 12.2 5.5 8.3 5.4 6.2Z"/><path d="M9.4 9.9h.01M12 12.5h.01M14.6 15.1h.01"/>',
  sesame: '<path d="M8.4 6.2c1.2 0 2.2 1.3 2.2 2.9s-1 2.9-2.2 2.9-2.2-1.3-2.2-2.9 1-2.9 2.2-2.9Z"/><path d="M15.6 8.6c1.2 0 2.2 1.3 2.2 2.9s-1 2.9-2.2 2.9-2.2-1.3-2.2-2.9 1-2.9 2.2-2.9Z"/><path d="M10.4 14.4c1.2 0 2.2 1.3 2.2 2.9s-1 2.9-2.2 2.9-2.2-1.3-2.2-2.9 1-2.9 2.2-2.9Z"/>',
  mustard: '<path d="M7.6 9.4h8.8v9.4a1.8 1.8 0 0 1-1.8 1.8H9.4a1.8 1.8 0 0 1-1.8-1.8V9.4Z"/><path d="M6.8 5.6h10.4v3.8H6.8z"/><path d="M10.4 13h3.2"/>',
  celery:
    '<path d="M9.5 21 10.4 11M12 21V10.5M14.5 21l-.9-10"/><path d="M10.4 11c-2.4-.3-4-2-4.2-4.4 2.3-.1 4 1.3 4.6 3.4M12 10.5c-1.6-1.6-1.9-4-.4-6.2 1.9 1.6 2 4.2.4 6.2M13.6 11c.6-2.1 2.3-3.5 4.6-3.4-.2 2.4-1.8 4.1-4.2 4.4"/>',
  sulfites: '<path d="M6.8 3.6h10.4l-.8 5.2a4.7 4.7 0 0 1-4.4 4 4.7 4.7 0 0 1-4.4-4L6.8 3.6Z"/><path d="M12 12.8v5.6M8.6 20.4h6.8"/>',
  lupin:
    '<path d="M4 12.5h16a8 8 0 0 1-16 0Z"/><circle cx="8.6" cy="9" r="2.2"/><circle cx="13.2" cy="8.2" r="2.2"/><circle cx="16.4" cy="10.6" r="1.6"/>',
  fava_beans:
    '<path d="M10 3.6c3.6 0 7.8 2.9 8.2 7.6.4 4.8-2.9 9.2-7.4 9.2-3.2 0-5.4-2.1-5.4-4.8 0-1.6.9-2.6.9-3.8S5.4 9.6 5.4 8.3c0-2.6 2-4.7 4.6-4.7Z"/><path d="M8.4 11.8c.9.5 1.9.5 2.8 0"/>',
};

function allergenIcon(code) {
  return ALLERGEN_ICON_PATHS[code] || '';
}

module.exports = { ALLERGEN_ICON_PATHS, allergenIcon };
