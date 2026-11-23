// Coach du jour : compose une séance d'environ 15 minutes à partir de la progression.
// Principes : révision espacée des changements d'accords, pratique entrelacée (enchaînement de plusieurs
// accords), tempo augmenté seulement quand l'évaluation est bonne, nouvelle leçon à chaque séance.
import { LESSONS } from '../data/lessons.js'
import { PATTERNS } from '../data/patterns.js'
import { SONGS, parseSong } from '../data/songs.js'
import { getChord } from '../data/chords.js'
import { pairKey } from './pairKey.js'
import { resolveChord, transposeChord } from './music.js'

const DEFAULT_GOAL = 30
const DAY = 86400000

// Accords « connus » : ceux des leçons terminées et de la leçon en cours
export function knownChords(lessonDone) {
  const idx = LESSONS.findIndex((l) => !lessonDone(l))
  const upto = idx === -1 ? LESSONS.length : idx + 1
  return [...new Set(LESSONS.slice(0, upto).flatMap((l) => l.chords))]
}

// Objectif du défi minute pour une paire, tiré des leçons (ex. Em ↔ Am : 30)
const GOALS = {}
for (const l of LESSONS) for (const t of l.tasks) if (t.auto?.type === 'best') GOALS[pairKey(...t.auto.pair)] = t.auto.min

// Paires travaillées dans le parcours jusqu'à la leçon en cours
function lessonPairs(lessonDone) {
  const idx = LESSONS.findIndex((l) => !lessonDone(l))
  const upto = idx === -1 ? LESSONS.length : idx + 1
  return LESSONS.slice(0, upto)
    .flatMap((l) => l.actions)
    .filter((a) => a.params?.mode === 'minute' && a.params.pair)
    .map((a) => a.params.pair)
}

// Petit générateur déterministe : la séance reste la même toute la journée
function seeded(str) {
  let h = 2166136261
  for (const ch of str) h = Math.imul(h ^ ch.charCodeAt(0), 16777619)
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507)
    h = Math.imul(h ^ (h >>> 13), 3266489909)
    return ((h ^= h >>> 16) >>> 0) / 4294967296
  }
}

const daysBetween = (a, b) => Math.round((new Date(b + 'T12:00:00') - new Date(a + 'T12:00:00')) / DAY)

// Priorité d'une paire : écart à l'objectif + temps écoulé depuis la dernière tentative (révision espacée)
export function rankPairs(pairs, bests, history, today) {
  const seen = new Set()
  const out = []
  for (const [a, b] of pairs) {
    const k = pairKey(a, b)
    if (seen.has(k)) continue
    seen.add(k)
    const best = bests[k] || 0
    const goal = GOALS[k] || DEFAULT_GOAL
    const lastDate = history.filter((h) => h.pair === k).map((h) => h.date).sort().pop()
    const since = lastDate ? daysBetween(lastDate, today) : null
    const deficit = Math.max(0, 1 - best / goal)
    // Jamais tentée : en premier ; sinon l'écart à l'objectif, un peu relevé par l'ancienneté
    const priority = since === null ? 2 : deficit + (Math.min(since, 14) / 14) * 0.3
    out.push({ a, b, k, best, goal, since, deficit, priority })
  }
  return out.sort((x, y) => y.priority - x.priority)
}

// Chanson jouable avec les accords connus, au besoin transposée ; on fait tourner les chansons
export function pickSong(known, activity, today) {
  const knownSet = new Set(known)
  const ok = (c) => knownSet.has(c) || (resolveChord(c)?.level === 1 && knownSet.size >= 8)
  const played = (id) => activity.filter((a) => a.type === 'song' && a.key === id).length
  const options = []
  for (const s of SONGS) {
    const chords = [...new Set(parseSong(s.text).bars)]
    for (const t of [0, -2, 2, -5, 5, -3, 3, -1, 1, 4, -4, 6]) {
      const moved = chords.map((c) => transposeChord(c, t))
      if (moved.every(ok)) {
        options.push({ song: s, transpose: t, plays: played(s.id) })
        break
      }
    }
  }
  if (!options.length) return null
  const rnd = seeded('song' + today)
  options.sort((x, y) => x.plays - y.plays || Math.abs(x.transpose) - Math.abs(y.transpose))
  const least = options.filter((o) => o.plays === options[0].plays)
  return least[Math.floor(rnd() * least.length)]
}

