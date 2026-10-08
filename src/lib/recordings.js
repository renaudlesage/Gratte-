// Enregistrements audio stockés sur l'appareil (IndexedDB). Non synchronisés : trop volumineux.
const DB = 'gratte-recordings'
const STORE = 'recs'

function open() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: 'id' })
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function tx(mode, fn) {
  const db = await open()
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE, mode)
    const result = fn(t.objectStore(STORE))
    t.oncomplete = () => resolve(result?.result ?? result)
    t.onerror = () => reject(t.error)
  })
}

export const listRecordings = async () => {
  try {
    const all = await tx('readonly', (s) => s.getAll())
    return (all || []).sort((a, b) => b.createdAt - a.createdAt)
  } catch {
    return []
  }
}
export const saveRecording = (rec) => tx('readwrite', (s) => s.put(rec))
export const deleteRecording = (id) => tx('readwrite', (s) => s.delete(id))

export function pickMime() {
  const types = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/webm', 'audio/ogg;codecs=opus']
  return types.find((t) => window.MediaRecorder?.isTypeSupported?.(t)) || ''
}
