// Coach du jour : compose une séance d'environ 15 minutes à partir de la progression.
// Principes : révision espacée des changements d'accords, pratique entrelacée (enchaînement de plusieurs
// accords), tempo augmenté seulement quand l'évaluation est bonne, nouvelle leçon à chaque séance.
// Encadrement : un point du jour choisi au départ (remonté juste après l’accordage) et un bilan en fin de séance
// (ce qui a accroché, ressenti) qui oriente la séance suivante : paire signalée en tête, rythme au même tempo…
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

// Dernier bilan de séance avant aujourd'hui (7 jours au plus) : il oriente la séance suivante
export function lastBilan(journal = [], today) {
  const prev = journal.filter((e) => e.date < today && (e.snag || e.feel || e.met)).sort((x, y) => x.date.localeCompare(y.date)).pop()
  if (!prev || daysBetween(prev.date, today) > 7) return null
  return prev
}

export function buildPlan(p, today) {
  const { lessonDone, bests, rhythm, history, activity, nextLesson, doneCount, journal = [] } = p
  const did = (type, key) => activity.some((a) => a.date === today && a.type === type && (key === undefined || a.key === key))
  const rnd = seeded(today)
  const known = knownChords(lessonDone)
  const plan = []
  // Bilan de la séance précédente : ce qui a accroché passe en tête, ressenti « difficile » → on consolide
  const prev = lastBilan(journal, today)
  const snag = prev?.snag || ''
  const hard = prev?.feel === 'dur'
  const easyFeel = prev?.feel === 'facile'
  const snagPair = snag.startsWith('pair:') ? snag.slice(5) : null
  const snagChord = snag.startsWith('chord:') ? snag.slice(6) : null
  const snagRhythm = snag.startsWith('rhythm:') ? snag.slice(7) : null
  const when = prev ? (daysBetween(prev.date, today) === 1 ? 'Hier' : 'À la dernière séance') : ''

  plan.push({
    id: 'tune',
    key: 'tune',
    minutes: 1,
    title: 'Accorder la guitare',
    detail: 'Toujours commencer juste : l’oreille s’habitue aux bonnes notes.',
    nav: ['outils', { tool: 'accordeur' }],
    done: did('tune'),
  })

  // Rappel de mémoire (pratique de récupération), plutôt les jours sans oreille pour garder ~15 min
  const dayNum = Math.floor(new Date(today + 'T12:00:00').getTime() / DAY)
  const earDay = doneCount >= 2 && dayNum % 2 === 0
  const pick = pickSong(known, activity, today)
  const listenDay = !earDay && dayNum % 3 === 0 && !!pick
  if (known.length >= 2 && !earDay && !listenDay) {
    plan.push({
      id: 'recall',
      key: 'recall',
      minutes: 2,
      title: 'Rappel : retrouver vos accords de mémoire',
      detail: 'Placez les doigts sans regarder le schéma, puis vérifiez : se souvenir fixe l’accord bien mieux que le relire.',
      nav: ['pratique', { mode: 'rappel' }],
      done: did('recall'),
    })
  }

  // Deux paires : la plus prioritaire, puis une révision (paire déjà travaillée, la plus ancienne)
  const ranked = rankPairs([...lessonPairs(lessonDone), ...history.map((h) => h.pair.split('|'))], bests, history, today)
  // Ce qui a accroché à la dernière séance passe en premier : la paire signalée, ou une paire contenant l'accord signalé
  const flagged =
    (snagPair && (ranked.find((c) => c.k === snagPair) || rankPairs([snagPair.split('|')], bests, history, today)[0])) ||
    (snagChord && ranked.find((c) => c.a === snagChord || c.b === snagChord)) ||
    null
  const first = flagged || ranked[0]
  // Révision espacée : la paire déjà travaillée la plus ancienne (au moins 3 jours), sinon la suivante en priorité
  const rest = ranked.filter((c) => c.k !== first?.k)
  const review = rest.filter((c) => c.since !== null && c.since >= 3).sort((x, y) => y.since - x.since)[0] || rest[0]
  const step = hard ? 2 : easyFeel ? 5 : 3
  for (const [i, c] of [first, review].entries()) {
    if (!c) continue
    const doneToday = history.some((h) => h.date === today && h.pair === c.k)
    const reached = c.best >= c.goal
    const isFlag = i === 0 && flagged
    plan.push({
      id: i === 0 ? 'pair' : 'review',
      key: `pair:${c.k}`,
      minutes: 2,
      title: `${i === 0 ? 'Défi minute' : 'Révision'} ${c.a} ↔ ${c.b}`,
      detail:
        (isFlag ? `${when}, ${snagChord ? `{${snagChord}} a accroché` : 'ce changement a accroché'} : on le reprend en premier. ` : '') +
        (!c.best
          ? `Première tentative sur ce changement. Objectif : ${c.goal}.`
          : reached
            ? `Record : ${c.best} (objectif ${c.goal} atteint)${c.since ? `, pas joué depuis ${c.since} j` : ''}. Gardez l’automatisme.`
            : `Record : ${c.best} / objectif ${c.goal}. Visez ${Math.min(c.goal, c.best + step)} aujourd’hui.`),
      nav: ['pratique', { mode: 'minute', pair: [c.a, c.b] }],
      done: doneToday,
      target: c.best ? Math.min(Math.max(c.goal, c.best), c.best + step) : null,
      flagged: !!isFlag,
    })
  }

  // Enchaînement entrelacé : 3 ou 4 accords connus (sans barré), tirés au sort pour la journée.
  // Ressenti « difficile » la dernière fois : 3 accords seulement. Accord signalé sans paire : il est dans l'enchaînement.
  const easy = known.filter((c) => (getChord(c)?.level || 3) <= 2 && getChord(c)?.type !== 'power')
  if (easy.length >= 3) {
    const pool = [...easy]
    const seq = []
    const n = Math.min(hard ? 3 : 4, pool.length)
    if (snagChord && !flagged && pool.includes(snagChord)) seq.push(pool.splice(pool.indexOf(snagChord), 1)[0])
    while (seq.length < n) seq.push(pool.splice(Math.floor(rnd() * pool.length), 1)[0])
    plan.push({
      id: 'flow',
      key: 'flow',
      minutes: 2,
      title: `Enchaînement ${seq.join(' – ')}`,
      detail: 'Plusieurs accords mélangés : c’est ce qui prépare vraiment aux chansons.',
      nav: ['pratique', { mode: 'enchainement', chords: seq, bpm: 60 }],
      done: did('flow', seq.join('-')),
      chords: seq,
    })
  }

  // Rythme : premier motif pas encore validé à 90 BPM. Tempo augmenté seulement si la dernière évaluation dépasse 85 %
  // et que ce rythme n'a pas accroché à la dernière séance (ni ressenti « difficile »)
  const maxLevel = doneCount >= 6 ? 2 : 1
  const pat =
    (snagRhythm && PATTERNS.find((x) => x.id === snagRhythm)) ||
    PATTERNS.filter((x) => x.level <= maxLevel).find((x) => (rhythm[x.id] || 0) < 90) ||
    PATTERNS[2]
  const validated = rhythm[pat.id] || 0
  const lastScore = [...activity].reverse().find((a) => a.type === 'rhythmscore' && a.key === pat.id)?.value
  const hold = snagRhythm === pat.id || hard
  const bpm = !validated ? 60 : lastScore >= 85 && !hold ? Math.min(120, validated + 5) : validated
  const chord = known.includes('Em') ? 'Em' : known[0] || 'Em'
  plan.push({
    id: 'rhythm',
    key: `rhythm:${pat.id}`,
    minutes: 3,
    title: `Rythme « ${pat.name} » à ${bpm} BPM`,
    detail:
      snagRhythm === pat.id
        ? `${when}, ce rythme a accroché : on garde ${bpm} BPM pour le poser proprement avant d’accélérer.`
        : !validated
          ? 'Une minute propre au métronome, puis l’évaluation au micro.'
          : bpm > validated
            ? `Validé à ${validated} BPM avec ${lastScore} % : on accélère de 5.`
            : `Validé à ${validated} BPM. Restez à ce tempo jusqu’à dépasser 85 % à l’évaluation.`,
    nav: ['pratique', { mode: 'rythmes', pattern: pat.id, bpm, chord }],
    done: did('rhythm') || did('rhythmscore'),
    bpm,
    patternName: pat.name,
  })

  // Oreille un jour sur deux : on alterne les compétences d'une séance à l'autre
  if (earDay) {
    plan.push({
      id: 'ear',
      key: 'ear',
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
      key: `lesson:${nextLesson.id}`,
      minutes: 4,
      title: `Leçon : ${nextLesson.title}`,
      detail: nextLesson.intro,
      nav: ['lecons', { id: nextLesson.id }],
      done: false,
    })
  }

  // Chanson jouable avec les accords connus (transposée si besoin), en rotation
  if (pick) {
    plan.push({
      id: 'song',
      key: `song:${pick.song.id}`,
      minutes: 3,
      title: `Chanson : ${pick.song.title}`,
      detail: pick.transpose
        ? 'Transposée pour n’utiliser que vos accords. Jouez-la en entier avec la grille.'
        : 'Vous connaissez tous ses accords. Jouez-la en entier avec la grille.',
      nav: ['chansons', { song: pick.song.id, transpose: pick.transpose }],
      done: did('song', pick.song.id),
      songTitle: pick.song.title,
    })
    // Auto-écoute un jour sur trois : s'enregistrer, se réécouter, repérer ce qui accroche
    if (listenDay) {
      plan.push({
        id: 'listen',
        key: 'listen',
        minutes: 2,
        title: 'Auto-écoute',
        detail: `Enregistrez 30 s de « ${pick.song.title} » et réécoutez : où ça accroche ? Ce sera la paire à travailler demain.`,
        nav: ['outils', { tool: 'enregistrer' }],
        done: did('record'),
      })
    }
  }

  // Point du jour choisi au départ : l'étape correspondante passe juste après l'accordage
  const goal = journal.find((e) => e.date === today)?.goal
  const gi = goal ? plan.findIndex((i) => i.key === goal) : -1
  if (gi > 1) plan.splice(1, 0, plan.splice(gi, 1)[0])
  if (gi >= 0) plan.find((i) => i.key === goal).goal = true

  return plan
}