export function buildPlan(p, today) {
  const { lessonDone, bests, rhythm, history, activity, nextLesson, doneCount } = p
  const did = (type, key) => activity.some((a) => a.date === today && a.type === type && (key === undefined || a.key === key))
  const rnd = seeded(today)
  const known = knownChords(lessonDone)
  const plan = []

  plan.push({
    id: 'tune',
    minutes: 1,
    title: 'Accorder la guitare',
    detail: 'Toujours commencer juste : l’oreille s’habitue aux bonnes notes.',
    nav: ['outils', { tool: 'accordeur' }],
    done: did('tune'),
  })

  // Deux paires : la plus prioritaire, puis une révision (paire déjà travaillée, la plus ancienne)
  const ranked = rankPairs([...lessonPairs(lessonDone), ...history.map((h) => h.pair.split('|'))], bests, history, today)
  const first = ranked[0]
  // Révision espacée : la paire déjà travaillée la plus ancienne (au moins 3 jours), sinon la suivante en priorité
  const rest = ranked.filter((c) => c !== first)
  const review = rest.filter((c) => c.since !== null && c.since >= 3).sort((x, y) => y.since - x.since)[0] || rest[0]
  for (const [i, c] of [first, review].entries()) {
    if (!c) continue
    const doneToday = history.some((h) => h.date === today && h.pair === c.k)
    const reached = c.best >= c.goal
    plan.push({
      id: i === 0 ? 'pair' : 'review',
      minutes: 2,
      title: `${i === 0 ? 'Défi minute' : 'Révision'} ${c.a} ↔ ${c.b}`,
      detail: !c.best
        ? `Première tentative sur ce changement. Objectif : ${c.goal}.`
        : reached
          ? `Record : ${c.best} (objectif ${c.goal} atteint)${c.since ? `, pas joué depuis ${c.since} j` : ''}. Gardez l’automatisme.`
          : `Record : ${c.best} / objectif ${c.goal}. Visez ${Math.min(c.goal, c.best + 3)} aujourd’hui.`,
      nav: ['pratique', { mode: 'minute', pair: [c.a, c.b] }],
      done: doneToday,
    })
  }

  // Enchaînement entrelacé : 3 ou 4 accords connus (sans barré), tirés au sort pour la journée
  const easy = known.filter((c) => (getChord(c)?.level || 3) <= 2 && getChord(c)?.type !== 'power')
  if (easy.length >= 3) {
    const pool = [...easy]
    const seq = []
    const n = Math.min(4, pool.length)
    while (seq.length < n) seq.push(pool.splice(Math.floor(rnd() * pool.length), 1)[0])
    plan.push({
      id: 'flow',
      minutes: 2,
      title: `Enchaînement ${seq.join(' – ')}`,
      detail: 'Plusieurs accords mélangés : c’est ce qui prépare vraiment aux chansons.',
      nav: ['pratique', { mode: 'enchainement', chords: seq, bpm: 60 }],
      done: did('flow', seq.join('-')),
    })
  }

  // Rythme : premier motif pas encore validé à 90 BPM. Tempo augmenté seulement si la dernière évaluation dépasse 85 %
  const maxLevel = doneCount >= 6 ? 2 : 1
  const pat = PATTERNS.filter((x) => x.level <= maxLevel).find((x) => (rhythm[x.id] || 0) < 90) || PATTERNS[2]
  const validated = rhythm[pat.id] || 0
  const lastScore = [...activity].reverse().find((a) => a.type === 'rhythmscore' && a.key === pat.id)?.value
  const bpm = !validated ? 60 : lastScore >= 85 ? Math.min(120, validated + 5) : validated
  const chord = known.includes('Em') ? 'Em' : known[0] || 'Em'
  plan.push({
    id: 'rhythm',
    minutes: 3,
    title: `Rythme « ${pat.name} » à ${bpm} BPM`,
    detail: !validated
      ? 'Une minute propre au métronome, puis l’évaluation au micro.'
      : bpm > validated
        ? `Validé à ${validated} BPM avec ${lastScore} % : on accélère de 5.`
        : `Validé à ${validated} BPM. Restez à ce tempo jusqu’à dépasser 85 % à l’évaluation.`,
    nav: ['pratique', { mode: 'rythmes', pattern: pat.id, bpm, chord }],
    done: did('rhythm') || did('rhythmscore'),
  })

  // Oreille un jour sur deux : on alterne les compétences d'une séance à l'autre
  const dayNum = Math.floor(new Date(today + 'T12:00:00').getTime() / DAY)
  if (doneCount >= 2 && dayNum % 2 === 0) {
    plan.push({
      id: 'ear',
      minutes: 2,
      title: 'Oreille : quel accord ?',
      detail: 'Reconnaître les accords à l’écoute aide à jouer des chansons sans partition.',
      nav: ['pratique', { mode: 'oreille' }],
      done: did('ear'),
    })
  }

  // Nouvelle leçon : présente à chaque séance tant que le parcours n'est pas fini
  if (nextLesson) {
    plan.push({
      id: 'lesson',
      minutes: 4,
      title: `Leçon : ${nextLesson.title}`,
      detail: nextLesson.intro,
      nav: ['lecons', { id: nextLesson.id }],
      done: false,
    })
  }

  // Chanson jouable avec les accords connus (transposée si besoin), en rotation
  const pick = pickSong(known, activity, today)
  if (pick) {
    plan.push({
      id: 'song',
      minutes: 3,
      title: `Chanson : ${pick.song.title}`,
      detail: pick.transpose
        ? 'Transposée pour n’utiliser que vos accords. Jouez-la en entier avec la grille.'
        : 'Vous connaissez tous ses accords. Jouez-la en entier avec la grille.',
      nav: ['chansons', { song: pick.song.id, transpose: pick.transpose }],
      done: did('song', pick.song.id),
    })
    // Auto-écoute un jour sur trois : s'enregistrer, se réécouter, repérer ce qui accroche
    if (dayNum % 3 === 0 && !plan.some((i) => i.id === 'ear')) {
      plan.push({
        id: 'listen',
        minutes: 2,
        title: 'Auto-écoute',
        detail: `Enregistrez 30 s de « ${pick.song.title} » et réécoutez : où ça accroche ? Ce sera la paire à travailler demain.`,
        nav: ['outils', { tool: 'enregistrer' }],
        done: did('record'),
      })
    }
  }

  return plan
}
