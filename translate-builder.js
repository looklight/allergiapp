/**
 * Script per generare traduzioni automatiche IT → EN
 * Usa la stessa API MyMemory già usata nell'app mobile
 *
 * Esegui con: node translate-builder.js
 */

const fs = require('fs');

// Testi originali in italiano estratti da index.html
const sourceTexts = {
  // Meta tags
  meta: {
    description: "AllergiApp - Comunica le tue allergie in qualsiasi lingua. L'app essenziale per viaggiare sicuri con allergie alimentari.",
    keywords: "allergie, allergie alimentari, viaggi, traduzione allergie, sicurezza alimentare",
    ogTitle: "AllergiApp - Allergie senza confini",
    ogDescription: "Comunica le tue allergie in qualsiasi lingua quando viaggi",
    title: "AllergiApp - Comunica le tue allergie in qualsiasi lingua"
  },

  // Navigation
  nav: {
    features: "Funzionalità",
    howItWorks: "Come funziona",
    download: "Scarica"
  },

  // Hero Section
  hero: {
    title1: "Viaggia sereno.",
    title2: "Le tue allergie, in ogni lingua.",
    subtitle1: "Comunica le tue allergie alimentari in più di 60 lingue.",
    subtitle2: "Mostra una card chiara e comprensibile a camerieri e chef in tutto il mondo.",
    cta: "Scopri come funziona",
    stat1Number: "60+",
    stat1Label: "Lingue disponibili",
    stat2Number: "100%",
    stat2Label: "Gratuita"
  },

  // Problem Section
  problem: {
    title: "Hai mai provato questa situazione?",
    timeline1Title: "Sei all'estero, al ristorante",
    timeline1Text: "Hai timore di non riuscire a comunicare le tue allergie nella lingua locale",
    timeline2Title: "Barriera linguistica",
    timeline2Text: "Il cameriere non parla la tua lingua e tu non parli la sua",
    timeline3Title: "Usi il traduttore",
    timeline3Text: "Ma spesso rischi fraintendimenti e non sempre funziona offline",
    timeline4Title: "Rischio per la salute",
    timeline4Text: "Un malinteso potrebbe portare a una reazione allergica (e rovinarti il viaggio)"
  },

  // Features Section
  features: {
    title: "La soluzione è semplice",
    subtitle: "AllergiApp ti permette di comunicare con chiarezza, sempre"
  },

  // How It Works
  howItWorks: {
    title: "Come funziona",
    step1Title: "Seleziona le tue allergie",
    step1Text: "Scegli una o più allergie dalla lista completa degli allergeni",
    step2Title: "Scegli la lingua",
    step2Text: "Imposta la lingua del paese in cui ti trovi o scaricala per usarla offline",
    step3Title: "Mostra la card",
    step3Text: "Presenta il tuo telefono al personale del ristorante con una card chiara e professionale",

    highlight1Title: "Card universale tradotta",
    highlight1Text: "Mostra una card visiva chiara con emoji, nomi e esempi di alimenti",
    highlight2Title: "Veloce e intuitiva",
    highlight2Text: "Mostra le tue allergie in secondi, anche in situazioni di emergenza",
    highlight3Title: "Privacy totale",
    highlight3Text: "I tuoi dati rimangono sul tuo dispositivo. Nessuna registrazione richiesta",

    ctaTitle: "Provaci anche tu",
    ctaButton: "Scarica gratis"
  },

  // Story Section
  story: {
    title: "Perché è gratuita?",
    intro: "Questa app nasce da un'esperienza personale. Come persona con allergie alimentari, ho sempre amato viaggiare e scoprire nuove culture attraverso il cibo.",
    paragraph1: "Durante i miei viaggi, ho imparato che la barriera linguistica può trasformare un'esperienza culinaria in un momento di ansia. Ho iniziato a scrivere a mano piccole card con le mie allergie, poi a stamparle, e ho scoperto quanto fossero preziose per comunicare con camerieri e chef che non parlavano la mia lingua.",
    paragraph2: "Un gesto semplice - mostrare una card - cambiava tutto.",
    paragraph2b: "Il personale del ristorante apprezzava la chiarezza, io mi sentivo più sicura, e finalmente potevo godermi la cucina locale senza paura.",
    paragraph3: "Ho creato AllergiApp per portare questa soluzione a chiunque ne abbia bisogno. È gratuita perché",
    paragraph3Strong: "viaggiare e gustare il cibo del mondo dovrebbe essere un diritto per tutti",
    paragraph3End: "non un privilegio. Se questa app può aiutare anche solo una persona a godersi un pasto in più durante un viaggio, avrà raggiunto il suo scopo.",
    paragraph4: "Se apprezzi il progetto e vuoi supportarlo, ogni contributo aiuta a coprire i costi di sviluppo e mantenimento, e a mantenerla gratuita e migliorarla nel tempo. ❤️",
    quoteText: "La mia missione? Rendere il mondo più accessibile e aiutare le persone con allergie a esplorarlo anche attraverso il cibo, in sicurezza e con gioia.",
    quoteAuthor: "— Marta Di Muro",
    supportTitle: "Supporta il progetto",
    supportText: "Gratuita per sempre. Puoi contribuire con una donazione per aiutare lo sviluppo e il mantenimento"
  },

  // Allergens
  allergens: {
    title: "Allergeni supportati",
    peanuts: "Arachidi",
    nuts: "Frutta a guscio",
    dairy: "Latticini",
    eggs: "Uova",
    fish: "Pesce",
    crustaceans: "Crostacei",
    mollusks: "Molluschi",
    gluten: "Glutine",
    soy: "Soia",
    sesame: "Sesamo",
    mustard: "Senape",
    celery: "Sedano",
    sulfites: "Solfiti",
    lupins: "Lupini"
  },

  // Download Section
  downloadSection: {
    title: "Scarica AllergiApp",
    subtitle: "Disponibile gratuitamente su App Store e Google Play",
    backToTop: "Torna su"
  },

  // Footer
  footer: {
    tagline: "Viaggia sicuro, comunica ovunque.",
    privacy: "Privacy Policy",
    terms: "Termini di Servizio",
    copyright: "2026 AllergiApp. Tutti i diritti riservati."
  }
};

