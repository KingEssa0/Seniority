// Service worker for handling push notifications even when the web application is closed
self.addEventListener('push', (event) => {
  if (!event.data) {
    console.log('Push event received but contains no data.');
    return;
  }

  try {
    const payload = event.data.json();
    const title = payload.title || 'Seniority Club';
    const options = {
      body: payload.body || 'You have a new update!',
      icon: payload.icon || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150',
      badge: payload.badge || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150',
      tag: payload.tag || 'seniority-notification',
      renotify: true,
      data: {
        url: payload.url || '/'
      }
    };

    event.waitUntil(
      self.registration.showNotification(title, options)
    );
  } catch (error) {
    console.error('Error handling push event:', error);
    // Fallback if data is not JSON
    const text = event.data.text();
    event.waitUntil(
      self.registration.showNotification('Seniority Club', {
        body: text,
        icon: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150',
      })
    );
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const clickUrl = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // If there is an existing tab open, focus it
      for (const client of windowClients) {
        if (client.url.includes(clickUrl) && 'focus' in client) {
          return client.focus();
        }
      }
      // Otherwise, open a new window
      if (clients.openWindow) {
        return clients.openWindow(clickUrl);
      }
    })
  );
});
