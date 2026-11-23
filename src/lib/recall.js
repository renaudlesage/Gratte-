// Rappel des formes d'accords : planification espacée de type Leitner.
// Chaque essai est enregistré dans l'activité : logActivity('recall', chordId, 1 | 0).
// Boîte = nombre de réussites consécutives (au plus une promotion par jour, plafonnée à 5).
// Intervalle avant la prochaine révision : boîte 0 → tout de suite, puis 1 / 2 / 4 / 8 / 16 jours.

export const RECALL_TYPE = 'recall'
export const INTERVALS = [1, 2, 4, 8, 16]
export const MAX_BOX = INTERVALS.length
export const SESSION_MAX = 5
// Nouveaux accords par série quand des révisions attendent : on garde de la place pour les révisions
export const NEW_MAX_WITH_REVIEWS = 3

const DAY = 86400000
const parseDay = (d) => {
  const [y, m, j] = String(d).split('-').map(Number)
  return Date.UTC(y, (m || 1) - 1, j || 1)
}
export const daysBetween = (a, b) => Math.round((parseDay(b) - parseDay(a)) / DAY)
export const addDays = (d, n) => {
  const x = new Date(parseDay(d) + n * DAY)
  return `${x.getUTCFullYear()}-${String(x.getUTCMonth() + 1).padStart(2, '0')}-${String(x.getUTCDate()).padStart(2, '0')}`
}
export const intervalFor = (box) => (box <= 0 ? 0 : INTERVALS[Math.min(box, MAX_BOX) - 1])

// État de chaque accord à partir de l'activité (ordre chronologique)
export function recallStats(activity = []) {
  const out = {}
  for (const a of activity) {
    if (!a || a.type !== RECALL_TYPE || !a.key) continue
    const s = (out[a.key] ||= { id: a.key, attempts: 0, successes: 0, box: 0, lastDate: null, lastT: null, lastResult: null, promotedOn: null, lastFailDate: null })
    const ok = Number(a.value) >= 1
    s.attempts++
    if (ok) {
      s.successes++
      // Une seule promotion par jour : réussir 5 fois le même soir ne vaut pas 16 jours de mémoire
      if (s.promotedOn !== a.date) {
        s.box = Math.min(MAX_BOX, s.box + 1)
        s.promotedOn = a.date
      }
    } else {
      s.box = 0
      s.promotedOn = null
      s.lastFailDate = a.date
    }
    s.lastDate = a.date
    s.lastT = a.t
    s.lastResult = ok ? 1 : 0
  }
  for (const s of Object.values(out)) s.due = s.lastDate ? addDays(s.lastDate, intervalFor(s.box)) : null
  return out
}

// Planifie une série : jamais vus d'abord (dans l'ordre du parcours), puis erreurs récentes,
// puis révisions dues (les plus en retard d'abord). Seulement des accords connus.
export function planRecall(known = [], activity = [], today, { max = SESSION_MAX } = {}) {
  const stats = recallStats(activity)
  const ids = [...new Set(known)]
  const fresh = ids.filter((id) => !stats[id])
  const seen = ids.filter((id) => stats[id]).map((id) => ({ ...stats[id], overdue: daysBetween(stats[id].due, today) }))
  const errors = seen
    .filter((s) => s.lastResult === 0)
    .sort((a, b) => (b.lastT || '').localeCompare(a.lastT || ''))
  const reviews = seen
    .filter((s) => s.lastResult !== 0 && s.overdue >= 0)
    .sort((a, b) => b.overdue - a.overdue || a.box - b.box)
  const waiting = errors.length + reviews.length
  const newCap = waiting ? Math.max(max - waiting, NEW_MAX_WITH_REVIEWS) : max
  const due = [...fresh.slice(0, newCap), ...errors.map((s) => s.id), ...reviews.map((s) => s.id)].slice(0, max)
  const upcoming = seen
    .filter((s) => s.lastResult !== 0 && s.overdue < 0)
    .sort((a, b) => b.overdue - a.overdue)
    .map((s) => ({ id: s.id, due: s.due, inDays: -s.overdue, box: s.box }))
  return { due, upcoming, stats }
}

// Série « quand même » : rien n'est dû, on prend les prochaines échéances
export function practiceAnyway(plan, max = SESSION_MAX) {
  return plan.upcoming.slice(0, max).map((u) => u.id)
}

