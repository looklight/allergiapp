// Parti condivise delle pagine pubbliche server-rendered (/r/[slug], /u/[username]):
// costanti store, nav, footer, smart banner Android e script deep-link.
// Estratte da render-restaurant.js quando è nata la pagina profilo.

const { escapeHtml, escapeAttr } = require('./render-helpers');

const SITE_ORIGIN = 'https://allergiapp.com';
const APP_STORE_ID = '6758859853';
const ANDROID_PACKAGE = 'com.allergiapp.mobile';
const APP_STORE_URL = `https://apps.apple.com/app/id${APP_STORE_ID}`;
const PLAY_STORE_URL = `https://play.google.com/store/apps/details?id=${ANDROID_PACKAGE}`;
const OG_IMAGE_URL = `${SITE_ORIGIN}/images/happyplate.webp`;

function renderNav(locale) {
  return `<header class="hero" style="min-height:auto;padding-bottom:0;">
  <nav class="nav">
    <div class="nav-content">
      <a href="/" class="logo">
        <img src="/images/happyplate.webp" alt="AllergiApp" class="logo-icon logo-nav">
        <span class="logo-text">AllergiApp</span>
      </a>
      <div class="nav-links">
        <a href="/download" class="cta-button">${locale === 'en' ? 'Download' : 'Scarica'}</a>
      </div>
    </div>
  </nav>
</header>`;
}

function renderFooter(locale) {
  const year = new Date().getFullYear();
  return `<footer class="restaurant-footer">
  <div class="footer-inner">
    <span>© ${year} AllergiApp</span>
    <a href="/privacy">${locale === 'en' ? 'Privacy' : 'Privacy'}</a>
    <a href="/terms">${locale === 'en' ? 'Terms' : 'Termini'}</a>
    <a href="/contacts">${locale === 'en' ? 'Contact' : 'Contatti'}</a>
  </div>
</footer>`;
}

function renderSmartBannerAndroid(t, deepLink, subtitleKey) {
  // Mostrato solo su Android (JS-detected). iOS usa il meta apple-itunes-app nativo di Safari.
  return `<div id="smart-banner" class="smart-banner" hidden>
  <img class="smart-banner-logo" src="/images/happyplate.webp" alt="">
  <div class="smart-banner-text">
    <span class="smart-banner-title">${escapeHtml(t('smartBannerTitle'))}</span>
    <span class="smart-banner-subtitle">${escapeHtml(t(subtitleKey))}</span>
  </div>
  <a class="smart-banner-action" href="${escapeAttr(deepLink)}" data-deep-link="${escapeAttr(deepLink)}" data-fallback-android="${escapeAttr(PLAY_STORE_URL)}" data-fallback-ios="${escapeAttr(APP_STORE_URL)}">${escapeHtml(t('smartBannerOpen'))}</a>
</div>`;
}

function renderInlineScript() {
  // Script inline minimale: detect platform, mostra banner Android, gestisce
  // deep link con fallback store dopo timeout (pattern standard senza dipendenze).
  return `<script>
(function() {
  var ua = navigator.userAgent || '';
  var isAndroid = /Android/i.test(ua);
  var isIOS = /iPhone|iPad|iPod/i.test(ua);

  // Mostra smart banner solo su Android (iOS ha banner Safari nativo via meta tag)
  if (isAndroid) {
    var banner = document.getElementById('smart-banner');
    if (banner) banner.hidden = false;
  }

  // Click handler per tutti i link con data-deep-link
  document.querySelectorAll('[data-deep-link]').forEach(function(el) {
    el.addEventListener('click', function(e) {
      var deep = el.getAttribute('data-deep-link');
      var fallbackAndroid = el.getAttribute('data-fallback-android');
      var fallbackIos = el.getAttribute('data-fallback-ios');
      var fallback = isIOS ? fallbackIos : fallbackAndroid;

      if (!deep || (!fallback && !isAndroid && !isIOS)) return; // desktop: lascia link normale

      e.preventDefault();
      var clickedAt = Date.now();
      var visibilityHidden = false;
      var onHide = function() { visibilityHidden = true; };
      document.addEventListener('visibilitychange', onHide);
      window.location.href = deep;
      setTimeout(function() {
        document.removeEventListener('visibilitychange', onHide);
        // Se la pagina e' rimasta visibile, l'app non si e' aperta -> store
        if (!visibilityHidden && Date.now() - clickedAt < 2500 && fallback) {
          window.location.href = fallback;
        }
      }, 1500);
    });
  });
})();
</script>`;
}

module.exports = {
  SITE_ORIGIN,
  APP_STORE_ID,
  APP_STORE_URL,
  PLAY_STORE_URL,
  OG_IMAGE_URL,
  renderNav,
  renderFooter,
  renderSmartBannerAndroid,
  renderInlineScript,
};
