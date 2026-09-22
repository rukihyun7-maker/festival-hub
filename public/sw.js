/* Festival Hub · 웹 푸시 서비스워커
   - push: 서버가 보낸 알림을 기기에 표시
   - notificationclick: 눌렀을 때 해당 화면으로 이동(이미 열려 있으면 그 탭 재사용) */

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  let d = {};
  try { d = event.data ? event.data.json() : {}; } catch (e) { d = {}; }
  const title = d.title || 'Festival Hub';
  const options = {
    body: d.body || '',
    icon: d.icon || '/icon.svg',
    badge: '/icon.svg',
    tag: d.tag || undefined,
    data: { href: d.href || '/' },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const href = (event.notification.data && event.notification.data.href) || '/';
  event.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of all) {
      if ('focus' in c) {
        try { await c.navigate(href); } catch (e) { /* 크로스오리진 등 */ }
        return c.focus();
      }
    }
    if (self.clients.openWindow) return self.clients.openWindow(href);
  })());
});
