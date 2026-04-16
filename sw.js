const CACHE = 'bctc-fee-v8';
const ASSETS = ['./index.html','./manifest.json','./icon.svg'];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// NETWORK FIRST — always try network, fall back to cache
// This ensures updated files are always picked up immediately
self.addEventListener('fetch', e => {
  e.respondWith(
    fetch(e.request)
      .then(res => {
        // Update cache with fresh response
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});

// Show notification requested by the app
self.addEventListener('message', e => {
  if (!e.data) return;
  if (e.data.type === 'SHOW_NOTIFICATION') {
    e.waitUntil(
      self.registration.showNotification(e.data.title, {
        body: e.data.body,
        icon: './icon.svg',
        tag: e.data.tag,
        requireInteraction: true,
        vibrate: [200, 100, 200],
        data: { studentId: e.data.studentId, monthKey: e.data.monthKey }
      })
    );
  }
});

// Notification tapped → open/focus app, pass studentId back
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const { studentId, monthKey } = e.notification.data || {};
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      if (list.length > 0) {
        list[0].postMessage({ type: 'NOTIF_TAPPED', studentId, monthKey });
        return list[0].focus();
      }
      return clients.openWindow('./index.html?notif=' + studentId + '&mk=' + monthKey);
    })
  );
});
