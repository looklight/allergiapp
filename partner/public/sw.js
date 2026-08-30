// Service worker minimo: serve a rendere il portale installabile e a mostrare
// una pagina decente quando manca la rete. NON mette in cache l'app: il codice
// arriva sempre dalla rete, così un deploy nuovo non resta mai indietro.
const CACHE = 'partner-offline-v1';
const OFFLINE_URL = '/offline.html';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.add(OFFLINE_URL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Senza questo ogni navigazione aspetta che il worker si sia acceso prima
      // ancora di chiedere la pagina alla rete: il preload le fa partire in
      // parallelo. È il costo che un fetch handler si porta dietro, ed è la
      // ragione per cui una pagina può sembrare più lenta DOPO l'installazione.
      if (self.registration.navigationPreload) {
        await self.registration.navigationPreload.enable();
      }
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
      await self.clients.claim();
    })()
  );
});

// Solo le navigazioni: le richieste di dati (Supabase) devono fallire come
// sempre, altrimenti la app crede di essere online e mostra stati falsi.
self.addEventListener('fetch', (event) => {
  if (event.request.mode !== 'navigate') return;
  event.respondWith(
    (async () => {
      try {
        // la risposta che il browser ha già iniziato a scaricare da solo
        const preload = await event.preloadResponse;
        return preload || (await fetch(event.request));
      } catch {
        // Se anche la cache è vuota (install fallito, cache sfrattata) non si
        // restituisce undefined: sarebbe un errore di rete opaco al posto della pagina.
        const cached = await caches.match(OFFLINE_URL);
        return (
          cached ||
          new Response('Sei offline.', {
            status: 503,
            headers: { 'Content-Type': 'text/plain; charset=utf-8' },
          })
        );
      }
    })()
  );
});
