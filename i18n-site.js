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
  const savedLang = localStorage.getItem(LANG_STORAGE_KEY);
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

  // Salva preferenza
  localStorage.setItem(LANG_STORAGE_KEY, newLang);

  // Aggiorna URL senza ricaricare pagina
  const url = new URL(window.location);
  url.searchParams.set('lang', newLang);
  window.history.replaceState({}, '', url);

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
    } else {
      // Altrimenti traduci il contenuto testuale
      // Preserva HTML interno se presente (es. <br>)
      if (element.innerHTML.includes('<')) {
        // Ha HTML interno, preserva la struttura
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = element.innerHTML;
        // Sostituisci solo il testo, non i tag
        element.childNodes.forEach(node => {
          if (node.nodeType === Node.TEXT_NODE) {
            node.textContent = translation;
          }
        });
      } else {
        // Testo semplice
        element.textContent = translation;
      }
    }
  });
}

/**
 * Aggiorna i meta tag per SEO
 */
function updateMetaTags(lang) {
  const metas = {
    description: getTranslation('meta.description', lang),
    keywords: getTranslation('meta.keywords', lang),
    ogTitle: getTranslation('meta.ogTitle', lang),
    ogDescription: getTranslation('meta.ogDescription', lang),
    title: getTranslation('meta.title', lang)
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
