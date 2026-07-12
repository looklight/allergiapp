// HTML rendering della pagina profilo pubblica /u/[username].
// Volutamente minimale: identità (iniziale + username), da quando è membro,
// attività (recensioni, paesi) e CTA "Apri in app". NOINDEX: le pagine
// profilo non devono finire sui motori di ricerca (pubbliche in app ≠
// indicizzate sul web); l'header X-Robots-Tag lo ribadisce lato function.

const { escapeHtml, escapeAttr } = require('./render-helpers');
const {
  SITE_ORIGIN,
  APP_STORE_ID,
  APP_STORE_URL,
  PLAY_STORE_URL,
  renderNav,
  renderFooter,
  renderSmartBannerAndroid,
  renderInlineScript,
} = require('./render-shell');

function renderProfilePage(p, locale, t) {
  const deepLink = `allergiapp://u/${encodeURIComponent(p.username)}`;
  const canonicalUrl = `${SITE_ORIGIN}/u/${encodeURIComponent(p.username)}`;
  const initial = (p.username || '?').charAt(0).toUpperCase();
  const memberSince = p.created_at
    ? new Date(p.created_at).toLocaleDateString(locale, { month: 'long', year: 'numeric' })
    : '';
  const reviewCount = Number(p.review_count) || 0;
  const countryCount = Number(p.country_count) || 0;

  const title = t('profilePageTitle', { username: p.username || '' });

  return `<!DOCTYPE html>
<html lang="${locale}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<meta name="robots" content="noindex, nofollow">
<meta name="description" content="${escapeAttr(t('profileMetaDescription', { username: p.username || '' }))}">
<link rel="canonical" href="${escapeAttr(canonicalUrl)}">
<meta name="apple-itunes-app" content="app-id=${APP_STORE_ID}, app-argument=${escapeAttr(deepLink)}">
<meta property="og:type" content="profile">
<meta property="og:title" content="${escapeAttr(title)}">
<meta property="og:site_name" content="AllergiApp">
<link rel="icon" href="/images/happyplate.webp">
<link rel="stylesheet" href="/styles.css">
<link rel="stylesheet" href="/restaurant-page.css">
<style>
.profile-identity { display: flex; align-items: center; gap: 16px; }
.profile-initial {
  width: 72px; height: 72px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  background: #E8F5E9; color: #2E7D32;
  font-size: 32px; font-weight: 700; flex-shrink: 0;
}
.profile-member-since { color: #757575; font-size: 14px; margin-top: 2px; }
.profile-stats { display: flex; gap: 28px; margin-top: 20px; }
.profile-stat { display: flex; flex-direction: column; align-items: center; }
.profile-stat-number { font-size: 20px; font-weight: 700; }
.profile-stat-label { font-size: 13px; color: #757575; margin-top: 2px; }
</style>
</head>
<body>
${renderSmartBannerAndroid(t, deepLink, 'profileSmartBannerSubtitle')}
${renderNav(locale)}
<main class="restaurant-page">
  <article class="restaurant-card">
    <div class="profile-identity">
      <div class="profile-initial" aria-hidden="true">${escapeHtml(initial)}</div>
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
  <p class="profile-member-since" style="text-align:center;">${escapeHtml(t('profileFollowHint'))}</p>
</main>
${renderFooter(locale)}
${renderInlineScript()}
</body>
</html>`;
}

module.exports = { renderProfilePage };
