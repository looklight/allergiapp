// Minimal i18n: IT (default) and EN. Locale detected from Accept-Language header.
// Espandere DICTIONARIES quando si aggiungono nuove stringhe nella pagina.

const DICTIONARIES = {
  it: {
    pageTitle: '{name} · {city} | AllergiApp',
    metaDescription: '{name} a {city}. {reviewCount} recensioni su AllergiApp, l\'app per mangiare senza pensieri con allergie e intolleranze.',
    reviews: 'recensioni',
    review: 'recensione',
    noReviews: 'Ancora nessuna recensione',
    ratingOf: 'su',
    googleMaps: 'Vai su Google Maps',
    openInApp: 'Apri in AllergiApp',
    downloadApp: 'Scarica AllergiApp',
    notFoundTitle: 'Ristorante non disponibile',
    notFoundBody: 'Il ristorante che cercavi non è più disponibile su AllergiApp.',
    notFoundCta: 'Scarica AllergiApp per scoprire altri ristoranti',
    errorTitle: 'Si è verificato un errore',
    errorBody: 'Riprova tra qualche istante.',
    menuTitle: 'Menù',
    menuPhotosTitle: 'Foto del menù',
    reviewsTitle: 'Recensioni',
    openAppToReview: 'Apri l\'app per lasciare una recensione',
    inactiveUser: 'Utente non più attivo',
    anonymousUser: 'Utente anonimo',
    smartBannerTitle: 'AllergiApp',
    smartBannerSubtitle: 'Apri questo ristorante in app',
    smartBannerOpen: 'Apri',
    smartBannerDownload: 'Scarica',
  },
  en: {
    pageTitle: '{name} · {city} | AllergiApp',
    metaDescription: '{name} in {city}. {reviewCount} reviews on AllergiApp, the app to eat without worries with allergies and intolerances.',
    reviews: 'reviews',
    review: 'review',
    noReviews: 'No reviews yet',
    ratingOf: 'of',
    googleMaps: 'Open in Google Maps',
    openInApp: 'Open in AllergiApp',
    downloadApp: 'Download AllergiApp',
    notFoundTitle: 'Restaurant unavailable',
    notFoundBody: 'The restaurant you were looking for is no longer available on AllergiApp.',
    notFoundCta: 'Download AllergiApp to discover other restaurants',
    errorTitle: 'Something went wrong',
    errorBody: 'Please try again in a moment.',
    menuTitle: 'Menu',
    menuPhotosTitle: 'Menu photos',
    reviewsTitle: 'Reviews',
    openAppToReview: 'Open the app to leave a review',
    inactiveUser: 'Inactive user',
    anonymousUser: 'Anonymous user',
    smartBannerTitle: 'AllergiApp',
    smartBannerSubtitle: 'Open this restaurant in the app',
    smartBannerOpen: 'Open',
    smartBannerDownload: 'Download',
  },
};

const SUPPORTED = ['it', 'en'];
const DEFAULT_LOCALE = 'it';

function detectLocale(acceptLanguage) {
  if (!acceptLanguage) return DEFAULT_LOCALE;
  const langs = acceptLanguage
    .split(',')
    .map(s => s.trim().split(';')[0].slice(0, 2).toLowerCase());
  for (const lang of langs) {
    if (SUPPORTED.includes(lang)) return lang;
  }
  return DEFAULT_LOCALE;
}

function createT(locale) {
  const dict = DICTIONARIES[locale] || DICTIONARIES[DEFAULT_LOCALE];
  return function t(key, params) {
    let str = dict[key] || key;
    if (params) {
      for (const k of Object.keys(params)) {
        str = str.replaceAll(`{${k}}`, String(params[k] ?? ''));
      }
    }
    return str;
  };
}

module.exports = { detectLocale, createT, SUPPORTED, DEFAULT_LOCALE };
