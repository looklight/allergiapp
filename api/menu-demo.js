// Vercel serverless function: /menu-demo
// Il menù finto che si vede DENTRO il telefono nella pagina /menu.
// Routing via vercel.json.
//
// PERCHÉ È UNA FUNZIONE E NON UN FILE HTML: così la prova è disegnata dalla
// STESSA funzione che serve i menù veri dei clienti al tavolo. Un file
// generato una volta e committato si sarebbe scollato al primo ritocco
// dell'aspetto, e la prova avrebbe mostrato un prodotto che non esiste più.
//
// NON È UN MENÙ PUBBLICATO (DIGITAL_MENU.md, Tema 31): niente slug, niente
// database, niente indirizzo da riservare. Passando `slug: null` il disegno
// toglie da sé il canonico, le lingue alternative e il cambio lingua
// nell'intestazione, e mette `noindex`: su Google deve finire la pagina di
// vendita, non la carta di una trattoria che non esiste.
//
// LE MANOPOLE NON SI PASSANO DI QUI. Colore, carattere e grandezza li cambia
// la pagina di fuori toccando le variabili CSS sulla radice di questo
// documento: è la ragione per cui si vedono cambiare all'ISTANTE invece di
// ricaricare il telefono a ogni tocco.

const { createT, SUPPORTED, DEFAULT_LOCALE } = require('../lib/i18n');
const { renderMenuPage } = require('../lib/render-menu');
const sample = require('../lib/menu-sample');

module.exports = function handler(req, res) {
  // La lingua la decide la pagina di fuori, che l'ha già scelta per sé: qui
  // non si annusa l'Accept-Language, o il telefono potrebbe parlare una
  // lingua diversa dalla pagina che lo contiene.
  const { lang } = req.query;
  const locale = typeof lang === 'string' && SUPPORTED.includes(lang) ? lang : DEFAULT_LOCALE;

  // SENZA FOTO, e non è una manopola dimenticata. Nel menù finto UN SOLO
  // piatto ha l'immagine, e basta quello ad accendere la colonna delle
  // miniature su TUTTE le righe: il resto della carta diventa una fila di
  // quadrati grigi vuoti. Al ristoratore vero è il comportamento giusto —
  // le righe restano allineate mentre carica le sue foto — ma su una pagina
  // di vendita si legge come una pagina rotta. Le foto restano scritte fra
  // le cose che ci sono, sotto le manopole.
  // IL VERDE È IL COLORE DI PARTENZA, e deve arrivare già dal server: se lo
  // mettesse la pagina di fuori a telefono caricato, si vedrebbe la carta
  // grigia diventare verde a ogni apertura.
  // I BOTTONI DELLA LINGUA CI SONO ANCHE QUI, e funzionano davvero: al tavolo
  // il cliente straniero fa esattamente quello, e mostrarlo vale più che
  // raccontarlo. Non avendo un indirizzo, il menù si fa dire da noi dove
  // mandarli — su noi stessi.
  const html = renderMenuPage(
    {
      ...sample,
      slug: null,
      langBase: '/menu-demo',
      showPhotos: false,
      // LE DESCRIZIONI SEMPRE ACCESE, e non è una scelta d'aspetto: senza, il
      // testo del piatto non è nel documento, e l'impaginazione a blocco —
      // che è tutta CSS — non avrebbe niente da incolonnare.
      showDescriptions: true,
      accent: '#2E6B4F',
      // L'aria sopra il nome: nella cornice la carta è rimpicciolita a metà,
      // quindi i 28 punti veri diventano 14 e l'isola ci finisce sopra.
      headerInset: 24,
    },
    locale,
    createT(locale)
  );

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('X-Robots-Tag', 'noindex');
  // I dati sono in un file del progetto: cambiano solo quando rilasciamo.
  res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=604800');
  res.status(200).send(html);
};
