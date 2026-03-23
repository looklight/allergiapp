// Firebase Crashlytics - Modular API
// Dynamically required — may not be available in Expo Go
type CrashlyticsInstance = {
  setCrashlyticsCollectionEnabled: (enabled: boolean) => Promise<void>;
  log: (message: string) => void;
  recordError: (error: Error, jsErrorName?: string) => void;
  setUserId: (userId: string) => Promise<void>;
  setAttribute: (name: string, value: string) => Promise<void>;
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

export const Crashlytics = {
  /**
   * Enable or disable crash reporting based on user consent.
   * Call this after tracking consent is set.
   */
  setCollectionEnabled(enabled: boolean) {
    if (!isCrashlyticsAvailable || !crashlyticsInstance) return;
    // Always disabled in dev to avoid polluting crash reports
    const shouldEnable = !__DEV__ && enabled;
    crashlyticsInstance.setCrashlyticsCollectionEnabled(shouldEnable).catch(() => {});
  },

  /**
   * Record a non-fatal error manually.
   */
  recordError(error: Error) {
    if (!isCrashlyticsAvailable || !crashlyticsInstance || __DEV__) return;
    try {
      crashlyticsInstance.recordError(error);
    } catch {}
  },

  /**
   * Add a log message to the crash report context.
   */
  log(message: string) {
    if (!isCrashlyticsAvailable || !crashlyticsInstance || __DEV__) return;
    try {
      crashlyticsInstance.log(message);
    } catch {}
  },
};
