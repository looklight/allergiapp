import { supabase } from './supabase';
import { DownloadableLanguageCode, DownloadedLanguageData } from '../types';

/**
 * Scarica le traduzioni pre-generate da Supabase.
 * Tabella: translations (lang_code PK)
 *
 * `downloadedAt` viene generato lato client al momento del fetch.
 */
export async function fetchTranslationFromSupabase(
  langCode: DownloadableLanguageCode
): Promise<DownloadedLanguageData | null> {
  try {
    const { data, error } = await supabase
      .from('translations')
      .select('allergens, descriptions, warnings, card_texts, diet_foods, other_foods, restrictions, restriction_card_texts')
      .eq('lang_code', langCode)
      .single();

    if (error || !data) {
      return null;
    }

    // Validazione campi obbligatori
    if (!data.allergens || !data.descriptions || !data.card_texts) {
      console.warn(`Supabase translation for ${langCode} is missing required fields`);
      return null;
    }

    return {
      allergens: data.allergens,
      descriptions: data.descriptions,
      warnings: data.warnings,
      dietFoods: data.diet_foods,
      otherFoods: data.other_foods,
      restrictions: data.restrictions,
      restrictionCardTexts: data.restriction_card_texts,
      cardTexts: data.card_texts,
      downloadedAt: new Date().toISOString(),
    } as DownloadedLanguageData;
  } catch (error) {
    console.warn(`Supabase translation fetch failed for ${langCode}:`, error);
    return null;
  }
}
