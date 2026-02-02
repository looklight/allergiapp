import { AllergenId, DownloadableLanguageCode, DownloadedLanguageData } from '../types';
import { ALLERGENS } from '../constants/allergens';
import { ALLERGEN_IMAGES } from '../constants/allergenImages';
import { CARD_TRANSLATIONS } from '../constants/cardTranslations';

const MYMEMORY_API = 'https://api.mymemory.translated.net/get';
const REQUEST_TIMEOUT_MS = 30000;
const RATE_LIMIT_DELAY_MS = 300;

function fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number = REQUEST_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  return fetch(url, { ...options, signal: controller.signal }).finally(() => {
    clearTimeout(timeout);
  });
}

interface TranslateOptions {
  text: string;
  sourceLang: string;
  targetLang: string;
}

async function translateText({ text, sourceLang, targetLang }: TranslateOptions): Promise<string> {
  const params = new URLSearchParams({
    q: text,
    langpair: `${sourceLang}|${targetLang}`,
  });

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

  // MyMemory returns match quality — check for errors
  if (data.responseStatus === 403) {
    throw new Error('Translation quota exceeded');
  }

  return data.responseData.translatedText;
}

// Traduce un batch di testi sequenzialmente via MyMemory API
async function translateBatch(
  texts: string[],
  sourceLang: string,
  targetLang: string,
  onProgress?: (current: number, total: number) => void
): Promise<string[]> {
  const results: string[] = [];
  const total = texts.length;

  for (let i = 0; i < texts.length; i++) {
    const translated = await translateText({
      text: texts[i],
      sourceLang,
      targetLang,
    });
    results.push(translated);
    onProgress?.(i + 1, total);

    if (i < texts.length - 1) {
      await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY_MS));
    }
  }

  return results;
}

// Rileva traduzioni parziali: se troppe parole restano in inglese, la traduzione non è affidabile
function isPartialTranslation(original: string, translated: string): boolean {
  const getWords = (text: string) =>
    text.toLowerCase().split(/[\s,.\-()]+/).filter(w => w.length > 2);
  const origWords = getWords(original);
  const transWords = getWords(translated);
  if (origWords.length === 0) return false;
  const unchanged = origWords.filter(w => transWords.includes(w)).length;
  return unchanged / origWords.length > 0.4;
}

export interface DownloadProgress {
  phase: 'allergens' | 'descriptions' | 'cardTexts';
  current: number;
  total: number;
  percentage: number;
}

