// Coach du jour : compose une séance d'environ 15 minutes à partir de la progression.
import { LESSONS } from '../data/lessons.js'
import { PATTERNS } from '../data/patterns.js'
import { SONGS, parseSong } from '../data/songs.js'
import { pairKey } from './progress.jsx'
import { resolveChord } from './music.js'

const MASTERED = 60

// Accords « connus » : ceux des leçons terminées et de la leçon en cours
export function knownChords(lessonDone) {
  const idx = LESSONS.findIndex((l) => !lessonDone(l))
  const upto = idx === -1 ? LESSONS.length : idx + 1
  return [...new Set(LESSONS.slice(0, upto).flatMap((l) => l.chords))]
}

// Paires travaillées dans le parcours jusqu'à la leçon en cours
function lessonPairs(lessonDone) {
  const idx = LESSONS.findIndex((l) => !lessonDone(l))
  const upto = idx === -1 ? LESSONS.length : idx + 1
  return LESSONS.slice(0, upto)
    .flatMap((l) => l.actions)
    .filter((a) => a.params?.mode === 'minute' && a.params.pair)
    .map((a) => a.params.pair)
}

export function buildPlan(p, today) {
  const { lessonDone, bests, rhythm, history, activity, nextLesson, doneCount } = p
  const did = (type, key) => activity.some((a) => a.date === today && a.type === type && (key === undefined || a.key === key))
  const plan = []

  plan.push({
    id: 'tune',
    minutes: 2,
    title: 'Accorder la guitare',
    detail: 'Toujours commencer juste : l’oreille s’habitue aux bonnes notes.',
    nav: ['outils', { tool: 'accordeur' }],
    done: did('tune'),
  })

  // Paire d'accords la plus faible (ou pas encore tentée)
  const pairs = lessonPairs(lessonDone)
  const seen = new Set()
  const candidates = []
  for (const [a, b] of [...pairs, ...history.map((h) => h.pair.split('|'))]) {
    const k = pairKey(a, b)
    if (seen.has(k)) continue
    seen.add(k)
    candidates.push({ a, b, k, best: bests[k] || 0 })
  }
  const open = candidates.filter((c) => c.best < MASTERED)
  const target = open.find((c) => c.best === 0) || open.sort((x, y) => x.best - y.best)[0]
  if (target) {
    const doneToday = history.some((h) => h.date === today && h.pair === target.k)
    plan.push({
      id: 'pair',
      minutes: 3,
      title: `Défi minute ${target.a} ↔ ${target.b}`,
      detail: target.best ? `Record : ${target.best}. Visez ${target.best + 3} aujourd’hui.` : 'Première tentative sur ce changement.',
      nav: ['pratique', { mode: 'minute', pair: [target.a, target.b] }],
      done: doneToday,
    })
  }

  // Rythme : le premier pas encore à l'aise, 5 BPM plus vite que la dernière fois
  const maxLevel = doneCount >= 6 ? 2 : 1
  const pat = PATTERNS.filter((x) => x.level <= maxLevel).find((x) => (rhythm[x.id] || 0) < 90) || PATTERNS[2]
  const last = rhythm[pat.id] || 0
  const bpm = Math.min(120, last ? last + 5 : 60)
  const known = knownChords(lessonDone)
  plan.push({
    id: 'rhythm',
    minutes: 4,
    title: `Rythme « ${pat.name} » à ${bpm} BPM`,
    detail: last ? `Dernière fois : ${last} BPM. Restez régulier plutôt que rapide.` : 'Une minute propre au métronome avant d’accélérer.',
    nav: ['pratique', { mode: 'rythmes', pattern: pat.id, bpm, chord: known[known.length - 1] || 'Em' }],
    done: did('rhythm'),
  })

  if (doneCount >= 2) {
    plan.push({
      id: 'ear',
      minutes: 2,
      title: 'Oreille : quel accord ?',
      detail: 'Reconnaître les accords à l’écoute aide à jouer des chansons sans partition.',
      nav: ['pratique', { mode: 'oreille' }],
      done: did('ear'),
    })
  }

  // Chanson jouable avec les accords connus
  const knownSet = new Set(known)
  const song = SONGS.find((s) => {
    const chords = [...new Set(parseSong(s.text).bars)]
    return chords.every((c) => knownSet.has(c) || (resolveChord(c)?.level === 1 && knownSet.size >= 6))
  })
  if (song) {
    plan.push({
      id: 'song',
      minutes: 4,
      title: `Chanson : ${song.title}`,
      detail: 'Vous connaissez tous ses accords. Jouez-la en entier avec la grille.',
      nav: ['chansons', { song: song.id }],
      done: did('song'),
    })
  } else if (nextLesson) {
    plan.push({
      id: 'lesson',
      minutes: 4,
      title: `Leçon : ${nextLesson.title}`,
      detail: nextLesson.intro,
      nav: ['lecons', { id: nextLesson.id }],
      done: false,
    })
  }

  return plan
}
