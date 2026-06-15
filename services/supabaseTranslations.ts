import { supabase } from './supabase';
import { DownloadableLanguageCode, DownloadedLanguageData } from '../types';

/**
 * Esito del fetch traduzioni da Supabase:
 * - `ok`: traduzione scaricata
 * - `notFound`: server raggiunto ma lingua non presente/incompleta → prova fallback
 * - `offline`: server non raggiungibile (nessuna connessione) → mostra messaggio
 */
export type TranslationFetchResult =
  | { status: 'ok'; data: DownloadedLanguageData }
  | { status: 'notFound' }
  | { status: 'offline' };

const SUPABASE_FETCH_TIMEOUT_MS = 8000;

/**
 * Scarica le traduzioni pre-generate da Supabase.
 * Tabella: translations (lang_code PK)
 *
 * `downloadedAt` viene generato lato client al momento del fetch.
 */
export async function fetchTranslationFromSupabase(
  langCode: DownloadableLanguageCode
): Promise<TranslationFetchResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), SUPABASE_FETCH_TIMEOUT_MS);

  try {
    const { data, error } = await supabase
      .from('translations')
      .select('allergens, descriptions, warnings, card_texts, diet_foods, other_foods, restrictions, restriction_card_texts')
      .eq('lang_code', langCode)
      .abortSignal(controller.signal)
      .single();

    if (error || !data) {
      return { status: 'notFound' };
    }

    // Validazione campi obbligatori
    if (!data.allergens || !data.descriptions || !data.card_texts) {
      console.warn(`Supabase translation for ${langCode} is missing required fields`);
      return { status: 'notFound' };
    }

    return {
      status: 'ok',
      data: {
        allergens: data.allergens,
        descriptions: data.descriptions,
        warnings: data.warnings,
        dietFoods: data.diet_foods,
        otherFoods: data.other_foods,
        restrictions: data.restrictions,
        restrictionCardTexts: data.restriction_card_texts,
        cardTexts: data.card_texts,
        downloadedAt: new Date().toISOString(),
      } as DownloadedLanguageData,
    };
  } catch (error) {
    // Eccezione = fetch fallita o timeout: server non raggiungibile (offline)
    console.warn(`Supabase translation fetch failed for ${langCode}:`, error);
    return { status: 'offline' };
  } finally {
    clearTimeout(timeout);
  }
}
