// Badges : calculés à partir de la progression (rien n'est stocké en plus)
import { LESSONS } from '../data/lessons.js'

const fmt = (x) => `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`

export function maxStreak(days) {
  const sorted = [...new Set(days)].sort()
  let best = 0
  let run = 0
  let prev = null
  for (const d of sorted) {
    const dt = new Date(d + 'T12:00:00')
    if (prev) {
      const p = new Date(prev)
      p.setDate(p.getDate() + 1)
      run = fmt(p) === d ? run + 1 : 1
    } else run = 1
    best = Math.max(best, run)
    prev = dt
  }
  return best
}

export function computeBadges(p) {
  const { days, activity, bests, rhythm, tasks, songs } = p
  const has = (type, pred = () => true) => activity.some((a) => a.type === type && pred(a))
  const pairBest = Math.max(0, ...Object.entries(bests).filter(([k]) => k.includes('|')).map(([, v]) => v))
  const rhythmScore = Math.max(0, ...Object.entries(bests).filter(([k]) => k.startsWith('rythme:')).map(([, v]) => v))
  const earBest = Math.max(0, ...Object.entries(bests).filter(([k]) => k.startsWith('ear:')).map(([, v]) => v))
  const done = (id) => {
    const l = LESSONS.find((x) => x.id === id)
    return l ? l.tasks.every((t) => tasks[t.id]) : false
  }
  const pathDone = (n) => LESSONS.filter((l) => (l.parcours || 1) === n).every((l) => done(l.id))
  const streak = maxStreak(days)
  const B = (id, icon, title, desc, earned) => ({ id, icon, title, desc, earned: !!earned })
  return [
    B('premier-pas', '🎸', 'Premiers pas', 'Une première séance de pratique', days.length >= 1),
    B('accordeur', '🎯', 'Oreille juste', 'Accorder sa guitare avec l’accordeur', has('tune')),
    B('verifie', '🎤', 'Validé au micro', 'Un accord reconnu par la vérification au micro', has('check')),
    B('serie-3', '🔥', 'Sur la lancée', '3 jours de pratique d’affilée', streak >= 3),
    B('serie-7', '📅', 'Une semaine complète', '7 jours d’affilée', streak >= 7),
    B('serie-30', '🏅', 'Habitude installée', '30 jours d’affilée', streak >= 30),
    B('defi-30', '⚡', 'Changements fluides', '30 changements en une minute', pairBest >= 30),
    B('defi-60', '🚀', 'Automatisme', '60 changements en une minute', pairBest >= 60),
    B('rythme-90', '🥁', 'Métronome humain', '90 % des coups dans le temps à l’évaluation', rhythmScore >= 90),
    B('tempo-100', '⏱️', 'Cent à l’heure', 'Un rythme tenu à 100 BPM', Math.max(0, ...Object.values(rhythm)) >= 100),
    B('oreille-10', '👂', 'Oreille absolue', 'Série de 10 bonnes réponses au jeu d’oreille', earBest >= 10),
    B('barre', '💪', 'Le cap du barré', 'Fa ou Si mineur reconnu au micro', has('check', (a) => ['F', 'Bm', 'F#m', 'B'].includes(a.key)) || done('l10')),
    B('chanson', '🎶', 'Première chanson', 'Une chanson jouée en entier avec la grille', has('song')),
    B('compositeur', '✍️', 'Ma grille', 'Créer sa propre grille d’accords', songs.some((s) => !s.deleted)),
    B('tab', '📜', 'Lecteur de tablature', 'Une tablature jouée', has('tab')),
    B('parcours-1', '🎓', 'Les bases', 'Parcours 1 terminé', pathDone(1)),
    B('impro', '🎷', 'Improvisateur', 'Leçon d’improvisation sur un blues terminée', done('l16')),
    B('parcours-2', '🏆', 'Guitariste', 'Parcours 2 terminé', pathDone(2)),
    B('jours-100', '💯', 'Cent jours', '100 jours de pratique au total', days.length >= 100),
  ]
}

// Intensité de pratique par jour (nombre d'activités) sur les N dernières semaines
export function heatmap(days, activity, weeks = 16, today = new Date()) {
  const counts = {}
  for (const d of days) counts[d] = Math.max(counts[d] || 0, 1)
  for (const a of activity) counts[a.date] = (counts[a.date] || 0) + 1
  // On commence un lundi
  const end = new Date(today)
  const start = new Date(today)
  start.setDate(start.getDate() - (weeks * 7 - 1))
  const dow = (start.getDay() + 6) % 7
  start.setDate(start.getDate() - dow)
  const cells = []
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const key = fmt(d)
    cells.push({ date: key, count: counts[key] || 0, dow: (d.getDay() + 6) % 7 })
  }
  return cells
}
