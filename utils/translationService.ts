import { AllergenId, DownloadableLanguageCode, DownloadedLanguageData } from '../types';
import { ALLERGENS } from '../constants/allergens';
import { ALLERGEN_IMAGES } from '../constants/allergenImages';
import { CARD_TRANSLATIONS } from '../constants/cardTranslations';

const LIBRETRANSLATE_API = 'https://libretranslate.com/translate';

interface TranslateOptions {
  text: string;
  sourceLang: string;
  targetLang: string;
}

async function translateText({ text, sourceLang, targetLang }: TranslateOptions): Promise<string> {
  try {
    const response = await fetch(LIBRETRANSLATE_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        q: text,
        source: sourceLang,
        target: targetLang,
        format: 'text',
      }),
    });

    if (!response.ok) {
      throw new Error(`Translation failed: ${response.status}`);
    }

    const data = await response.json();
    return data.translatedText;
  } catch (error) {
    console.error('Translation error:', error);
    throw error;
  }
}

// Traduce un batch di testi in una sola chiamata (se supportato) o sequenzialmente
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

    // Piccola pausa per evitare rate limiting
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  return results;
}

export interface DownloadProgress {
  phase: 'allergens' | 'descriptions' | 'cardTexts';
  current: number;
  total: number;
  percentage: number;
}

export async function downloadLanguageTranslations(
  targetLang: DownloadableLanguageCode,
  onProgress?: (progress: DownloadProgress) => void
): Promise<DownloadedLanguageData> {
  const sourceLang = 'en'; // Traduciamo sempre dall'inglese

  // Prepara i testi da tradurre
  const allergenNames = ALLERGENS.map(a => a.translations.en);
  const allergenDescriptions = ALLERGENS.map(a => ALLERGEN_IMAGES[a.id].description.en);
  const cardTexts = [
    CARD_TRANSLATIONS.en.header,
    CARD_TRANSLATIONS.en.subtitle,
    CARD_TRANSLATIONS.en.message,
    CARD_TRANSLATIONS.en.thanks,
  ];

  const totalItems = allergenNames.length + allergenDescriptions.length + cardTexts.length;
  let completedItems = 0;

  // Traduce nomi allergeni
  onProgress?.({
    phase: 'allergens',
    current: 0,
    total: allergenNames.length,
    percentage: 0,
  });

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
      completedItems = allergenNames.length + allergenDescriptions.length + current;
      onProgress?.({
        phase: 'cardTexts',
        current,
        total: cardTexts.length,
        percentage: Math.round((completedItems / totalItems) * 100),
      });
    }
  );

  // Costruisce l'oggetto risultato
  const allergens: Record<AllergenId, string> = {} as Record<AllergenId, string>;
  const descriptions: Record<AllergenId, string> = {} as Record<AllergenId, string>;

  ALLERGENS.forEach((allergen, index) => {
    allergens[allergen.id] = translatedAllergenNames[index];
    descriptions[allergen.id] = translatedDescriptions[index];
  });

  return {
    allergens,
    descriptions,
    cardTexts: {
      header: translatedCardTexts[0],
      subtitle: translatedCardTexts[1],
      message: translatedCardTexts[2],
      thanks: translatedCardTexts[3],
    },
    downloadedAt: new Date().toISOString(),
  };
}

// Verifica se LibreTranslate è raggiungibile
export async function checkTranslationServiceAvailable(): Promise<boolean> {
  try {
    const response = await fetch('https://libretranslate.com/languages', {
      method: 'GET',
    });
    return response.ok;
  } catch {
    return false;
  }
}
