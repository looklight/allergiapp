import { Platform, Linking } from 'react-native';

/** Identificativi store dell'app, usati da piu' punti (valutazione, gate
 *  aggiornamento). Sorgente unica: se cambiano, cambiano qui. */
export const APP_STORE_ID = '6758859853';
export const PLAY_PACKAGE = 'com.allergiapp.mobile';

/** Apre la scheda dell'app sullo store, da cui l'utente puo' aggiornare. */
export function openStoreListing(): void {
  const url = Platform.OS === 'ios'
    ? `https://apps.apple.com/app/id${APP_STORE_ID}`
    : `https://play.google.com/store/apps/details?id=${PLAY_PACKAGE}`;
  Linking.openURL(url).catch(() => {});
}
