// HTML rendering della pagina profilo pubblica /u/[username].
// Volutamente minimale: identità (avatar + username), da quando è membro,
// attività (recensioni, paesi) e CTA "Apri in app". NOINDEX: le pagine
// profilo non devono finire sui motori di ricerca (pubbliche in app ≠
// indicizzate sul web); l'header X-Robots-Tag lo ribadisce lato function.
//
// Avatar: happy plate statico per tutti (scelta deliberata — la RPC non
// espone avatar_url e l'avatar reale richiederebbe migration + copia asset).

const { escapeHtml, escapeAttr } = require('./render-helpers');
const {
  SITE_ORIGIN,
  APP_STORE_ID,
  APP_STORE_URL,
  PLAY_STORE_URL,
  OG_IMAGE_URL,
  renderNav,
  renderFooter,
  renderSmartBannerAndroid,
  renderInlineScript,
} = require('./render-shell');

function renderProfilePage(p, locale, t) {
  const deepLink = `allergiapp://u/${encodeURIComponent(p.username)}`;
  const canonicalUrl = `${SITE_ORIGIN}/u/${encodeURIComponent(p.username)}`;
  const memberSince = p.created_at
    ? new Date(p.created_at).toLocaleDateString(locale, { month: 'long', year: 'numeric' })
    : '';
  const reviewCount = Number(p.review_count) || 0;
  const countryCount = Number(p.country_count) || 0;

  const title = t('profilePageTitle', { username: p.username || '' });
  const description = t('profileMetaDescription', { username: p.username || '' });

  return `<!DOCTYPE html>
<html lang="${locale}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<meta name="robots" content="noindex, nofollow">
<meta name="description" content="${escapeAttr(description)}">
<link rel="canonical" href="${escapeAttr(canonicalUrl)}">
<meta name="apple-itunes-app" content="app-id=${APP_STORE_ID}, app-argument=${escapeAttr(deepLink)}">
<meta property="og:type" content="profile">
<meta property="og:title" content="${escapeAttr(title)}">
<meta property="og:description" content="${escapeAttr(description)}">
<meta property="og:image" content="${escapeAttr(OG_IMAGE_URL)}">
<meta property="og:url" content="${escapeAttr(canonicalUrl)}">
<meta property="og:site_name" content="AllergiApp">
<meta name="twitter:card" content="summary">
<meta name="twitter:title" content="${escapeAttr(title)}">
<meta name="twitter:description" content="${escapeAttr(description)}">
<meta name="twitter:image" content="${escapeAttr(OG_IMAGE_URL)}">
<link rel="icon" href="/images/happyplate.webp">
<link rel="stylesheet" href="/styles.css">
<link rel="stylesheet" href="/restaurant-page.css">
</head>
<body>
${renderSmartBannerAndroid(t, deepLink, 'profileSmartBannerSubtitle')}
${renderNav(locale)}
<main class="restaurant-page">
  <article class="restaurant-card">
    <div class="profile-identity">
      <img class="profile-avatar" src="/images/happyplate.webp" alt="" width="88" height="88">
      <div>
        <h1 class="restaurant-name">${escapeHtml(p.username || '')}</h1>
        ${memberSince ? `<div class="profile-member-since">${escapeHtml(t('profileMemberSince', { date: memberSince }))}</div>` : ''}
      </div>
    </div>
    <div class="profile-stats">
      <div class="profile-stat">
        <span class="profile-stat-number">${reviewCount}</span>
        <span class="profile-stat-label">${escapeHtml(t(reviewCount === 1 ? 'review' : 'reviews'))}</span>
      </div>
      ${countryCount > 0 ? `<div class="profile-stat">
        <span class="profile-stat-number">${countryCount}</span>
        <span class="profile-stat-label">${escapeHtml(t(countryCount === 1 ? 'profileCountry' : 'profileCountries'))}</span>
      </div>` : ''}
    </div>
  </article>

  <a class="cta-primary" href="${escapeAttr(deepLink)}" data-deep-link="${escapeAttr(deepLink)}" data-fallback-android="${escapeAttr(PLAY_STORE_URL)}" data-fallback-ios="${escapeAttr(APP_STORE_URL)}">
    ${escapeHtml(t('profileOpenInApp'))}
  </a>
  <p class="profile-follow-hint">${escapeHtml(t('profileFollowHint'))}</p>
</main>
${renderFooter(locale)}
${renderInlineScript()}
</body>
</html>`;
}

module.exports = { renderProfilePage };
