// Service worker de Gratte : l'appli fonctionne hors connexion après la première visite.
// Page : réseau d'abord (pour recevoir les mises à jour), sinon la version en cache.
// Fichiers de l'appli (noms versionnés par Vite) et polices : cache d'abord.
const CACHE = 'gratte-v4'
const CORE = ['/', '/index.html', '/manifest.webmanifest', '/favicon.svg', '/icons/icon-192.png', '/icons/icon-512.png']

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(CORE)).then(() => self.skipWaiting()))
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (e) => {
  const req = e.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  const sameOrigin = url.origin === self.location.origin
  const isFont = url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com'
  if (!sameOrigin && !isFont) return // Supabase et autres : jamais mis en cache

  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone()
          caches.open(CACHE).then((c) => c.put('/index.html', copy))
          return res
        })
        .catch(() => caches.match('/index.html')),
    )
    return
  }

  e.respondWith(
    caches.match(req).then(
      (hit) =>
        hit ||
        fetch(req).then((res) => {
          if (res.ok || res.type === 'opaque') {
            const copy = res.clone()
            caches.open(CACHE).then((c) => c.put(req, copy))
          }
          return res
        }),
    ),
  )
})

// ---------- Rappel quotidien (appli installée, Chrome/Android) ----------
function kvGet(key) {
  return new Promise((resolve) => {
    const req = indexedDB.open('gratte-kv', 1)
    req.onupgradeneeded = () => req.result.createObjectStore('kv')
    req.onerror = () => resolve(undefined)
    req.onsuccess = () => {
      const t = req.result.transaction('kv', 'readonly').objectStore('kv').get(key)
      t.onsuccess = () => resolve(t.result)
      t.onerror = () => resolve(undefined)
    }
  })
}
function kvPut(key, value) {
  return new Promise((resolve) => {
    const req = indexedDB.open('gratte-kv', 1)
    req.onupgradeneeded = () => req.result.createObjectStore('kv')
    req.onerror = () => resolve()
    req.onsuccess = () => {
      const t = req.result.transaction('kv', 'readwrite')
      t.objectStore('kv').put(value, key)
      t.oncomplete = () => resolve()
      t.onerror = () => resolve()
    }
  })
}
const todayStr = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

self.addEventListener('periodicsync', (e) => {
  if (e.tag !== 'gratte-rappel') return
  e.waitUntil((async () => {
    const r = await kvGet('reminder')
    if (!r || !r.enabled) return
    const now = new Date()
    const today = todayStr()
    if (now.getHours() * 60 + now.getMinutes() < r.hour * 60 + r.minute) return
    if ((await kvGet('lastPractice')) === today || (await kvGet('lastNotified')) === today) return
    await kvPut('lastNotified', today)
    await self.registration.showNotification('C’est l’heure de la guitare 🎸', {
      body: 'Votre séance du jour vous attend : 15 minutes avec le coach.',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      tag: 'gratte-rappel',
    })
  })())
})

self.addEventListener('notificationclick', (e) => {
  e.notification.close()
  e.waitUntil(self.clients.matchAll({ type: 'window' }).then((list) => {
    const c = list.find((w) => 'focus' in w)
    return c ? c.focus() : self.clients.openWindow('/')
  }))
})
