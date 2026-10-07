import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { LESSONS } from '../data/lessons.js'

const KEY = 'gratte.progress.v1'
const EMPTY = { tasks: {}, bests: {}, days: [], history: [] }

function load() {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? { ...EMPTY, ...JSON.parse(raw) } : EMPTY
  } catch {
    return EMPTY
  }
}

export const today = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export const pairKey = (a, b) => [a, b].sort().join('|')

const ProgressContext = createContext(null)

export function ProgressProvider({ children }) {
  const [state, setState] = useState(load)

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state))
    } catch {
      /* stockage indisponible : on continue en mémoire */
    }
  }, [state])

  const markPracticed = useCallback(() => {
    const d = today()
    setState((s) => (s.days.includes(d) ? s : { ...s, days: [...s.days, d].slice(-400) }))
  }, [])

  const toggleTask = useCallback((id) => {
    const d = today()
    setState((s) => ({
      ...s,
      tasks: { ...s.tasks, [id]: !s.tasks[id] },
      days: s.days.includes(d) ? s.days : [...s.days, d],
    }))
  }, [])

  const recordChallenge = useCallback(
    (a, b, count) => {
      const key = pairKey(a, b)
      const d = today()
      const isRecord = count > (state.bests[key] || 0)
      setState((s) => ({
        ...s,
        bests: count > (s.bests[key] || 0) ? { ...s.bests, [key]: count } : s.bests,
        history: [...s.history, { date: d, pair: key, count }].slice(-200),
        days: s.days.includes(d) ? s.days : [...s.days, d],
      }))
      return isRecord
    },
    [state.bests],
  )

  const reset = useCallback(() => setState(EMPTY), [])

  const value = useMemo(() => {
    const lessonDone = (l) => l.tasks.every((t) => state.tasks[t.id])
    const doneCount = LESSONS.filter(lessonDone).length
    const nextLesson = LESSONS.find((l) => !lessonDone(l)) || null
    return { ...state, lessonDone, doneCount, nextLesson, streak: computeStreak(state.days), markPracticed, toggleTask, recordChallenge, reset }
  }, [state, markPracticed, toggleTask, recordChallenge, reset])

  return <ProgressContext.Provider value={value}>{children}</ProgressContext.Provider>
}

export const useProgress = () => useContext(ProgressContext)

function computeStreak(days) {
  const set = new Set(days)
  const d = new Date()
  const fmt = (x) => `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`
  // La série reste valable si on n'a pas encore joué aujourd'hui
  if (!set.has(fmt(d))) d.setDate(d.getDate() - 1)
  let n = 0
  while (set.has(fmt(d))) {
    n++
    d.setDate(d.getDate() - 1)
  }
  return n
}
