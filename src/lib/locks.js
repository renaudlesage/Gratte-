// Dossiers de partitions protégés par un code.
// Verrou léger, côté appareil : il évite qu'on tombe sur ces morceaux par hasard, mais ce n'est pas une
// protection forte (le code n'est stocké que sous forme d'empreinte, et l'appli fonctionne hors ligne).
const KEY = 'gratte.unlocked'

export const LOCKED_GROUPS = {
  arquebusiers: { hash: '8d28ffa5' },
}

const fnv = (s) => {
  let h = 0x811c9dc5
  for (const c of s) {
    h ^= c.codePointAt(0)
    h = Math.imul(h, 0x01000193) >>> 0
  }
  return h.toString(16)
}

export function readUnlocked() {
  try {
    return new Set(JSON.parse(localStorage.getItem(KEY) || '[]'))
  } catch {
    return new Set()
  }
}

function save(set) {
  try {
    localStorage.setItem(KEY, JSON.stringify([...set]))
  } catch {
    /* stockage indisponible : déverrouillé pour cette session seulement */
  }
}

export function tryUnlock(group, code, current) {
  const g = LOCKED_GROUPS[group]
  if (!g || fnv(`gratte:${group}:${String(code).trim()}`) !== g.hash) return null
  const next = new Set(current)
  next.add(group)
  save(next)
  return next
}

export function lock(group, current) {
  const next = new Set(current)
  next.delete(group)
  save(next)
  return next
}

export const isLocked = (kind, unlocked) => !!LOCKED_GROUPS[kind] && !unlocked.has(kind)
