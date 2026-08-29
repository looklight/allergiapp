import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { supabase } from './supabase';
import { isOlderThan } from '../utils/version';

/**
 * Gate versione app: legge la riga singola `app_config` (mig 083) e decide se
 * l'app deve mostrare il muro "aggiorna per continuare" o il solo avviso
 * chiudibile.
 *
 * REGOLA NON NEGOZIABILE — FAIL-OPEN. Con le OTA bloccate questa e' l'unica
 * funzione che, sbagliata, blocca l'app a tutti senza possibilita' di correggere
 * da remoto lato client. Quindi: rete assente, timeout, riga mancante, valore
 * malformato, versione app illeggibile -> `{ blocked: false, recommended: null }`.
 * Si blocca SOLO quando il server dice esplicitamente una soglia valida piu'
 * alta della versione installata.
 */

/** Oltre questo tempo si rinuncia e si parte: il gate non deve mai far
 *  aspettare l'utente su rete lenta. */
const FETCH_TIMEOUT_MS = 4000;

export interface VersionGate {
  /** true = mostra il muro non chiudibile. */
  blocked: boolean;
  /** Versione consigliata quando l'app e' piu' vecchia: stringa da usare anche
   *  come chiave del "gia' chiuso" (l'avviso torna solo se il numero cambia).
   *  null = nessun avviso. */
  recommended: string | null;
}

const OPEN: VersionGate = { blocked: false, recommended: null };

interface AppConfigRow {
  min_supported_version: string | null;
  recommended_version: string | null;
  min_os_ios: string | null;
  min_os_android: string | null;
}

/** Versione dell'app installata, o null se illeggibile (-> fail-open). */
function currentAppVersion(): string | null {
  return Constants.expoConfig?.version ?? null;
}

/**
 * true se il device NON puo' installare la build nuova (OS troppo vecchio):
 * murarlo lo lascerebbe fuori per sempre, senza via d'uscita. Con le colonne
 * a NULL (stato odierno) nessuno e' esentato.
 *
 * Su iOS il confronto e' sulla versione di sistema ("18.1"), su Android sul
 * livello API numerico (34): `Platform.Version` e' string su iOS e number su
 * Android, e la stessa funzione di confronto gestisce entrambi.
 */
function cannotUpdate(row: AppConfigRow): boolean {
  const floor = Platform.OS === 'ios' ? row.min_os_ios : row.min_os_android;
  if (!floor) return false;
  return isOlderThan(String(Platform.Version), floor);
}

/**
 * Legge il gate. Non lancia mai: ogni percorso d'errore ritorna `OPEN`.
 */
export async function fetchVersionGate(): Promise<VersionGate> {
  const appVersion = currentAppVersion();
  if (!appVersion) return OPEN;

  try {
    const query = supabase
      .from('app_config')
      .select('min_supported_version, recommended_version, min_os_ios, min_os_android')
      .maybeSingle();

    const timeout = new Promise<null>(resolve => setTimeout(() => resolve(null), FETCH_TIMEOUT_MS));
    const result = await Promise.race([query, timeout]);

    if (!result || result.error || !result.data) return OPEN;
    const row = result.data as AppConfigRow;

    const blocked =
      isOlderThan(appVersion, row.min_supported_version) && !cannotUpdate(row);

    // Il muro assorbe l'avviso: se sei bloccato non ha senso suggerirti nulla.
    const recommended =
      !blocked && isOlderThan(appVersion, row.recommended_version)
        ? row.recommended_version
        : null;

    return { blocked, recommended };
  } catch {
    return OPEN;
  }
}
