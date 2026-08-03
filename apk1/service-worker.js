/* =========================================================
   أمان للديون - service-worker.js
   يوفر تخزينًا مؤقتًا للملفات الأساسية لدعم العمل دون اتصال
   وتجربة تثبيت تشبه تطبيقات Android الاحترافية.
   ========================================================= */

const CACHE_NAME = 'aman-debts-cache-v1';
const CORE_ASSETS = [
  './index.html',
  './login.html',
  './dashboard.html',
  './customers.html',
  './customer.html',
  './new-debt.html',
  './payment.html',
  './invoices.html',
  './reports.html',
  './settings.html',
  './manifest.json',
  './css/style.css',
  './css/dark.css',
  './js/app.js',
  './js/auth.js',
  './js/firebase.js',
  './js/customers.js',
  './js/debts.js',
  './js/payments.js',
  './js/invoices.js',
  './js/reports.js',
  './js/settings.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(CORE_ASSETS)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
    ))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // شبكة أولًا للملفات الديناميكية (CDN)، وذاكرة تخزين مؤقت أولًا لملفات التطبيق الأساسية
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then(cached => {
      return cached || fetch(event.request).then(response => {
        // تخزين النسخ الجديدة من ملفات نفس النطاق فقط
        if (event.request.url.startsWith(self.location.origin)){
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => cached);
    })
  );
});
