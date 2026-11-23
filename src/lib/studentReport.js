// Résumé compact de la progression d'un élève, envoyé à son prof (gratte_student_push, < 20 ko).
// {
//   v: 1,
//   lessons: { l2: { l2t1: 'preuve', l2t2: 'coche' }, … }  objectifs atteints seulement
//   pairs:   { 'Am|Em': 32, … }      records du défi minute (changements par minute)
//   rythme:  { folk: 85, … }         meilleur score à l'évaluation au micro (%)
//   tempo:   { folk: 80, … }         tempo réussi le plus rapide (BPM)
//   days: 12, streak: 3, last: '2026-11-20', week: 4   jours de pratique (total, série, dernier, 7 derniers jours)
// }
import { LESSONS } from '../data/lessons.js'
import { taskProof } from './evidence.js'

const fmt = (x) => `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`

function streakOf(set) {
  const d = new Date()
  if (!set.has(fmt(d))) d.setDate(d.getDate() - 1) // la série tient si on n'a pas encore joué aujourd'hui
  let n = 0
  while (set.has(fmt(d))) {
    n++
    d.setDate(d.getDate() - 1)
  }
  return n
}

const num = (v) => (Number.isFinite(+v) ? Math.round(+v) : 0)

export function buildSummary(state) {
  const s = state || {}
  const lessons = {}
  for (const l of LESSONS) {
    const met = {}
    for (const t of l.tasks) {
      if (taskProof(t, s)) met[t.id] = 'preuve'
      else if (s.tasks?.[t.id]) met[t.id] = 'coche'
    }
    if (Object.keys(met).length) lessons[l.id] = met
  }

  const pairs = {}
  const rythme = {}
  for (const [k, v] of Object.entries(s.bests || {})) {
    if (!(v > 0)) continue
    if (k.startsWith('rythme:')) rythme[k.slice(7)] = num(v)
    else if (k.includes('|')) pairs[k] = num(v)
  }
  const tempo = {}
  for (const [k, v] of Object.entries(s.rhythm || {})) if (v > 0) tempo[k] = num(v)

  const days = [...new Set(s.days || [])].sort()
  const set = new Set(days)
  const weekAgo = new Date()
  weekAgo.setDate(weekAgo.getDate() - 6)
  const from = fmt(weekAgo)

  return {
    v: 1,
    lessons,
    pairs,
    rythme,
    tempo,
    days: days.length,
    streak: streakOf(set),
    last: days[days.length - 1] || null,
    week: days.filter((d) => d >= from).length,
  }
}

// Comptes par leçon à partir d'un résumé reçu : { preuve, coche, total }
export function lessonCounts(summary, lesson) {
  const met = summary?.lessons?.[lesson.id] || {}
  let preuve = 0
  let coche = 0
  for (const t of lesson.tasks) {
    if (met[t.id] === 'preuve') preuve++
    else if (met[t.id] === 'coche') coche++
  }
  return { preuve, coche, total: lesson.tasks.length }
}
