import { Platform, Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as StoreReview from 'expo-store-review';

// Prompt nativo di valutazione store (iOS SKStoreReviewController, Android
// Play In-App Review). Noi *richiediamo*, l'OS decide se mostrarlo: iOS
// concede ~3 prompt/anno per utente e non dà alcun callback. In dev/TestFlight
// il popup appare quasi sempre, in produzione può non apparire — è normale.

const LAST_REQUEST_KEY = 'allergiapp_store_review_last_request';

// Soglie deliberatamente conservative: il prompt parte solo da utenti
// agganciati e contenti, il throttle OS fa il resto.
const MIN_RATING = 4;
const THROTTLE_DAYS = 90;
// Lascia assestare la navigazione (router.back) prima che l'OS presenti il foglio.
const REQUEST_DELAY_MS = 1500;

const APP_STORE_ID = '6758859853';
const PLAY_PACKAGE = 'com.allergiapp.mobile';

/**
 * Richiede il popup nativo di valutazione dopo una recensione positiva
 * (rating >= 4, max un tentativo ogni 90 giorni).
 * Fire-and-forget: non va atteso e non lancia mai — qualunque esito
 * non deve toccare il flusso recensione del chiamante.
 */
export function maybeRequestStoreReview(rating: number): void {
  if (rating < MIN_RATING) return;
  setTimeout(async () => {
    try {
      const last = await AsyncStorage.getItem(LAST_REQUEST_KEY);
      if (last && Date.now() - Number(last) < THROTTLE_DAYS * 24 * 60 * 60 * 1000) return;
      // false su device senza Play Services / APK sideload: no-op pulito.
      if (!(await StoreReview.isAvailableAsync())) return;
      // Timestamp PRIMA della richiesta: anche se l'OS decide di non mostrare
      // nulla il tentativo è speso, niente richieste a raffica nei giorni dopo.
      await AsyncStorage.setItem(LAST_REQUEST_KEY, String(Date.now()));
      await StoreReview.requestReview();
    } catch {
      // Best-effort.
    }
  }, REQUEST_DELAY_MS);
}

/**
 * Apre la pagina store per la voce esplicita "Valuta l'app" nei settings.
 * Deep-link diretto (su iOS apre subito il foglio di recensione): non passa
 * da requestReview e quindi non consuma il budget prompt dell'OS.
 */
export function openStoreReviewPage(): void {
  const url = Platform.OS === 'ios'
    ? `https://apps.apple.com/app/id${APP_STORE_ID}?action=write-review`
    : `https://play.google.com/store/apps/details?id=${PLAY_PACKAGE}`;
  Linking.openURL(url).catch(() => {});
}
