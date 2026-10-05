// Retire the old planner's cache worker after the template replacement.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    await caches.delete('gp-v1');
    await self.registration.unregister();
    const clients = await self.clients.matchAll({type:'window'});
    for (const client of clients) client.navigate(client.url);
  })());
});
