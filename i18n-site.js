/**
 * Sistema i18n per AllergiApp Landing Page
 * Gestisce traduzione automatica IT/EN con rilevamento lingua browser
 */

// Lingue supportate
const SUPPORTED_LANGUAGES = ['it', 'en'];
const DEFAULT_LANGUAGE = 'it';

// Storage key per salvare preferenza
const LANG_STORAGE_KEY = 'allergiapp_preferred_language';

// Traduzioni (caricate da translations.json)
let translations = {};

/**
 * Rileva la lingua da usare
 * Priorità: 1. URL param, 2. localStorage, 3. Browser, 4. Default
 */
function detectLanguage() {
  // 1. Query parameter (es. ?lang=en)
  const urlParams = new URLSearchParams(window.location.search);
  const langParam = urlParams.get('lang');
  if (langParam && SUPPORTED_LANGUAGES.includes(langParam)) {
    return langParam;
  }

  // 2. Preferenza salvata
  // ⚠️ Dentro un try: con la memoria del browser bloccata (navigazione
  // privata su certi browser, dati del sito negati) leggere non restituisce
  // null, LANCIA — e senza il try si fermava tutto lo script, pagina senza
  // traduzioni. Il portale e il menù al tavolo si proteggono già così.
  let savedLang = null;
  try {
    savedLang = localStorage.getItem(LANG_STORAGE_KEY);
  } catch (e) {
    /* memoria negata: si prosegue con la lingua del browser */
  }
  if (savedLang && SUPPORTED_LANGUAGES.includes(savedLang)) {
    return savedLang;
  }

  // 3. Lingua del browser
  const browserLang = navigator.language.split('-')[0];
  if (SUPPORTED_LANGUAGES.includes(browserLang)) {
    return browserLang;
  }

  // 4. Default
  return DEFAULT_LANGUAGE;
}

/**
 * Ottiene una traduzione tramite percorso (es. "hero.title")
 */
function getTranslation(path, lang) {
  const keys = path.split('.');
  let value = translations[lang];

  for (const key of keys) {
    if (value && typeof value === 'object') {
      value = value[key];
    } else {
      return path; // Fallback: ritorna la chiave se non trova la traduzione
    }
  }

  return value || path;
}

/**
 * Cambia lingua del sito
 */
function changeLanguage(newLang) {
  if (!SUPPORTED_LANGUAGES.includes(newLang)) {
    console.error(`Lingua non supportata: ${newLang}`);
    return;
  }

  // Salva preferenza (con la memoria negata, vale per questa visita e basta)
  try {
    localStorage.setItem(LANG_STORAGE_KEY, newLang);
  } catch (e) {
    /* memoria negata */
  }

  // LA LINGUA NON SI SCRIVE PIÙ NELL'INDIRIZZO (scelta dell'utente, 19/09):
  // a chi cambia lingua la ricorda già la memoria del browser, e un
  // «?lang=en» attaccato a ogni pagina sporcava l'indirizzo.
  // ⚠️ Il parametro però RESTA VALIDO in entrata: è l'indirizzo della
  // versione inglese che le pagine dichiarano ai motori di ricerca (i
  // <link rel="alternate" hreflang="en"> in testa), e detectLanguage lo
  // rispetta al punto 1. Qui lo si toglie solo dalla barra, così non resta
  // attaccato dopo che si è cambiata lingua a mano.
  const url = new URL(window.location);
  if (url.searchParams.has('lang')) {
    url.searchParams.delete('lang');
    window.history.replaceState({}, '', url);
  }

  // Applica traduzioni
  applyTranslations(newLang);

  // Aggiorna attributo lang dell'HTML
  document.documentElement.lang = newLang;

  // Aggiorna meta tags
  updateMetaTags(newLang);

  // Aggiorna stato del language selector
  updateLanguageSelector(newLang);
}

/**
 * Applica le traduzioni a tutti gli elementi [data-i18n]
 */
function applyTranslations(lang) {
  document.querySelectorAll('[data-i18n]').forEach(element => {
    const key = element.dataset.i18n;
    const translation = getTranslation(key, lang);

    // Se l'elemento ha data-i18n-attr, traduci l'attributo specificato
    if (element.dataset.i18nAttr) {
      element.setAttribute(element.dataset.i18nAttr, translation);
    } else if (element.dataset.i18nHtml !== undefined) {
      element.innerHTML = translation;
    } else {
      element.textContent = translation;
    }
  });
}

/**
 * Aggiorna i meta tag per SEO
 */
function updateMetaTags(lang) {
  // I meta si traducono SOLO se la pagina dichiara le sue chiavi con
  // data-i18n-meta sul tag <html> (la homepage dice "meta", /menu dice
  // "menuLandingMeta"). Prima si riscrivevano sempre con quelli della
  // homepage: ogni pagina del sito, appena applicava le traduzioni, si
  // ritrovava titolo e descrizione di un'altra pagina. Senza l'attributo
  // adesso restano quelli scritti nel file, che sono giusti.
  const ns = document.documentElement.dataset.i18nMeta;
  if (!ns) return;
  const metas = {
    description: getTranslation(ns + '.description', lang),
    keywords: getTranslation(ns + '.keywords', lang),
    ogTitle: getTranslation(ns + '.ogTitle', lang),
    ogDescription: getTranslation(ns + '.ogDescription', lang),
    title: getTranslation(ns + '.title', lang)
  };

  // Title
  document.title = metas.title;

  // Meta description
  const metaDescription = document.querySelector('meta[name="description"]');
  if (metaDescription) metaDescription.content = metas.description;

  // Meta keywords
  const metaKeywords = document.querySelector('meta[name="keywords"]');
  if (metaKeywords) metaKeywords.content = metas.keywords;

  // OG tags
  const ogTitle = document.querySelector('meta[property="og:title"]');
  if (ogTitle) ogTitle.content = metas.ogTitle;

  const ogDescription = document.querySelector('meta[property="og:description"]');
  if (ogDescription) ogDescription.content = metas.ogDescription;
}

/**
 * Aggiorna stato visuale del language selector
 */
function updateLanguageSelector(lang) {
  document.querySelectorAll('.lang-selector a').forEach(link => {
    const linkLang = link.dataset.lang;
    if (linkLang === lang) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });
}

/**
 * Carica le traduzioni e inizializza il sistema
 */
async function initI18n() {
  try {
    // Carica translations.json
    const response = await fetch('./translations.json');
    if (!response.ok) {
      throw new Error('Failed to load translations');
    }
    translations = await response.json();

    // Rileva lingua
    const currentLang = detectLanguage();

    // Applica traduzioni
    changeLanguage(currentLang);

    // Setup event listeners per language selector
    document.querySelectorAll('.lang-selector a').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const newLang = link.dataset.lang;
        changeLanguage(newLang);
      });
    });

    console.log(`✅ i18n initialized - Current language: ${currentLang}`);
  } catch (error) {
    console.error('❌ Failed to initialize i18n:', error);
    // Fallback: continua con testo hardcoded nell'HTML
  }
}

// Inizializza quando il DOM è pronto
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initI18n);
} else {
  initI18n();
}

// Esporta per uso globale
window.allergiAppI18n = {
  changeLanguage,
  getCurrentLanguage: () => detectLanguage(),
  getTranslation: (key) => getTranslation(key, detectLanguage())
};
