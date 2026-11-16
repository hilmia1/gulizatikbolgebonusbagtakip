// W•EGE - basit servis çalışanı
// Önce ağdan dener (her zaman güncel sayfa), internet yoksa son kaydedilen sayfayı gösterir.
const CACHE = 'wege-v3';
const SHELL = ['./', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL).catch(() => {})).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;   // Firebase ve CDN istekleri doğrudan gider
  e.respondWith(
    fetch(req).then(res => {
      if (res && res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {}); }
      return res;
    }).catch(() => caches.match(req).then(r => r || (req.mode === 'navigate' ? caches.match('./') : undefined)))
  );
});

// Bildirime dokununca uygulamayı öne getir (açık değilse aç)
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
    for (const c of list) { if ('focus' in c) return c.focus(); }
    return self.clients.openWindow('./');
  }));
});

// ---- Telefona bildirim (Firebase Cloud Messaging): uygulama kapalıyken gelen bildirimi gösterir ----
try {
  importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js', 'https://www.gstatic.com/firebasejs/9.22.0/firebase-messaging-compat.js');
  firebase.initializeApp({ apiKey: 'AIzaSyB-KkoAiXqLZnzelcUrjrFkMe_JOpHqFJU', authDomain: 'wattodolive.firebaseapp.com', projectId: 'wattodolive', storageBucket: 'wattodolive.firebasestorage.app', messagingSenderId: '799554263472', appId: '1:799554263472:web:db2881199271bb86e31e75' });
  const messaging = firebase.messaging();
  // Konsoldan "bildirim" olarak gönderilenleri SDK kendisi gösterir; yalnızca veri (data) mesajlarını biz gösteririz
  messaging.onBackgroundMessage(m => {
    if (m && m.notification) return;
    const d = (m && m.data) || {};
    return self.registration.showNotification(d.title || 'W•EGE', { body: d.body || '', icon: 'icon-192.png', badge: 'icon-192.png', lang: 'tr', tag: d.tag || undefined });
  });
} catch (e) {}
