// Vercel serverless function: /u/[username]
// Renderizza la pagina profilo pubblica condivisibile (mirror di api/r/[slug].js).
// Routing via vercel.json: /u/:username -> /api/u/:username
//
// NOINDEX: pubblico in app ≠ indicizzato sul web. Oltre al meta robots nella
// pagina, X-Robots-Tag copre anche la 404 e ogni risposta della function.

const { fetchPublicProfile } = require('../../lib/supabase');
const { detectLocale, createT } = require('../../lib/i18n');
const { escapeHtml } = require('../../lib/render-helpers');
const { renderProfilePage } = require('../../lib/render-profile');

module.exports = async function handler(req, res) {
  const { username } = req.query;
  const locale = detectLocale(req.headers['accept-language']);
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');

  if (!username || typeof username !== 'string') {
    return sendNotFound(res, locale);
  }

  let profile;
  try {
    profile = await fetchPublicProfile(username);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[u/username] RPC error', err);
    return sendError(res, locale);
  }

  // Null anche per profili anonimi: la RPC non li risolve mai (guardia server).
  if (!profile) {
    return sendNotFound(res, locale);
  }

  const t = createT(locale);
  const html = renderProfilePage(profile, locale, t);

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
<meta name="robots" content="noindex, nofollow">
<title>${escapeHtml(t('profileNotFoundTitle'))} | AllergiApp</title>
</head>
<body>
<h1>${escapeHtml(t('profileNotFoundTitle'))}</h1>
<p>${escapeHtml(t('profileNotFoundBody'))}</p>
<p><a href="/download">${escapeHtml(t('profileNotFoundCta'))}</a></p>
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
<meta name="robots" content="noindex, nofollow">
<title>${escapeHtml(t('errorTitle'))} | AllergiApp</title>
</head>
<body>
<h1>${escapeHtml(t('errorTitle'))}</h1>
<p>${escapeHtml(t('errorBody'))}</p>
</body>
</html>`);
}
