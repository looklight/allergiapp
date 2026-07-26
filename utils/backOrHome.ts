// Indietro con fallback: nei flussi normali equivale a router.back(); quando
// la schermata è la radice dello stack (cold start da deep link, es.
// /u/{username} o il redirect a login da profilo) back() sarebbe un no-op e
// l'utente resterebbe incastrato — si va alla mappa con replace, senza
// accumulare schermate fantasma.
import type { Router } from 'expo-router';

export function backOrHome(router: Router) {
  if (router.canGoBack()) {
    router.back();
  } else {
    router.replace('/(tabs)/restaurants');
  }
}
