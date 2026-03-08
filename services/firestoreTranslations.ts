import { doc, getDoc } from 'firebase/firestore';
import { db } from './firebase';
import { DownloadableLanguageCode, DownloadedLanguageData } from '../types';

/**
 * Scarica le traduzioni pre-generate da Firestore.
 * Collection: translations/{langCode}
 *
 * Ogni documento contiene i campi di DownloadedLanguageData + `updatedAt` (timestamp server).
 * `downloadedAt` viene generato lato client al momento del fetch.
 */
export async function fetchTranslationFromFirestore(
  langCode: DownloadableLanguageCode
): Promise<DownloadedLanguageData | null> {
  try {
    const docRef = doc(db, 'translations', langCode);
    const snapshot = await getDoc(docRef);

    if (!snapshot.exists()) {
      return null;
    }

    const data = snapshot.data();

    // Validazione campi obbligatori
    if (!data.allergens || !data.descriptions || !data.cardTexts) {
      console.warn(`Firestore translation for ${langCode} is missing required fields`);
      return null;
    }

    return {
      allergens: data.allergens,
      descriptions: data.descriptions,
      warnings: data.warnings,
      dietFoods: data.dietFoods,
      otherFoods: data.otherFoods,
      restrictions: data.restrictions,
      restrictionCardTexts: data.restrictionCardTexts,
      cardTexts: data.cardTexts,
      downloadedAt: new Date().toISOString(),
    } as DownloadedLanguageData;
  } catch (error) {
    console.warn(`Firestore translation fetch failed for ${langCode}:`, error);
    return null;
  }
}

/**
 * Controlla se una traduzione su Firestore è più recente di quella locale.
 * Confronta `updatedAt` (timestamp server) con `downloadedAt` (timestamp client).
 * Ritorna true se c'è un aggiornamento disponibile.
 */
export async function checkTranslationUpdate(
  langCode: DownloadableLanguageCode,
  localDownloadedAt: string
): Promise<boolean> {
  try {
    const docRef = doc(db, 'translations', langCode);
    const snapshot = await getDoc(docRef);

    if (!snapshot.exists()) return false;

    const remoteUpdatedAt = snapshot.data().updatedAt;
    if (!remoteUpdatedAt) return false;

    return new Date(remoteUpdatedAt) > new Date(localDownloadedAt);
  } catch {
    return false;
  }
}
