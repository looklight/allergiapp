import i18n from '../utils/i18n';
import { translateText as translateViaMyMemory } from './translationService';

// Traduzione on-device delle recensioni (Apple Translation su iOS 18+, ML Kit
// su Android) con fallback MyMemory quando l'on-device non è disponibile
// (iOS < 18, lingua non supportata, Expo Go senza modulo nativo).

// Cache in-memory per sessione: la stessa recensione si traduce una volta sola.
const cache = new Map<string, string>();

// Il modulo nativo non supporta chiamate concorrenti: serializziamo i task.
let queue: Promise<unknown> = Promise.resolve();

function normalizeLang(lang?: string | null): string | null {
  if (!lang) return null;
  return lang.split('-')[0].toLowerCase() || null;
}

function getReaderLang(): string {
  return normalizeLang(i18n.locale) ?? 'en';
}

/**
 * True se ha senso offrire il bottone Traduci: lingua della recensione diversa
 * da quella del lettore, o ignota (recensioni vecchie → auto-detect on-device).
 */
export function shouldOfferTranslation(sourceLang?: string | null): boolean {
  const source = normalizeLang(sourceLang);
  if (!source) return true;
  return source !== getReaderLang();
}

async function translateOnDevice(text: string, sourceLang: string | null, targetLang: string): Promise<string> {
  // Import lazy: in ambienti senza il modulo nativo l'import top-level
  // farebbe crashare l'app al load del bundle.
  const { onTranslateTask } = await import('expo-translate-text');
  const result = await onTranslateTask({
    input: text,
    ...(sourceLang ? { sourceLangCode: sourceLang } : {}),
    targetLangCode: targetLang,
  });
  const translated = result.translatedTexts;
  if (typeof translated !== 'string' || !translated.trim()) {
    throw new Error('Empty on-device translation');
  }
  return translated;
}

/** Traduce il testo di una recensione nella lingua del lettore. */
export async function translateReview(text: string, sourceLang?: string | null): Promise<string> {
  const target = getReaderLang();
  const source = normalizeLang(sourceLang);
  const cacheKey = `${source ?? 'auto'}|${target}|${text}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const task = queue.then(async () => {
    try {
      return await translateOnDevice(text, source, target);
    } catch {
      // MyMemory richiede la lingua sorgente: senza, non c'è fallback.
      if (!source) throw new Error('Translation unavailable');
      return await translateViaMyMemory({ text, sourceLang: source, targetLang: target });
    }
  });
  queue = task.catch(() => {});

  const translated = await task;
  cache.set(cacheKey, translated);
  return translated;
}
