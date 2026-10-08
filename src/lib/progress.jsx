import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { LESSONS } from '../data/lessons.js'
import { EMPTY, normalizeState } from './merge.js'
import { useSync } from './sync.js'

const KEY = 'gratte.progress.v1'

function load() {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? normalizeState(JSON.parse(raw)) : EMPTY
  } catch {
    return EMPTY
  }
}

const fmt = (x) => `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`
export const today = () => fmt(new Date())
export const pairKey = (a, b) => [a, b].sort().join('|')

const withDay = (s, d) => (s.days.includes(d) ? s.days : [...s.days, d].slice(-400))

const ProgressContext = createContext(null)

export function ProgressProvider({ children }) {
  const [state, setState] = useState(load)
  const stateRef = useRef(state)
  stateRef.current = state

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state))
    } catch {
      /* stockage indisponible : on continue en mémoire */
    }
  }, [state])

  // Synchronisation optionnelle entre appareils (inactive si non configurée)
  const sync = useSync(state, setState)

  const logActivity = useCallback((type, key = '', value = null) => {
    const d = today()
    setState((s) => ({
      ...s,
      activity: [...s.activity, { t: new Date().toISOString(), date: d, type, key, value }].slice(-600),
      days: withDay(s, d),
    }))
  }, [])

  const markPracticed = useCallback(() => {
    const d = today()
    setState((s) => (s.days.includes(d) ? s : { ...s, days: withDay(s, d) }))
  }, [])

  const toggleTask = useCallback((id) => {
    const d = today()
    setState((s) => ({
      ...s,
      tasks: { ...s.tasks, [id]: !s.tasks[id] },
      taskTs: { ...s.taskTs, [id]: Date.now() },
      days: withDay(s, d),
    }))
  }, [])

  const recordChallenge = useCallback((a, b, count) => {
    const key = pairKey(a, b)
    const d = today()
    const isRecord = count > (stateRef.current.bests[key] || 0)
    setState((s) => ({
      ...s,
      bests: count > (s.bests[key] || 0) ? { ...s.bests, [key]: count } : s.bests,
      history: [...s.history, { t: new Date().toISOString(), date: d, pair: key, count }].slice(-300),
      days: withDay(s, d),
    }))
    return isRecord
  }, [])

  // Record générique (jeu d'oreille…) ; renvoie true si battu
  const recordBest = useCallback((key, value) => {
    const isRecord = value > (stateRef.current.bests[key] || 0)
    if (isRecord) setState((s) => ({ ...s, bests: { ...s.bests, [key]: Math.max(value, s.bests[key] || 0) } }))
    return isRecord
  }, [])

  const recordRhythm = useCallback((patternId, bpm) => {
    setState((s) => ({ ...s, rhythm: { ...s.rhythm, [patternId]: Math.max(bpm, s.rhythm[patternId] || 0) } }))
  }, [])

  const saveSong = useCallback((song) => {
    setState((s) => ({ ...s, songs: [...s.songs.filter((x) => x.id !== song.id), { ...song, updatedAt: Date.now() }] }))
  }, [])

  // Suppression « douce » pour qu'elle se propage aux autres appareils
  const deleteSong = useCallback((id) => {
    setState((s) => ({ ...s, songs: s.songs.map((x) => (x.id === id ? { id, deleted: true, updatedAt: Date.now() } : x)) }))
  }, [])

  const reset = useCallback(() => setState(EMPTY), [])

  const value = useMemo(() => {
    const lessonDone = (l) => l.tasks.every((t) => state.tasks[t.id])
    const doneCount = LESSONS.filter(lessonDone).length
    const nextLesson = LESSONS.find((l) => !lessonDone(l)) || null
    const d = today()
    const didToday = (type, key) => state.activity.some((a) => a.date === d && a.type === type && (key === undefined || a.key === key))
    return {
      ...state,
      userSongs: state.songs.filter((s) => !s.deleted),
      lessonDone,
      doneCount,
      nextLesson,
      didToday,
      streak: computeStreak(state.days),
      markPracticed,
      toggleTask,
      recordChallenge,
      recordBest,
      recordRhythm,
      logActivity,
      saveSong,
      deleteSong,
      reset,
      sync,
    }
  }, [state, markPracticed, toggleTask, recordChallenge, recordBest, recordRhythm, logActivity, saveSong, deleteSong, reset, sync])

  return <ProgressContext.Provider value={value}>{children}</ProgressContext.Provider>
}

export const useProgress = () => useContext(ProgressContext)

function computeStreak(days) {
  const set = new Set(days)
  const d = new Date()
  // La série reste valable si on n'a pas encore joué aujourd'hui
  if (!set.has(fmt(d))) d.setDate(d.getDate() - 1)
  let n = 0
  while (set.has(fmt(d))) {
    n++
    d.setDate(d.getDate() - 1)
  }
  return n
}
