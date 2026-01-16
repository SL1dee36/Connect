// client/public/sw.js

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Обработка клика по уведомлению
self.addEventListener('notificationclick', function(event) {
  event.notification.close(); // Закрываем уведомление

  // Пытаемся открыть окно чата или сфокусироваться на уже открытом
  event.waitUntil(
    clients.matchAll({type: 'window', includeUncontrolled: true}).then( windowClients => {
      // Если вкладка уже открыта - фокусируемся на ней
      for (var i = 0; i < windowClients.length; i++) {
        var client = windowClients[i];
        if (client.url && 'focus' in client) {
          return client.focus();
        }
      }
      // Если нет - открываем новую
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});