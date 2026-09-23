const CACHE = 'hybrid-1790195335048'
const ASSETS = ['./', './index.html', './manifest.webmanifest', './favicon.png', './apple-touch-icon.png', './icon-192.png', './icon-512.png']
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()))
})
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  )
})
// only a page load may be answered with the app shell; an icon never is
const cached = (req) => caches.match(req).then((m) => m || (req.mode === 'navigate' ? caches.match('./index.html') : undefined))
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return
  const net = fetch(e.request).then((res) => {
    if (res && res.ok) {
      const copy = res.clone()
      caches.open(CACHE).then((c) => c.put(e.request, copy)).catch(() => {})
    }
    return res
  })
  e.waitUntil(net.catch(() => {}))
  e.respondWith(new Promise((resolve) => {
    let done = false
    const finish = (r) => { if (!done && r) { done = true; resolve(r) } }
    net.then(finish, () => cached(e.request).then((m) => {
      if (m) finish(m)
      else if (!done) { done = true; resolve(Response.error()) }
    }))
    setTimeout(() => { cached(e.request).then(finish) }, 2500)
  }))
})
