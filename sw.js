const CACHE = 'bctc-fee-v7';
const ASSETS = ['./index.html','./manifest.json','./icon.svg'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request).catch(() => caches.match('./index.html')))
  );
});

// Show notification requested by app
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

// Notification tapped → open app and tell it to mark this student as tapped
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const { studentId, monthKey } = e.notification.data || {};
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      const target = list.length > 0 ? list[0] : null;
      if (target) {
        // Tell the open app to mark tapped + open reminder
        target.postMessage({ type: 'NOTIF_TAPPED', studentId, monthKey });
        return target.focus();
      }
      // App not open — open it with params in URL
      return clients.openWindow('./index.html?notif=' + studentId + '&mk=' + monthKey);
    })
  );
});