// Prochaine révision prévue si l'on enregistre ce résultat aujourd'hui
export function nextDueAfter(stat, ok, today) {
  let box = stat?.box || 0
  if (!ok) box = 0
  else if (stat?.promotedOn !== today) box = Math.min(MAX_BOX, box + 1)
  return { box, inDays: intervalFor(box), due: addDays(today, intervalFor(box)) }
}

// Comparaison d'une réponse à la forme attendue, corde par corde (indice 0 = corde 6).
// Les numéros de doigts sont ignorés ; un barré est juste si chaque corde est à la bonne case.
// Statuts : ok | wrong-fret | missing (devrait être appuyée) | should-open | should-mute
export function compareShape(target, answer) {
  const strings = target.map((t, s) => {
    const a = answer[s] ?? 0
    let status = 'ok'
    if (t > 0) status = a === t ? 'ok' : a > 0 ? 'wrong-fret' : 'missing'
    else if (t === 0) status = a === 0 ? 'ok' : 'should-open'
    else status = a < 0 ? 'ok' : 'should-mute'
    return { string: s, expected: t, given: a, status }
  })
  const okCount = strings.filter((x) => x.status === 'ok').length
  return { ok: okCount === target.length, okCount, strings }
}

// Phrases-repères (double codage : forme + son + mot). {X} = nom d'accord, affiché selon la notation.
export const CUES = {
  Em: '2 doigts côte à côte en case 2, cordes de La et de Ré ; les 6 cordes sonnent.',
  Am: 'forme de {E} décalée d’une corde vers l’aigu ; corde 6 étouffée.',
  E: 'forme de {Am} décalée d’une corde vers le grave ; les 6 cordes sonnent.',
  Dm: 'petit triangle sur les 3 cordes aiguës, pointe vers le Mi aigu (case 1) ; on part de la corde de Ré.',
  D: 'petit triangle sur les 3 cordes aiguës, pointe vers la corde de Si (case 3) ; on part de la corde de Ré.',
  A: '3 doigts alignés en case 2 sur Ré, Sol et Si ; corde 6 étouffée.',
  G: 'les deux cordes extrêmes en case 3, les trois du milieu à vide.',
  C: 'escalier en diagonale : case 3, 2, vide, 1 ; corde 6 étouffée.',
  Cmaj7: '{C} sans l’index : la corde de Si sonne à vide.',
  Cadd9: '{C} avec la corde de Si montée en case 3.',
  Asus2: '{A} sans le doigt sur la corde de Si.',
  Dsus4: '{D} avec le Mi aigu monté en case 3.',
  Fmaj7: 'escalier 3-2-1 sur Ré, Sol, Si ; Mi aigu à vide.',
  E7: '{E} sans le doigt sur la corde de Ré.',
  A7: '{A} en laissant la corde de Sol à vide.',
  D7: 'triangle de {D} retourné : cases 2-1-2 sur Sol, Si, Mi aigu.',
  G7: '{G} avec le Mi aigu en case 1.',
  C7: '{C} + l’auriculaire sur la corde de Sol, case 3.',
  B7: 'cases 2-1-2 sur La, Ré, Sol ; Si à vide ; Mi aigu en case 2.',
  E5: 'corde 6 à vide + case 2 sur La et Ré ; le reste étouffé.',
  A5: 'forme de {E5} décalée d’une corde : La à vide + case 2 sur Ré et Sol.',
  D5: 'Ré à vide + case 2 sur Sol et case 3 sur Si.',
  G5: 'case 3 sur la corde 6, case 5 sur La et Ré.',
  C5: 'forme de {G5} décalée d’une corde vers l’aigu.',
  F5: 'forme de {G5} descendue en case 1.',
  F: 'forme de {E} avec l’index en barré case 1.',
  Bm: 'forme de {Am} barrée en case 2.',
  'F#m': 'forme de {Em} barrée en case 2.',
  B: 'forme de {A} barrée en case 2.',
}

export function cueFor(id, label = (x) => x) {
  const c = CUES[id]
  if (!c) return ''
  return `${label(id)} = ${c.replace(/\{([^}]+)\}/g, (_, x) => label(x))}`
}
