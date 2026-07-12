// HTML rendering della pagina ristorante pubblica /r/[slug].
// Mirror della scheda app (RestaurantHeader + RestaurantDetailBody) versione read-only.
// Funzioni interattive (recensione, like, report, preferiti) sostituite da CTA "Apri in app".

const {
  escapeHtml,
  escapeAttr,
  formatRating,
  formatPriceRange,
  formatRelativeDate,
} = require('./render-helpers');
const { labelFor, cuisineLabel } = require('./labels');
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

function renderRestaurantPage(r, locale, t) {
  const deepLink = `allergiapp://r/${encodeURIComponent(r.slug)}`;
  const canonicalUrl = `${SITE_ORIGIN}/r/${encodeURIComponent(r.slug)}`;

  return `<!DOCTYPE html>
<html lang="${locale}">
<head>
${renderHead(r, locale, t, canonicalUrl)}
</head>
<body>
${renderSmartBannerAndroid(t, deepLink, 'smartBannerSubtitle')}
${renderNav(locale)}
<main class="restaurant-page">
  <article class="restaurant-card">
    ${renderHeader(r, locale, t)}
  </article>

  <a class="cta-primary" href="${escapeAttr(deepLink)}" data-deep-link="${escapeAttr(deepLink)}" data-fallback-android="${escapeAttr(PLAY_STORE_URL)}" data-fallback-ios="${escapeAttr(APP_STORE_URL)}">
    ${escapeHtml(t('openInApp'))}
  </a>

  ${renderMenuSection(r, locale, t)}

  ${renderReviewsSection(r, locale, t, deepLink)}
</main>
${renderFooter(locale)}
${renderInlineScript()}
</body>
</html>`;
}

function renderHead(r, locale, t, canonicalUrl) {
  const title = t('pageTitle', { name: r.name || '', city: r.city || '' });
  const description = t('metaDescription', {
    name: r.name || '',
    city: r.city || '',
    reviewCount: r.review_count || 0,
  });
  const deepLinkForBanner = `allergiapp://r/${encodeURIComponent(r.slug)}`;

  return `<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeAttr(description)}">
<link rel="canonical" href="${escapeAttr(canonicalUrl)}">
<meta name="apple-itunes-app" content="app-id=${APP_STORE_ID}, app-argument=${escapeAttr(deepLinkForBanner)}">
<meta property="og:type" content="restaurant">
<meta property="og:title" content="${escapeAttr(title)}">
<meta property="og:description" content="${escapeAttr(description)}">
<meta property="og:image" content="${escapeAttr(OG_IMAGE_URL)}">
<meta property="og:url" content="${escapeAttr(canonicalUrl)}">
<meta property="og:site_name" content="AllergiApp">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${escapeAttr(title)}">
<meta name="twitter:description" content="${escapeAttr(description)}">
<meta name="twitter:image" content="${escapeAttr(OG_IMAGE_URL)}">
<link rel="icon" href="/images/happyplate.webp">
<link rel="stylesheet" href="/styles.css">
<link rel="stylesheet" href="/restaurant-page.css">`;
}

function renderHeader(r, locale, t) {
  const hasReviews = (r.review_count || 0) > 0;
  const mapsUrl = buildMapsUrl(r);
  const priceStr = formatPriceRange(r.price_range);

  return `
<div class="restaurant-top-row">
  <h1 class="restaurant-name">${escapeHtml(r.name || '')}</h1>
  ${mapsUrl ? `<a class="maps-btn" href="${escapeAttr(mapsUrl)}" target="_blank" rel="noopener" aria-label="${escapeAttr(t('googleMaps'))}">
    ${svgGoogleMaps()}
    <span>${escapeHtml(t('googleMaps'))}</span>
  </a>` : ''}
</div>

${hasReviews
  ? `<div class="rating-row">
       ${renderStars(r.average_rating)}
       <span class="rating-value">${formatRating(r.average_rating)}</span>
       <span class="rating-count">· ${r.review_count} ${escapeHtml(t(r.review_count === 1 ? 'review' : 'reviews'))}</span>
     </div>`
  : `<div class="rating-row no-reviews">${escapeHtml(t('noReviews'))}</div>`
}

${r.address ? `<div class="info-row">
  ${svgMapMarker()}
  <span>${escapeHtml(r.address)}</span>
</div>` : ''}

${priceStr ? `<div class="info-row">
  ${svgEuro()}
  <span>${escapeHtml(priceStr)}</span>
</div>` : ''}

${(r.cuisine_votes && r.cuisine_votes.length > 0) ? `<div class="cuisine-tags">
  ${r.cuisine_votes.map(v => `<span class="cuisine-tag">
    <span class="cuisine-label">${escapeHtml(cuisineLabel(v.cuisine_id, locale))}</span>
    <span class="cuisine-count">${v.vote_count}</span>
  </span>`).join('')}
</div>` : ''}
`;
}

function renderMenuSection(r, locale, t) {
  const hasMenuUrl = !!r.menu_url;
  const photos = Array.isArray(r.menu_photos) ? r.menu_photos : [];
  if (!hasMenuUrl && photos.length === 0) return '';

  return `<section class="menu-section">
  <h2 class="section-title">${escapeHtml(t('menuTitle'))}</h2>
  ${hasMenuUrl ? `<a class="menu-link" href="${escapeAttr(r.menu_url)}" target="_blank" rel="noopener">${escapeHtml(r.menu_url)}</a>` : ''}
  ${photos.length > 0 ? `<div class="menu-photos-grid">
    ${photos.map(p => `<img loading="lazy" src="${escapeAttr(p.thumbnail_url || p.image_url)}" alt="${escapeAttr(t('menuPhotosTitle'))}">`).join('')}
  </div>` : ''}
</section>`;
}

