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
    profilePageTitle: '{username} | AllergiApp',
    profileMetaDescription: 'Il profilo di {username} su AllergiApp, l\'app per mangiare senza pensieri con allergie e intolleranze.',
    profileMemberSince: 'Su AllergiApp da {date}',
    profileCountry: 'paese',
    profileCountries: 'paesi',
    profileOpenInApp: 'Apri il profilo in AllergiApp',
    profileFollowHint: 'Scarica AllergiApp per seguire questo profilo e vedere le sue recensioni.',
    profileSmartBannerSubtitle: 'Apri questo profilo in app',
    profileNotFoundTitle: 'Profilo non disponibile',
    profileNotFoundBody: 'Il profilo che cercavi non è disponibile su AllergiApp.',
    profileNotFoundCta: 'Scarica AllergiApp',

    // ── Menù al tavolo (/menu/[slug]) ──────────────────────────────
    // Il menù digitale che il cliente apre col QR. Da qui in giù non si parla
    // mai a nome di AllergiApp tranne che accanto al filtro: al tavolo è il
    // ristorante che porge il suo menù (DIGITAL_MENU.md, Tema 18).
    menuPageTitle: '{name} · Menù | AllergiApp',
    menuMetaDescription: 'Il menù di {name}, con il filtro per allergeni e intolleranze.',
    menuFilterHint: 'Filtra per le tue esigenze',
    menuFilterButton: 'Filtri',
    menuFilterAll: 'Tutte le esigenze',
    menuFilterAllergensTitle: 'Allergeni',
    menuFilterDietsTitle: 'Esigenze',
    menuFilterReset: 'Azzera',
    menuFilterDeclared: 'Allergeni e ingredienti dichiarati dal ristorante.',
    menuFilterSummary: '{matching} di {total} adatti',
    menuFilterSummaryOne: '{matching} di {total} adatto',
    menuWithout: 'Senza',
    menuContains: 'Contiene:',
    menuExcludedContains: 'Contiene {list}',
    menuExcludedNotFor: 'Non indicato per {list}',
    menuDetailAllergens: 'Allergeni dichiarati',
    menuDetailNoAllergens: 'Nessun allergene dichiarato.',
    menuDetailDiets: 'Indicato per',
    menuDetailPhoto: 'La foto è del ristorante e può differire dal piatto servito.',
    menuDetailOpen: 'Apri il dettaglio di {dish}',
    menuDetailPrev: 'Piatto precedente',
    menuDetailNext: 'Piatto successivo',
    menuClose: 'Chiudi',
    menuEmpty: 'Questo menù non ha ancora piatti.',
    menuNotFoundTitle: 'Menù non disponibile',
    menuNotFoundBody: 'Il menù che cercavi non è al momento disponibile. Chiedi al personale del locale.',
    menuLanguage: 'Lingua',
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
    profilePageTitle: '{username} | AllergiApp',
    profileMetaDescription: '{username}\'s profile on AllergiApp, the app to eat without worries with allergies and intolerances.',
    profileMemberSince: 'On AllergiApp since {date}',
    profileCountry: 'country',
    profileCountries: 'countries',
    profileOpenInApp: 'Open the profile in AllergiApp',
    profileFollowHint: 'Download AllergiApp to follow this profile and see their reviews.',
    profileSmartBannerSubtitle: 'Open this profile in the app',
    profileNotFoundTitle: 'Profile unavailable',
    profileNotFoundBody: 'The profile you were looking for is not available on AllergiApp.',
    profileNotFoundCta: 'Download AllergiApp',

    // ── Table menu (/menu/[slug]) ─────────────────────────────────
    menuPageTitle: '{name} · Menu | AllergiApp',
    menuMetaDescription: 'The menu of {name}, with a filter for allergens and dietary needs.',
    menuFilterHint: 'Filter by your needs',
    menuFilterButton: 'Filters',
    menuFilterAll: 'All needs',
    menuFilterAllergensTitle: 'Allergens',
    menuFilterDietsTitle: 'Dietary needs',
    menuFilterReset: 'Clear',
    menuFilterDeclared: 'Allergens and ingredients declared by the restaurant.',
    menuFilterSummary: '{matching} of {total} suitable',
    menuFilterSummaryOne: '{matching} of {total} suitable',
    menuWithout: 'Without',
    menuContains: 'Contains:',
    menuExcludedContains: 'Contains {list}',
    menuExcludedNotFor: 'Not marked as {list}',
    menuDetailAllergens: 'Declared allergens',
    menuDetailNoAllergens: 'No declared allergens.',
    menuDetailDiets: 'Suitable for',
    menuDetailPhoto: 'The photo is the restaurant\'s and may differ from the dish served.',
    menuDetailOpen: 'Open details for {dish}',
    menuDetailPrev: 'Previous dish',
    menuDetailNext: 'Next dish',
    menuClose: 'Close',
    menuEmpty: 'This menu has no dishes yet.',
    menuNotFoundTitle: 'Menu not available',
    menuNotFoundBody: 'The menu you were looking for is not available right now. Ask the staff at the venue.',
    menuLanguage: 'Language',
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
