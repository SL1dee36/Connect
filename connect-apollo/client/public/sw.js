const CACHE_NAME = 'connect-apollo-v2.0.1.5';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(urlsToCache);
      })
      .catch((err) => console.log('Cache error:', err))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  if (event.request.url.includes('/socket.io/') || event.request.method !== 'GET') {
      return;
  }

  event.respondWith(
    fetch(event.request)
      .catch(() => {
        return caches.match(event.request);
      })
  );
});

self.addEventListener('push', function(event) {
  if (!(self.Notification && self.Notification.permission === 'granted')) {
    return;
  }

  const data = event.data ? event.data.json() : {};
  
  const title = data.title || 'Connect';
  const options = {
    body: data.body || 'Новое сообщение',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: [200, 100, 200],
    tag: data.tag || 'general',
    data: {
      url: data.url || '/',
      room: data.room
    }
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  const targetUrl = event.notification.data.url || '/';
  const room = event.notification.data.room;

  event.waitUntil(
    clients.matchAll({type: 'window', includeUncontrolled: true}).then(windowClients => {
      for (let client of windowClients) {
        if (client.url && 'focus' in client) {
          if(room) client.postMessage({ type: 'NAVIGATE', room: room });
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});