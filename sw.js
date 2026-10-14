// guarda la app en el iPad para que abra en la cancha sin señal; con señal se trae la versión nueva para la siguiente vez
const C = 'belugas';
self.addEventListener('install', e => { e.waitUntil(caches.open(C).then(c => c.addAll(['./', 'logo.webp', 'letras.webp', 'icon.png']))); self.skipWaiting() });
self.addEventListener('activate', e => e.waitUntil(clients.claim()));
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const net = caches.open(C).then(c => fetch(e.request).then(r => { if (r.ok) c.put(e.request, r.clone()); return r }));
  e.waitUntil(net.catch(() => {}));
  e.respondWith(caches.match(e.request, {ignoreSearch: true}).then(hit => hit || net));
});
