'use client';

import { useEffect } from 'react';

// Registra il service worker (public/sw.js): serve all'installazione su
// Android/Chrome e alla pagina offline. Solo in produzione, così in locale
// non resta un worker appeso tra un riavvio e l'altro del dev server.
export default function RegisterSW() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return;
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // niente da fare: senza worker il portale funziona lo stesso
    });
  }, []);

  return null;
}