function renderReviewsSection(r, locale, t, deepLink) {
  const reviews = Array.isArray(r.reviews) ? r.reviews : [];
  if (reviews.length === 0) return '';

  return `<section class="reviews-section">
  <h2 class="section-title">${escapeHtml(t('reviewsTitle'))}</h2>
  <div class="reviews-list">
    ${reviews.map(rv => renderReview(rv, locale, t)).join('')}
  </div>
  <a class="cta-secondary" href="${escapeAttr(deepLink)}" data-deep-link="${escapeAttr(deepLink)}" data-fallback-android="${escapeAttr(PLAY_STORE_URL)}" data-fallback-ios="${escapeAttr(APP_STORE_URL)}">
    ${escapeHtml(t('openAppToReview'))}
  </a>
</section>`;
}

function renderReview(rv, locale, t) {
  const authorName = rv.user_is_inactive
    ? t('inactiveUser')
    : rv.user_is_anonymous
      ? t('anonymousUser')
      : (rv.user_username || t('anonymousUser'));

  const snapshots = [
    ...(rv.dietary_snapshot || []),
    ...(rv.allergens_snapshot || []),
  ];

  const photos = Array.isArray(rv.photos) ? rv.photos : [];

  return `<article class="review-card">
  <header class="review-header">
    <div class="review-author">
      <span class="review-author-name">${escapeHtml(authorName)}</span>
      <span class="review-date">${escapeHtml(formatRelativeDate(rv.created_at, locale))}</span>
    </div>
    ${renderStars(rv.rating)}
  </header>
  ${rv.comment ? `<p class="review-text">${escapeHtml(rv.comment)}</p>` : ''}
  ${snapshots.length > 0 ? `<div class="review-snapshots">
    ${snapshots.map(code => `<span class="snapshot-chip">${escapeHtml(labelFor(code, locale))}</span>`).join('')}
  </div>` : ''}
  ${photos.length > 0 ? `<div class="review-photos">
    ${photos.map(p => `<img loading="lazy" src="${escapeAttr(p.thumbnail_url || p.url)}" alt="">`).join('')}
  </div>` : ''}
  ${(rv.likes_count || 0) > 0 ? `<div class="review-likes">
    ${svgThumbUp()}
    <span>${rv.likes_count}</span>
  </div>` : ''}
</article>`;
}

// ── Helpers ──────────────────────────────────────────────────────────────

function buildMapsUrl(r) {
  if (r.google_place_id) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(r.name || '')}&query_place_id=${encodeURIComponent(r.google_place_id)}`;
  }
  if (r.address) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(r.address)}`;
  }
  return null;
}

function renderStars(rating) {
  const r = Number(rating) || 0;
  const full = Math.floor(r);
  const half = (r - full) >= 0.5 ? 1 : 0;
  const empty = 5 - full - half;
  let stars = '';
  for (let i = 0; i < full; i++) stars += svgStarFilled();
  for (let i = 0; i < half; i++) stars += svgStarHalf();
  for (let i = 0; i < empty; i++) stars += svgStarEmpty();
  return `<span class="stars" aria-label="${r}/5">${stars}</span>`;
}

// ── SVG icons (inline, no external deps, accessible) ─────────────────────

function svgStarFilled() {
  return '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path fill="#f5b400" d="M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>';
}
function svgStarHalf() {
  return '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path fill="#f5b400" d="M22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27V2z"/><path fill="#e0e0e0" d="M12 2v15.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61z"/></svg>';
}
function svgStarEmpty() {
  return '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path fill="#e0e0e0" d="M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>';
}
function svgMapMarker() {
  return '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path fill="currentColor" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 110-5 2.5 2.5 0 010 5z"/></svg>';
}
function svgEuro() {
  return '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path fill="currentColor" d="M15 18.5c-2.51 0-4.68-1.42-5.76-3.5H15v-2H8.58c-.05-.33-.08-.66-.08-1s.03-.67.08-1H15V9H9.24C10.32 6.92 12.5 5.5 15 5.5c1.61 0 3.09.59 4.23 1.57L21 5.3A9.453 9.453 0 0015 3c-3.92 0-7.24 2.51-8.48 6H3v2h3.06c-.04.33-.06.66-.06 1s.02.67.06 1H3v2h3.52c1.24 3.49 4.56 6 8.48 6 2.31 0 4.41-.87 6-2.3l-1.78-1.77c-1.13.98-2.6 1.57-4.22 1.57z"/></svg>';
}
function svgGoogleMaps() {
  return '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="#34a853" d="M12 2C7.59 2 4 5.59 4 10c0 6 8 12 8 12s8-6 8-12c0-4.41-3.59-8-8-8z"/><circle cx="12" cy="10" r="3" fill="#fff"/></svg>';
}
function svgThumbUp() {
  return '<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path fill="currentColor" d="M9 21h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.59 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2zM1 9h4v12H1z"/></svg>';
}

module.exports = { renderRestaurantPage };
