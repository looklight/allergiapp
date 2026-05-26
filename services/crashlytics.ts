// Firebase Crashlytics - Modular API
// Dynamically required — may not be available in Expo Go
type CrashlyticsInstance = {
  setCrashlyticsCollectionEnabled: (enabled: boolean) => Promise<void>;
  log: (message: string) => void;
  recordError: (error: Error, jsErrorName?: string) => void;
  setUserId: (userId: string) => Promise<void>;
  setAttribute: (name: string, value: string) => Promise<void>;
  setAttributes: (attributes: Record<string, string>) => Promise<void>;
};

let crashlyticsInstance: CrashlyticsInstance | null = null;
let isCrashlyticsAvailable = false;

try {
  const crashlyticsModule = require('@react-native-firebase/crashlytics');
  crashlyticsInstance = crashlyticsModule.default();
  isCrashlyticsAvailable = true;
  if (__DEV__) console.log('[Crashlytics] Firebase Crashlytics disponibile');
} catch (error) {
  if (__DEV__) console.log('[Crashlytics] Firebase Crashlytics non disponibile (probabilmente Expo Go)');
}

// In dev evitiamo di sporcare la dashboard. Tutti i metodi sono no-op
// quando il modulo nativo non e' presente (Expo Go) o siamo in __DEV__.
function canReport(): boolean {
  return isCrashlyticsAvailable && !!crashlyticsInstance && !__DEV__;
}

export const Crashlytics = {
  /**
   * Enable or disable crash reporting based on user consent.
   * Call this after tracking consent is set.
   */
  setCollectionEnabled(enabled: boolean) {
    if (!isCrashlyticsAvailable || !crashlyticsInstance) return;
    const shouldEnable = !__DEV__ && enabled;
    crashlyticsInstance.setCrashlyticsCollectionEnabled(shouldEnable).catch(() => {});
  },

  /**
   * Associa i prossimi crash a un utente. Passare null al logout per dissociare.
   */
  setUserId(userId: string | null) {
    if (!canReport()) return;
    try {
      crashlyticsInstance!.setUserId(userId ?? '').catch(() => {});
    } catch {}
  },

  /**
   * Imposta un singolo attributo (max 64 char per chiave e valore lato Firebase).
   */
  setAttribute(name: string, value: string) {
    if (!canReport()) return;
    try {
      crashlyticsInstance!.setAttribute(name, value).catch(() => {});
    } catch {}
  },

  /**
   * Batch di attributi. Stringhe vuote/null vengono ignorate per non
   * sovrascrivere attributi precedenti con valori mancanti.
   */
  setAttributes(attributes: Record<string, string | number | boolean | null | undefined>) {
    if (!canReport()) return;
    const sanitized: Record<string, string> = {};
    for (const [key, raw] of Object.entries(attributes)) {
      if (raw === null || raw === undefined) continue;
      sanitized[key] = String(raw);
    }
    if (Object.keys(sanitized).length === 0) return;
    try {
      crashlyticsInstance!.setAttributes(sanitized).catch(() => {});
    } catch {}
  },

  /**
   * Record a non-fatal error manually.
   * jsErrorName: nome semantico per il grouping in dashboard (es. 'SupabaseRpcError').
   */
  recordError(error: Error, jsErrorName?: string) {
    if (!canReport()) return;
    try {
      crashlyticsInstance!.recordError(error, jsErrorName);
    } catch {}
  },

  /**
   * Add a log message to the crash report context (breadcrumb).
   */
  log(message: string) {
    if (!canReport()) return;
    try {
      crashlyticsInstance!.log(message);
    } catch {}
  },
};
