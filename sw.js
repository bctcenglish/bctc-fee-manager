const CACHE = 'bctc-fee-v5';
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

// Store schedule sent from the app
let feeSchedule = [];
let instituteName = 'BCTC';
let currentMonthKey = '';

self.addEventListener('message', e => {
  if (e.data && e.data.type === 'SCHEDULE_NOTIFICATIONS') {
    feeSchedule = e.data.schedule || [];
    instituteName = e.data.instituteName || 'BCTC';
    currentMonthKey = e.data.monthKey || '';
    // Start periodic check
    startPeriodicCheck();
  }
});

// Periodic check every 5 minutes using setTimeout chain
let checkTimer = null;
function startPeriodicCheck() {
  if (checkTimer) clearTimeout(checkTimer);
  checkDueDates();
}

function checkDueDates() {
  const now = new Date();
  const day = now.getDate();
  const hour = now.getHours();
  const minute = now.getMinutes();

  // Fire between 12:30 PM and 12:35 PM only
  const isTime = (hour === 12 && minute >= 30 && minute < 35);

  if (isTime) {
    const mk = now.getFullYear() + '-' + now.getMonth();
    feeSchedule.forEach((s, i) => {
      if (Number(s.dueDay) !== day) return;
      const notifKey = 'notif_' + s.id + '_' + mk;
      // Use SW storage via IDB — simplified: use tag to avoid duplicates
      setTimeout(() => {
        self.registration.showNotification('🔔 Fee Due Today — ' + instituteName, {
          body: s.name + ' · ₹' + Number(s.fee).toLocaleString('en-IN') + ' — tap to send reminder',
          icon: './icon.svg',
          tag: 'fee-' + s.id + '-' + mk,
          requireInteraction: true,
          vibrate: [200, 100, 200]
        });
      }, i * 500);
    });
  }

  // Check again in 5 minutes
  checkTimer = setTimeout(checkDueDates, 5 * 60 * 1000);
}

// Handle notification click — open/focus the app
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      if (list.length > 0) return list[0].focus();
      return clients.openWindow('./index.html');
    })
  );
});
