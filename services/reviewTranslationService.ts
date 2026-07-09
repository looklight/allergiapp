import { Platform } from 'react-native';
import { getAppLanguage } from '../utils/i18n';
import { translateText as translateViaMyMemory } from './translationService';

// Traduzione on-device delle recensioni (Apple Translation su iOS 18+, ML Kit
// su Android) con fallback MyMemory quando l'on-device non è disponibile
// (iOS < 18, lingua non supportata, Expo Go senza modulo nativo).

// Cache per sessione: contiene la promise (non il valore) così due tap
// ravvicinati sullo stesso testo condividono la stessa richiesta in volo.
const cache = new Map<string, Promise<string>>();

// ML Kit/Apple possono non risolvere mai (es. download modello senza rete):
// senza un tetto la coda on-device si incepperebbe per tutta la sessione.
const ON_DEVICE_TIMEOUT_MS = 15000;

// Il modulo nativo non supporta chiamate concorrenti: serializziamo SOLO il
// percorso on-device; il fallback HTTP resta concorrente e ha già il suo timeout.
let onDeviceQueue: Promise<unknown> = Promise.resolve();

// Import lazy memoizzato: senza modulo nativo l'import top-level
// farebbe crashare l'app al load del bundle.
let modulePromise: Promise<typeof import('expo-translate-text')> | null = null;

function normalizeLang(lang?: string | null): string | null {
  if (!lang) return null;
  return lang.split('-')[0].toLowerCase() || null;
}

// On-device: ML Kit c'è su ogni Android; Apple Translation solo da iOS 18.
function isOnDeviceAvailable(): boolean {
  if (Platform.OS === 'android') return true;
  if (Platform.OS === 'ios') return parseInt(String(Platform.Version), 10) >= 18;
  return false;
}

/**
 * True se ha senso offrire il bottone Traduci: lingua della recensione diversa
 * da quella del lettore. Se la lingua è ignota (recensioni pre-marzo 2026) solo
 * l'on-device sa fare auto-detect: senza, il bottone fallirebbe sempre
 * (MyMemory esige la sorgente) e quindi non lo offriamo.
 */
export function shouldOfferTranslation(sourceLang?: string | null): boolean {
  const source = normalizeLang(sourceLang);
  if (!source) return isOnDeviceAvailable();
  return source !== getAppLanguage();
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('On-device translation timeout')), ms);
    promise.then(
      value => { clearTimeout(timer); resolve(value); },
      error => { clearTimeout(timer); reject(error); },
    );
  });
}

async function translateOnDevice(text: string, sourceLang: string | null, targetLang: string): Promise<string> {
  modulePromise ??= import('expo-translate-text');
  const { onTranslateTask } = await modulePromise;
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
export function translateReview(text: string, sourceLang?: string | null): Promise<string> {
  const target = getAppLanguage();
  const source = normalizeLang(sourceLang);
  const cacheKey = `${source ?? 'auto'}|${target}|${text}`;
  const pending = cache.get(cacheKey);
  if (pending) return pending;

  const task = (async () => {
    try {
      // Il timeout parte quando il task entra in esecuzione, non al tap: se il
      // nativo si blocca la coda avanza comunque al timeout (al peggio una
      // chiamata concorrente in ritardo fallisce e ripiega su MyMemory).
      const onDevice = onDeviceQueue.then(() =>
        withTimeout(translateOnDevice(text, source, target), ON_DEVICE_TIMEOUT_MS),
      );
      onDeviceQueue = onDevice.catch(() => {});
      return await onDevice;
    } catch {
      // MyMemory richiede la lingua sorgente: senza, non c'è fallback.
      if (!source) throw new Error('Translation unavailable');
      return await translateViaMyMemory({ text, sourceLang: source, targetLang: target });
    }
  })();

  cache.set(cacheKey, task);
  // I fallimenti non si cachano: il prossimo tap ritenta da zero.
  task.catch(() => cache.delete(cacheKey));
  return task;
}