// Configurazione API
const MYMEMORY_API = 'https://api.mymemory.translated.net/get';
const REQUEST_TIMEOUT_MS = 30000;
const RATE_LIMIT_DELAY_MS = 350; // Un po' più conservativo per evitare rate limit

// Funzione per fetch con timeout
function fetchWithTimeout(url, options, timeoutMs = REQUEST_TIMEOUT_MS) {
  return Promise.race([
    fetch(url, options),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Request timeout')), timeoutMs)
    )
  ]);
}

// Traduce un singolo testo
async function translateText(text, sourceLang, targetLang) {
  const params = new URLSearchParams({
    q: text,
    langpair: `${sourceLang}|${targetLang}`,
  });

  try {
    const response = await fetchWithTimeout(`${MYMEMORY_API}?${params.toString()}`, {
      method: 'GET',
    });

    if (!response.ok) {
      throw new Error(`Translation failed: ${response.status}`);
    }

    const data = await response.json();

    if (!data.responseData?.translatedText) {
      throw new Error('Invalid API response: missing translatedText');
    }

    if (data.responseStatus === 403) {
      throw new Error('Translation quota exceeded');
    }

    return data.responseData.translatedText;
  } catch (error) {
    console.error(`❌ Errore traducendo "${text.substring(0, 50)}...": ${error.message}`);
    return text; // Fallback: ritorna testo originale
  }
}

// Traduce ricorsivamente un oggetto
async function translateObject(obj, sourceLang, targetLang, depth = 0) {
  const result = {};
  const keys = Object.keys(obj);

  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    const value = obj[key];

    if (typeof value === 'object' && value !== null) {
      // Ricorsione per oggetti annidati
      console.log(`${'  '.repeat(depth)}📁 Sezione: ${key}`);
      result[key] = await translateObject(value, sourceLang, targetLang, depth + 1);
    } else {
      // Traduci la stringa
      process.stdout.write(`${'  '.repeat(depth)}⏳ ${key}: `);
      const translated = await translateText(value, sourceLang, targetLang);
      console.log(`✅`);
      result[key] = translated;

      // Rate limiting
      if (i < keys.length - 1) {
        await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY_MS));
      }
    }
  }

  return result;
}

// Funzione principale
async function buildTranslations() {
  console.log('🌍 AllergiApp Translation Builder\n');
  console.log('📝 Testi da tradurre:', countTexts(sourceTexts));
  console.log('⏱️  Tempo stimato:', Math.ceil(countTexts(sourceTexts) * 0.4), 'secondi\n');

  const translations = {
    it: sourceTexts
  };

  console.log('🇬🇧 Inizio traduzione IT → EN...\n');

  try {
    translations.en = await translateObject(sourceTexts, 'it', 'en');

    // Salva il file
    const outputPath = './translations.json';
    fs.writeFileSync(outputPath, JSON.stringify(translations, null, 2), 'utf-8');

    console.log('\n✅ Traduzioni completate!');
    console.log(`📄 File salvato: ${outputPath}`);
    console.log('\n💡 Prossimi passi:');
    console.log('   1. Apri translations.json e rivedi le traduzioni');
    console.log('   2. Correggi eventuali errori o testi poco naturali');
    console.log('   3. Salva e chiudi il file');
    console.log('\n👉 Ora implementerò il sistema i18n per il sito');

  } catch (error) {
    console.error('\n❌ Errore durante la traduzione:', error.message);
    process.exit(1);
  }
}

// Conta il numero totale di stringhe
function countTexts(obj) {
  let count = 0;
  for (const value of Object.values(obj)) {
    if (typeof value === 'object' && value !== null) {
      count += countTexts(value);
    } else {
      count++;
    }
  }
  return count;
}

// Esegui
buildTranslations();
