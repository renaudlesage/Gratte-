// Fusion de deux états de progression (appareil local + copie distante).
// Règles : objectif coché/décoché → le plus récent gagne ; records → le maximum ;
// jours et historiques → union ; chansons → la plus récemment modifiée (suppressions incluses) ;
// carnet de séance (journal) → une entrée par jour, la plus récente gagne.

export const EMPTY = { tasks: {}, taskTs: {}, bests: {}, rhythm: {}, days: [], history: [], activity: [], songs: [], journal: [] }

export const JOURNAL_LIMIT = 120

export function normalizeState(s) {
  const out = { ...EMPTY, ...(s || {}) }
  if (!Array.isArray(out.journal)) out.journal = []
  return out
}

// Carnet de séance : { date, t, goal, goalText, met, snag, feel } — une entrée par date
export function mergeJournal(a = [], b = []) {
  const byDate = new Map()
  for (const e of [...a, ...b]) {
    if (!e || !e.date) continue
    const prev = byDate.get(e.date)
    if (!prev) byDate.set(e.date, e)
    // Même jour sur deux appareils : on garde la plus récente, en complétant ce qui manque
    else byDate.set(e.date, (e.t || 0) >= (prev.t || 0) ? { ...prev, ...strip(e) } : { ...e, ...strip(prev) })
  }
  return [...byDate.values()].sort((x, y) => x.date.localeCompare(y.date)).slice(-JOURNAL_LIMIT)
}
const strip = (e) => Object.fromEntries(Object.entries(e).filter(([, v]) => v !== undefined && v !== null))

const maxMap = (a = {}, b = {}) => {
  const out = { ...a }
  for (const [k, v] of Object.entries(b)) out[k] = Math.max(out[k] || 0, v || 0)
  return out
}

const unionBy = (a = [], b = [], key, limit) => {
  const seen = new Map()
  for (const x of [...a, ...b]) seen.set(key(x), x)
  return [...seen.values()].sort((x, y) => String(x.date || x.t || '').localeCompare(String(y.date || y.t || ''))).slice(-limit)
}

export function mergeStates(localRaw, remoteRaw) {
  const a = normalizeState(localRaw)
  const b = normalizeState(remoteRaw)
  const tasks = {}
  const taskTs = {}
  for (const id of new Set([...Object.keys(a.tasks), ...Object.keys(b.tasks)])) {
    const ta = a.taskTs[id] || (a.tasks[id] ? 1 : 0)
    const tb = b.taskTs[id] || (b.tasks[id] ? 1 : 0)
    const src = tb > ta ? b : a
    tasks[id] = !!src.tasks[id]
    taskTs[id] = Math.max(ta, tb)
  }
  const songs = new Map()
  for (const s of [...a.songs, ...b.songs]) {
    const prev = songs.get(s.id)
    if (!prev || (s.updatedAt || 0) > (prev.updatedAt || 0)) songs.set(s.id, s)
  }
  return {
    tasks,
    taskTs,
    bests: maxMap(a.bests, b.bests),
    rhythm: maxMap(a.rhythm, b.rhythm),
    days: [...new Set([...a.days, ...b.days])].sort().slice(-400),
    history: unionBy(a.history, b.history, (x) => `${x.t || x.date}|${x.pair}|${x.count}`, 300),
    activity: unionBy(a.activity, b.activity, (x) => `${x.t}|${x.type}|${x.key}`, 600),
    songs: [...songs.values()],
    journal: mergeJournal(a.journal, b.journal),
  }
}

// Égalité de contenu (pour éviter des envois inutiles)
export const sameState = (x, y) => JSON.stringify(normalizeState(x)) === JSON.stringify(normalizeState(y))
