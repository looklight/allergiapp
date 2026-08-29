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
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Solo le navigazioni: le richieste di dati (Supabase) devono fallire come
// sempre, altrimenti la app crede di essere online e mostra stati falsi.
self.addEventListener('fetch', (event) => {
  if (event.request.mode !== 'navigate') return;
  event.respondWith(
    fetch(event.request).catch(async () => {
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
    })
  );
});
