// Objectifs validés par des preuves que l'appli enregistre déjà (micro, records, activités).
// Une tâche de leçon peut porter un champ `auto` :
//   { type: 'check', chords: ['Em'] }                  accord(s) reconnu(s) par la vérification au micro
//   { type: 'best', pair: ['Em', 'Am'], min: 30 }      record du défi minute sur la paire
//   { type: 'rhythm', pattern: 'folk', bpm: 80 }       rythme réussi à l'évaluation au micro (≥ 80 %) à ce tempo
//   { type: 'act', act: 'tab', key: 'hymne-joie', min: 80 }  activité faite dans l'appli (valeur ≥ min)
import { pairKey } from './pairKey.js'

export function taskProof(task, state) {
  const a = task.auto
  if (!a || !state) return false
  const activity = state.activity || []
  switch (a.type) {
    case 'check':
      return a.chords.every((c) => activity.some((x) => x.type === 'check' && x.key === c))
    case 'best':
      return (state.bests?.[pairKey(a.pair[0], a.pair[1])] || 0) >= a.min
    case 'rhythm':
      return (state.rhythm?.[a.pattern] || 0) >= a.bpm
    case 'act':
      return activity.some(
        (x) => x.type === a.act && (a.key === undefined || x.key === a.key) && (a.min === undefined || (x.value || 0) >= a.min),
      )
    default:
      return false
  }
}

export const PROOF_LABEL = {
  check: 'validé au micro',
  best: 'validé par le défi minute',
  rhythm: 'validé à l’évaluation au micro',
  act: 'fait dans l’appli',
}

// Une tâche est atteinte si la preuve existe ou si l'élève l'a cochée lui-même
export const taskMet = (task, state) => taskProof(task, state) || !!state.tasks?.[task.id]
export const lessonMet = (lesson, state) => lesson.tasks.every((t) => taskMet(t, state))