// --- Encadrement de la séance (avant / après) ---

// 2 ou 3 points du jour proposés au départ, tirés du plan : précis, à la portée de la séance, centrés sur le geste.
// Un point « pas encore atteint » à la dernière séance est reproposé en premier.
export function goalOptions(plan, journal = [], today) {
  const prev = lastBilan(journal, today)
  const opts = []
  const add = (item, text, again = false) => {
    if (!item || item.done || opts.some((o) => o.key === item.key)) return
    opts.push({ key: item.key, text, again })
  }
  const describe = (item) => {
    if (!item) return null
    if (item.key.startsWith('pair:')) {
      const pair = item.key.slice(5).split('|').map((c) => `{${c}}`).join(' ↔ ')
      return item.target ? `${pair} : viser ${item.target} changements propres` : `${pair} : un premier score, sans se presser`
    }
    if (item.key.startsWith('rhythm:')) return `Rythme « ${item.patternName} » : une minute à ${item.bpm} BPM sans décrocher`
    if (item.key.startsWith('lesson:')) return item.title.replace('Leçon : ', 'Leçon « ') + ' » jusqu’au bout'
    if (item.key.startsWith('song:')) return `« ${item.songTitle} » en entier, sans s’arrêter`
    if (item.key === 'flow') return `Enchaîner ${item.chords.map((c) => `{${c}}`).join(' – ')} sans s’arrêter`
    return item.title
  }
  const byKey = (k) => plan.find((i) => i.key === k)
  if (prev?.goal && prev.met && prev.met !== 'oui') add(byKey(prev.goal), describe(byKey(prev.goal)), true)
  for (const id of ['pair', 'rhythm', 'lesson', 'song', 'flow']) {
    if (opts.length >= 3) break
    const it = plan.find((i) => i.id === id)
    add(it, describe(it))
  }
  return opts.slice(0, 3)
}

