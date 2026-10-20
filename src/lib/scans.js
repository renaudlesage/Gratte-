// Partitions photographiées (pages de recueil) stockées sur l'appareil (IndexedDB).
// Elles ne font pas partie du code de l'appli : chacun importe ses propres pages (photos ou archive .zip).
const DB = 'gratte-scans'
const STORE = 'pages'

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
    const r = fn(t.objectStore(STORE))
    t.oncomplete = () => resolve(r?.result ?? r)
    t.onerror = () => reject(t.error)
  })
}

export async function listScans(folder) {
  try {
    const all = (await tx('readonly', (s) => s.getAll())) || []
    return all.filter((p) => p.folder === folder).sort((a, b) => a.page - b.page || a.title.localeCompare(b.title))
  } catch {
    return []
  }
}
export const saveScan = (p) => tx('readwrite', (s) => s.put(p))
export const deleteScan = (id) => tx('readwrite', (s) => s.delete(id))

// « 12 - Le Chant du Départ.jpg » → { page: 12, title: 'Le Chant du Départ' }
export function parseName(name, fallbackPage) {
  const base = name.replace(/^.*[\\/]/, '').replace(/\.[a-z0-9]+$/i, '')
  const m = base.match(/^\s*(\d{1,3})\s*[-–._)]\s*(.+)$/)
  if (m) return { page: Number(m[1]), title: m[2].trim() }
  return { page: fallbackPage, title: base.replace(/[_-]+/g, ' ').trim() || `Page ${fallbackPage}` }
}

const IMG = /\.(jpe?g|png|webp|gif)$/i
const MIME = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif' }

// Lecture d'une archive .zip sans bibliothèque : répertoire central + DecompressionStream pour les fichiers compressés
export async function readZipImages(file) {
  const buf = new Uint8Array(await file.arrayBuffer())
  const dv = new DataView(buf.buffer)
  let eocd = -1
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 66000); i--) {
    if (dv.getUint32(i, true) === 0x06054b50) {
      eocd = i
      break
    }
  }
  if (eocd < 0) throw new Error('Archive .zip illisible')
  const count = dv.getUint16(eocd + 10, true)
  let p = dv.getUint32(eocd + 16, true)
  const out = []
  const dec = new TextDecoder()
  for (let k = 0; k < count; k++) {
    if (dv.getUint32(p, true) !== 0x02014b50) break
    const method = dv.getUint16(p + 10, true)
    const csize = dv.getUint32(p + 20, true)
    const nlen = dv.getUint16(p + 28, true)
    const xlen = dv.getUint16(p + 30, true)
    const clen = dv.getUint16(p + 32, true)
    const local = dv.getUint32(p + 42, true)
    const name = dec.decode(buf.subarray(p + 46, p + 46 + nlen))
    p += 46 + nlen + xlen + clen
    if (!IMG.test(name) || name.includes('__MACOSX')) continue
    const start = local + 30 + dv.getUint16(local + 26, true) + dv.getUint16(local + 28, true)
    let data = buf.subarray(start, start + csize)
    if (method === 8) {
      const ds = new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw'))
      data = new Uint8Array(await new Response(ds).arrayBuffer())
    } else if (method !== 0) continue
    const ext = name.split('.').pop().toLowerCase()
    out.push({ name, blob: new Blob([data], { type: MIME[ext] || 'image/jpeg' }) })
  }
  return out
}

// Importe des photos et/ou des archives .zip dans un dossier
export async function importFiles(folder, files, existing) {
  const items = []
  for (const f of files) {
    if (/\.zip$/i.test(f.name) || f.type === 'application/zip') items.push(...(await readZipImages(f)))
    else if (f.type.startsWith('image/') || IMG.test(f.name)) items.push({ name: f.name, blob: f })
  }
  let next = Math.max(0, ...existing.map((s) => s.page)) + 1
  const saved = []
  for (const it of items.sort((a, b) => a.name.localeCompare(b.name, 'fr', { numeric: true }))) {
    const { page, title } = parseName(it.name, next)
    if (page >= next) next = page + 1
    const rec = { id: `${folder}:${Date.now().toString(36)}:${Math.random().toString(36).slice(2, 7)}`, folder, page, title, rot: 0, blob: it.blob, addedAt: Date.now() }
    await saveScan(rec)
    saved.push(rec)
  }
  return saved.length
}
