const CACHE = 'hybrid-1790217549201'
const ART = 'hybrid-art-v1'
const ASSETS = ['./', './index.html', './manifest.webmanifest', './favicon.png', './apple-touch-icon.png', './icon-192.png', './icon-512.png']
const ART_DIR = new URL('art/', self.registration.scope).href
const ART_MANIFEST = ART_DIR + 'manifest.json'
const ART_KEEP = new Set(["hero-bar-rims-1440.05b760c9.webp","hero-bar-lit-1440.fddcbabf.webp","hero-bar-glint-1440.fb87d7cc.webp","hero-legs-rims-1440.6fcf3488.webp","hero-legs-lit-1440.8b6825a1.webp","hero-legs-glint-1440.c30c0074.webp","hero-core-rims-1440.af0690f5.webp","hero-core-lit-1440.33a820c7.webp","hero-core-glint-1440.1d99f28c.webp","hero-run-rims-1440.eee3f1c0.webp","hero-run-lit-1440.4b6e86e5.webp","hero-run-glint-1440.80b35594.webp","hero-rest-rims-1440.7743e1e1.webp","hero-rest-lit-1440.2ac2055b.webp","hero-rest-glint-1440.61283e08.webp"])
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()))
})
const pruneArt = () => caches.open(ART).then((c) => c.keys().then((reqs) => Promise.all(
  reqs.filter((r) => !ART_KEEP.has(r.url.slice(ART_DIR.length).split('?')[0])).map((r) => c.delete(r))
))).catch(() => {})
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE && k !== ART).map((k) => caches.delete(k))))
      .then(pruneArt)
      .catch(() => {})
      .then(() => self.clients.claim())
  )
})
const artFirst = (req) => caches.open(ART).then((c) => c.match(req, { ignoreSearch: true }).then((hit) => hit || fetch(req).then((res) => {
  if (res && res.status === 200 && res.type === 'basic') c.put(req, res.clone()).catch(() => {})
  return res
})))
// only a page load may be answered with the app shell; an icon never is
const cached = (req) => caches.match(req).then((m) => m || (req.mode === 'navigate' ? caches.match('./index.html') : undefined))
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return
  const url = e.request.url.split('#')[0]
  if (url.startsWith(ART_DIR) && url.split('?')[0] !== ART_MANIFEST) {
    if (e.request.headers.has('range')) return
    e.respondWith(artFirst(e.request))
    return
  }
  const net = fetch(e.request).then((res) => {
    if (res && res.status === 200) {
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
