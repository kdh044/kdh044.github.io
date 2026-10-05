// Retire the old planner cache. Private API responses must never be cached.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) if (key.startsWith('gp-')) await caches.delete(key);
    await self.registration.unregister();
    await self.clients.claim();
  })());
});
