// Tiene in memoria i file della guida, così si apre anche senza connessione.
// I contenuti del foglio Google li salva invece app.js.
const CACHE = 'guida-v1';
const FILE = ['./', 'index.html', 'stile.css', 'app.js', 'config.js', 'lingue.js', 'icone.js', 'esempio.json', 'icona.svg', 'manifest.webmanifest'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(k => Promise.all(k.filter(n => n !== CACHE).map(n => caches.delete(n)))).then(() => self.clients.claim()));
});

// prima la rete (per avere sempre l'ultima versione), la copia salvata se offline
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  e.respondWith(
    fetch(e.request).then(r => {
      const copia = r.clone();
      caches.open(CACHE).then(c => c.put(e.request, copia));
      return r;
    }).catch(() => caches.match(e.request, { ignoreSearch: true }))
  );
});
