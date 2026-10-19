// HTML/CSS/JS/data: network-first (with timeout -> cache) so updates arrive on the next launch without reinstalling.
// Posters: cache-first. New SW takes over immediately (skipWaiting + clients.claim).
const VERSION = '20261019-gapfix2';
const SHELL = ['./', 'index.html', 'app.css', 'app.js', 'manifest.webmanifest', 'icons/icon-180.png', 'icons/icon-192.png'];
const SC = 'shell-' + VERSION;
self.addEventListener('install', e => {
  e.waitUntil(caches.open(SC).then(c => c.addAll(SHELL.map(u => new Request(u, {cache: 'reload'})))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('shell-') && k !== SC).map(k => caches.delete(k))))
    .then(() => self.registration.navigationPreload ? self.registration.navigationPreload.disable().catch(() => {}) : 0)
    .then(() => self.clients.claim()));
});
function networkFirst(req, key, ms) {
  const net = fetch(req, {cache: 'no-cache'}).then(r => {
    if (r.ok) { const c = r.clone(); caches.open(SC).then(x => x.put(key, c)); }
    return r;
  });
  const timeout = new Promise(res => setTimeout(res, ms));
  return Promise.race([net, timeout.then(() => caches.match(key).then(hit => hit || net))])
    .catch(() => caches.match(key).then(hit => hit || Response.error()));
}
self.addEventListener('fetch', e => {
  const req = e.request, u = new URL(req.url);
  if (u.origin !== location.origin || req.method !== 'GET') return;
  if (req.mode === 'navigate') { e.respondWith(networkFirst(req, './', 4000)); return; }
  if (u.pathname.includes('/p/')) {
    e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(r => {
      if (r.ok) { const c = r.clone(); caches.open('posters').then(x => x.put(req, c)); }
      return r;
    })));
    return;
  }
  e.respondWith(networkFirst(req, req, u.pathname.endsWith('data.json') ? 6000 : 3000));
});
