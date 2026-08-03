/* أمان للديون - Service Worker (تخزين مؤقت أساسي للعمل دون اتصال) */
const CACHE_NAME = "aman-debts-v1";
const CORE_ASSETS = [
  "index.html", "login.html", "dashboard.html", "customers.html", "customer.html",
  "new-debt.html", "payment.html", "invoices.html", "reports.html", "settings.html",
  "css/style.css",
  "js/app.js", "js/firebase.js", "js/auth.js", "js/customers.js", "js/debts.js",
  "js/payments.js", "js/invoices.js", "js/reports.js", "js/settings.js",
  "manifest.json",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    caches.match(event.request).then((cached) => {
      return (
        cached ||
        fetch(event.request)
          .then((res) => {
            const clone = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone)).catch(() => {});
            return res;
          })
          .catch(() => cached)
      );
    })
  );
});