export async function downloadLanguageTranslations(
  targetLang: DownloadableLanguageCode,
  onProgress?: (progress: DownloadProgress) => void,
  signal?: AbortSignal
): Promise<DownloadedLanguageData> {
  const sourceLang = 'en'; // Traduciamo sempre dall'inglese

  // Prepara i testi da tradurre
  const allergenNames = ALLERGENS.map(a => a.translations.en);
  const allergenDescriptions = ALLERGENS.map(a => ALLERGEN_IMAGES[a.id].description.en);

  // Raccoglie i warning da tradurre (solo per allergeni che hanno un warning)
  const allergensWithWarnings = ALLERGENS.filter(a => ALLERGEN_IMAGES[a.id].warning);
  const allergenWarnings = allergensWithWarnings.map(a => ALLERGEN_IMAGES[a.id].warning!.en);

  const cardTexts = [
    CARD_TRANSLATIONS.en.header,
    CARD_TRANSLATIONS.en.subtitle,
    CARD_TRANSLATIONS.en.message,
    CARD_TRANSLATIONS.en.thanks,
    CARD_TRANSLATIONS.en.tapToSee,
    CARD_TRANSLATIONS.en.showIn,
  ];

  const totalItems = allergenNames.length + allergenDescriptions.length + allergenWarnings.length + cardTexts.length;
  let completedItems = 0;

  // Traduce nomi allergeni
  onProgress?.({
    phase: 'allergens',
    current: 0,
    total: allergenNames.length,
    percentage: 0,
  });

  const checkAborted = () => {
    if (signal?.aborted) throw new Error('Download cancelled');
  };

  const translatedAllergenNames = await translateBatch(
    allergenNames,
    sourceLang,
    targetLang,
    (current) => {
      completedItems = current;
      onProgress?.({
        phase: 'allergens',
        current,
        total: allergenNames.length,
        percentage: Math.round((completedItems / totalItems) * 100),
      });
    }
  );
  checkAborted();

  // Traduce descrizioni allergeni
  onProgress?.({
    phase: 'descriptions',
    current: 0,
    total: allergenDescriptions.length,
    percentage: Math.round((completedItems / totalItems) * 100),
  });

  const translatedDescriptions = await translateBatch(
    allergenDescriptions,
    sourceLang,
    targetLang,
    (current) => {
      completedItems = allergenNames.length + current;
      onProgress?.({
        phase: 'descriptions',
        current,
        total: allergenDescriptions.length,
        percentage: Math.round((completedItems / totalItems) * 100),
      });
    }
  );
  checkAborted();

  // Traduce warning allergeni (solo quelli che hanno un warning)
  let translatedWarnings: string[] = [];
  if (allergenWarnings.length > 0) {
    onProgress?.({
      phase: 'descriptions',
      current: allergenDescriptions.length,
      total: allergenDescriptions.length + allergenWarnings.length,
      percentage: Math.round((completedItems / totalItems) * 100),
    });

    translatedWarnings = await translateBatch(
      allergenWarnings,
      sourceLang,
      targetLang,
      (current) => {
        completedItems = allergenNames.length + allergenDescriptions.length + current;
        onProgress?.({
          phase: 'descriptions',
          current: allergenDescriptions.length + current,
          total: allergenDescriptions.length + allergenWarnings.length,
          percentage: Math.round((completedItems / totalItems) * 100),
        });
      }
    );
    checkAborted();
  }

  // Traduce testi card
  onProgress?.({
    phase: 'cardTexts',
    current: 0,
    total: cardTexts.length,
    percentage: Math.round((completedItems / totalItems) * 100),
  });

  const translatedCardTexts = await translateBatch(
    cardTexts,
    sourceLang,
    targetLang,
    (current) => {
      completedItems = allergenNames.length + allergenDescriptions.length + allergenWarnings.length + current;
      onProgress?.({
        phase: 'cardTexts',
        current,
        total: cardTexts.length,
        percentage: Math.round((completedItems / totalItems) * 100),
      });
    }
  );
  checkAborted();

  // Costruisce l'oggetto risultato
  const allergens: Record<AllergenId, string> = {} as Record<AllergenId, string>;
  const descriptions: Record<AllergenId, string> = {} as Record<AllergenId, string>;
  const warnings: Record<AllergenId, string> = {} as Record<AllergenId, string>;

  ALLERGENS.forEach((allergen, index) => {
    allergens[allergen.id] = translatedAllergenNames[index];
    // Se la descrizione è tradotta solo parzialmente, usa l'originale inglese
    const original = allergenDescriptions[index];
    const translated = translatedDescriptions[index];
    descriptions[allergen.id] = isPartialTranslation(original, translated) ? original : translated;
  });

  // Aggiungi i warning tradotti
  allergensWithWarnings.forEach((allergen, index) => {
    const original = allergenWarnings[index];
    const translated = translatedWarnings[index];
    warnings[allergen.id] = isPartialTranslation(original, translated) ? original : translated;
  });

  return {
    allergens,
    descriptions,
    warnings: Object.keys(warnings).length > 0 ? warnings : undefined,
    cardTexts: {
      header: translatedCardTexts[0],
      subtitle: translatedCardTexts[1],
      message: translatedCardTexts[2],
      thanks: translatedCardTexts[3],
      tapToSee: translatedCardTexts[4],
      showIn: translatedCardTexts[5],
    },
    downloadedAt: new Date().toISOString(),
  };
}

// Verifica se MyMemory API è raggiungibile
export async function checkTranslationServiceAvailable(): Promise<boolean> {
  try {
    const params = new URLSearchParams({
      q: 'test',
      langpair: 'en|it',
    });
    const response = await fetchWithTimeout(`${MYMEMORY_API}?${params.toString()}`, {
      method: 'GET',
    }, 10000);
    return response.ok;
  } catch {
    return false;
  }
}
