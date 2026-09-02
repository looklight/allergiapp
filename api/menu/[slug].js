// Vercel serverless function: /menu/[slug] e /menu/[slug]/[lang]
// La pagina che il cliente apre col QR sul tavolo.
// Routing via vercel.json.
//
// Stessa ricetta di /r/[slug]: si legge da Supabase e si restituisce HTML
// già fatto. Al cliente non va spedita nessuna applicazione — niente client
// Supabase, niente autenticazione, niente tempo reale (DIGITAL_MENU.md, Tema
// 11) — così il menù si apre anche in una sala interrata con due tacche e il
// filtro allergeni risponde senza chiedere niente alla rete.
//
// LA LINGUA non sta nell'indirizzo stampato (Tema 21): /menu/<slug> è il
// canonico e sceglie la lingua dal browser. /menu/<slug>/en esiste per chi
// vuole mandare il menù a qualcuno nella sua lingua e per farsi indicizzare.
//
// SI LEGGE SOLO IL PUBBLICATO: get_public_menu restituisce lo scatto preso
// quando il ristoratore ha premuto "Pubblica" (Tema 24). Un menù mai
// pubblicato non esiste per questa pagina.

const { fetchPublicMenu } = require('../../lib/supabase');
const { detectLocale, createT, SUPPORTED } = require('../../lib/i18n');
const { escapeHtml } = require('../../lib/render-helpers');
const { renderMenuPage } = require('../../lib/render-menu');

module.exports = async function handler(req, res) {
  const { slug, lang } = req.query;
  // La lingua nell'indirizzo vince su quella del browser: chi apre
  // /menu/mario/en l'ha chiesta lui. Una lingua che non sappiamo parlare si
  // ignora invece di dare errore — l'indirizzo può essere stato scritto a
  // mano o essere rimasto in giro da una lingua che abbiamo tolto.
  const scelta = typeof lang === 'string' && SUPPORTED.includes(lang) ? lang : null;
  const locale = scelta || detectLocale(req.headers['accept-language']);

  if (!slug || typeof slug !== 'string') {
    return sendNotFound(res, locale);
  }

  let dati;
  try {
    dati = await fetchPublicMenu(slug, locale);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[menu/slug] RPC error', err);
    return sendError(res, locale);
  }

  if (!dati) {
    return sendNotFound(res, locale);
  }

  const t = createT(locale);
  const html = renderMenuPage(dati, locale, t);

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  // Cinque minuti al bordo, come /r/ e /u/. Il menù cambia di rado e viene
  // letto di continuo: così le scansioni dei clienti non arrivano quasi mai
  // fino a Supabase, che è la promessa del Tema 11. stale-while-revalidate
  // serve al caso vero di questa pagina — mezzogiorno, venti tavoli che
  // inquadrano il QR insieme: la prima richiesta scaduta rinfresca la cache
  // mentre tutte le altre leggono comunque qualcosa.
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=60');
  return res.status(200).send(html);
};

// ⚠️ NON un 404 secco: davanti a un cliente seduto al tavolo, col telefono in
// mano e il QR appena inquadrato, una pagina di errore del browser è la cosa
// peggiore che possiamo fargli leggere. Si dice cosa fare — chiedere a chi
// serve ai tavoli — e si lascia stare tutto il resto (Temi 13 e 24).
function sendNotFound(res, locale) {
  const t = createT(locale);
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  return res.status(404).send(pagina(locale, t('menuNotFoundTitle'), t('menuNotFoundBody')));
}

function sendError(res, locale) {
  const t = createT(locale);
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  return res.status(500).send(pagina(locale, t('errorTitle'), t('errorBody')));
}

function pagina(locale, titolo, testo) {
  return `<!DOCTYPE html>
<html lang="${locale}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(titolo)} | AllergiApp</title>
<link rel="stylesheet" href="/styles.css">
<link rel="stylesheet" href="/menu-page.css">
</head>
<body class="menu-body">
<div class="menu-message">
  <img src="/images/happyplate.webp" alt="" class="menu-message-logo">
  <h1>${escapeHtml(titolo)}</h1>
  <p>${escapeHtml(testo)}</p>
</div>
</body>
</html>`;
}
