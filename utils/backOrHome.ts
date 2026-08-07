// Indietro con fallback: nei flussi normali equivale a router.back(); quando
// la schermata è la radice dello stack (cold start da deep link, es.
// /u/{username} o il redirect a login da profilo) back() sarebbe un no-op e
// l'utente resterebbe incastrato — si va alla mappa con replace, senza
// accumulare schermate fantasma.
import { useCallback } from 'react';
import { BackHandler, Platform } from 'react-native';
import { useFocusEffect, useRouter, type Router } from 'expo-router';

export function backOrHome(router: Router) {
  if (router.canGoBack()) {
    router.back();
  } else {
    router.replace('/(tabs)/restaurants');
  }
}

// Stessa rete di sicurezza per l'indietro DI SISTEMA su Android (gesture dal
// bordo e pulsante della barra emettono lo stesso evento): senza, sulla radice
// dello stack il back chiude l'app invece di portare alla mappa — chi arriva da
// un link condiviso viene sbattuto fuori al primo swipe.
//
// Interviene SOLO quando non c'è nulla nello stack: nei flussi normali torna
// false e lascia fare al navigatore, quindi zero cambiamenti di comportamento.
// Legato al focus (non al mount) così una schermata sotto non intercetta il
// back di quella sopra; gli sheet che registrano il proprio handler (aperti
// dopo) restano prioritari e continuano a chiudersi per primi.
export function useAndroidBackOrHome() {
  const router = useRouter();

  useFocusEffect(
    useCallback(() => {
      if (Platform.OS !== 'android') return;
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        if (router.canGoBack()) return false;
        router.replace('/(tabs)/restaurants');
        return true;
      });
      return () => sub.remove();
    }, [router]),
  );
}
