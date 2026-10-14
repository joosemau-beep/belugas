// guarda la app en el iPad para que abra en la cancha sin señal.
// La página: primero internet, preguntándole al servidor si cambió (así los arreglos llegan a la primera); si en 3 s no contesta, la guardada.
// Logo e imágenes: la guardada, y se actualiza por detrás. version.txt nunca se guarda: con él la app sabe si hay versión nueva.
const C = 'belugas';
self.addEventListener('install', e => { e.waitUntil(caches.open(C).then(c => c.addAll(['./', 'logo.webp', 'letras.webp', 'icon.png']))); self.skipWaiting() });
self.addEventListener('activate', e => e.waitUntil(clients.claim()));
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url), nav = e.request.mode === 'navigate';
  if (e.request.method !== 'GET' || url.origin !== location.origin || url.pathname.endsWith('/version.txt')) return;
  const net = caches.open(C).then(c => fetch(nav ? new Request(e.request.url, {cache: 'no-cache'}) : e.request).then(r => { if (r.ok) c.put(e.request, r.clone()); return r }));
  e.waitUntil(net.catch(() => {}));
  const saved = () => caches.match(e.request, {ignoreSearch: true});
  if (nav) e.respondWith(Promise.race([net, new Promise(r => setTimeout(r, 3000))]).then(r => r || saved()).catch(saved));
  else e.respondWith(saved().then(hit => hit || net));
});
