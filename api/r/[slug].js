// Vercel serverless function: /r/[slug]
// Renderizza la pagina pubblica di un ristorante condivisibile.
// Routing via vercel.json: /r/:slug -> /api/r/:slug

const { fetchPublicRestaurant } = require('../../lib/supabase');
const { detectLocale, createT } = require('../../lib/i18n');
const { escapeHtml } = require('../../lib/render-helpers');
const { renderRestaurantPage } = require('../../lib/render-restaurant');

module.exports = async function handler(req, res) {
  const { slug } = req.query;
  const locale = detectLocale(req.headers['accept-language']);

  if (!slug || typeof slug !== 'string') {
    return sendNotFound(res, locale);
  }

  let restaurant;
  try {
    restaurant = await fetchPublicRestaurant(slug);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[r/slug] RPC error', err);
    return sendError(res, locale);
  }

  if (!restaurant) {
    return sendNotFound(res, locale);
  }

  const t = createT(locale);
  const html = renderRestaurantPage(restaurant, locale, t);

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=60');
  return res.status(200).send(html);
};

function sendNotFound(res, locale) {
  const t = createT(locale);
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  return res.status(404).send(`<!DOCTYPE html>
<html lang="${locale}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(t('notFoundTitle'))} | AllergiApp</title>
</head>
<body>
<h1>${escapeHtml(t('notFoundTitle'))}</h1>
<p>${escapeHtml(t('notFoundBody'))}</p>
<p><a href="/">${escapeHtml(t('notFoundCta'))}</a></p>
</body>
</html>`);
}

function sendError(res, locale) {
  const t = createT(locale);
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  return res.status(500).send(`<!DOCTYPE html>
<html lang="${locale}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(t('errorTitle'))} | AllergiApp</title>
</head>
<body>
<h1>${escapeHtml(t('errorTitle'))}</h1>
<p>${escapeHtml(t('errorBody'))}</p>
</body>
</html>`);
}