// Ce qui peut avoir accroché pendant la séance (une seule touche) : les paires du jour, le rythme, un accord
export function snagOptions(plan) {
  const pairs = plan.filter((i) => i.key.startsWith('pair:')).map((i) => ({ value: i.key, chords: i.key.slice(5).split('|') }))
  const rhythm = plan.find((i) => i.id === 'rhythm')
  const chords = [...new Set([...pairs.flatMap((p) => p.chords), ...(plan.find((i) => i.id === 'flow')?.chords || [])])].slice(0, 5)
  return { pairs, rhythm: rhythm ? { value: rhythm.key, name: rhythm.patternName } : null, chords }
}

// Ce que le bilan change pour la prochaine séance (affiché tout de suite après le bilan)
export function nextStepText(entry, label = (x) => x, t = (vous) => vous) {
  if (!entry) return ''
  const s = entry.snag || ''
  const parts = []
  if (s.startsWith('pair:')) parts.push(`le changement ${s.slice(5).split('|').map(label).join(' ↔ ')} passera en tête`)
  else if (s.startsWith('chord:')) parts.push(`une paire avec ${label(s.slice(6))} passera en tête`)
  else if (s.startsWith('rhythm:')) parts.push('le rythme restera au même tempo pour le poser proprement')
  if (entry.feel === 'dur') parts.push('on consolide : objectifs plus courts, tempo inchangé')
  else if (entry.feel === 'facile') parts.push('on vise un peu plus haut au défi minute')
  if (entry.met && entry.met !== 'oui' && entry.goalText) parts.push(t('le point du jour vous sera reproposé', 'le point du jour te sera reproposé'))
  return parts.length ? `Prochaine séance : ${parts.join(' ; ')}.` : 'Prochaine séance : on garde le même cap.'
}
