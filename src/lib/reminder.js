// Rappel quotidien.
// 1) Événement d'agenda récurrent (.ics) : fiable partout (iPhone, Android, Outlook, Google Agenda).
// 2) Notification de l'appli installée : via la synchronisation périodique (Chrome / Android, appli installée).
//    Le navigateur décide de l'heure exacte : c'est un « au mieux ».

const KV_DB = 'gratte-kv'

function kv() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(KV_DB, 1)
    req.onupgradeneeded = () => req.result.createObjectStore('kv')
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function kvSet(key, value) {
  try {
    const db = await kv()
    await new Promise((res, rej) => {
      const t = db.transaction('kv', 'readwrite')
      t.objectStore('kv').put(value, key)
      t.oncomplete = res
      t.onerror = () => rej(t.error)
    })
  } catch {
    /* stockage indisponible */
  }
}

const pad = (n) => String(n).padStart(2, '0')

// Intention de mise en œuvre : « Quand [moment précis], je prends ma guitare. »
// Un moment de la journée qui arrive de toute façon (pas « quand j'aurai le temps ») ; l'heure sert au rappel.
export const CUES = [
  { id: 'reveil', when: 'Au réveil', hour: 7, minute: 30 },
  { id: 'rentree', when: 'En rentrant', hour: 17, minute: 30 },
  { id: 'diner', when: 'Après le dîner', hour: 20, minute: 0 },
  { id: 'autre', when: 'À heure fixe', hour: null, minute: null },
]

// Phrase du plan, à la première personne : « Après le dîner, je prends ma guitare. »
export function intentionText(reminder) {
  const cue = CUES.find((c) => c.id === reminder?.cue)
  if (!cue) return ''
  const when = cue.id === 'autre' ? `À ${reminder.hour} h ${pad(reminder.minute)}` : cue.when
  return `${when}, je prends ma guitare.`
}

// Texte iCalendar : virgules, points-virgules et barres obliques inverses échappés
const esc = (t) => t.replace(/[\\,;]/g, (c) => '\\' + c)

export function buildIcs({ hour, minute, cue }, url) {
  const plan = intentionText({ hour, minute, cue })
  const now = new Date()
  const start = new Date(now)
  start.setHours(hour, minute, 0, 0)
  if (start < now) start.setDate(start.getDate() + 1)
  const local = (d) => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`
  const stamp = now.toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z')
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Gratte//Rappel guitare//FR',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:gratte-rappel-${Date.now()}@gratte`,
    `DTSTAMP:${stamp}`,
    `DTSTART:${local(start)}`,
    'DURATION:PT15M',
    'RRULE:FREQ=DAILY',
    plan ? `SUMMARY:🎸 ${esc(plan)}` : 'SUMMARY:🎸 Séance de guitare (Gratte)',
    `DESCRIPTION:${plan ? `Mon plan : ${esc(plan)} ` : ''}15 minutes avec le coach du jour. Si le temps manque : juste le défi minute (2 min). ${url}`,
    `URL:${url}`,
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    'DESCRIPTION:C’est l’heure de votre séance de guitare',
    'TRIGGER:PT0M',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n')
}

export const notificationsSupported = () =>
  'Notification' in window && 'serviceWorker' in navigator && typeof window.PeriodicSyncManager !== 'undefined'

export async function enableNotifications(reminder) {
  const perm = await Notification.requestPermission()
  if (perm !== 'granted') return { ok: false, msg: 'Notifications refusées. Vous pouvez les autoriser dans les réglages du navigateur.' }
  await kvSet('reminder', { ...reminder, enabled: true })
  try {
    const reg = await navigator.serviceWorker.ready
    const status = await navigator.permissions.query({ name: 'periodic-background-sync' }).catch(() => null)
    if (status && status.state !== 'granted') return { ok: false, msg: 'Le navigateur n’autorise les rappels en arrière-plan que pour l’appli installée. Installez-la puis réessayez, ou utilisez le rappel d’agenda.' }
    await reg.periodicSync.register('gratte-rappel', { minInterval: 60 * 60 * 1000 })
    return { ok: true, msg: 'Rappel activé. Le navigateur choisit le moment exact : il peut avoir un peu de retard.' }
  } catch {
    return { ok: false, msg: 'Rappels en arrière-plan indisponibles ici. Le rappel d’agenda fonctionne partout.' }
  }
}

export async function disableNotifications() {
  await kvSet('reminder', { enabled: false })
  try {
    const reg = await navigator.serviceWorker.ready
    await reg.periodicSync?.unregister('gratte-rappel')
  } catch {
    /* rien à désactiver */
  }
}
