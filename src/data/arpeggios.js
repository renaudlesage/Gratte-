// Arpèges (picking) en croches. Rôles : B = basse (fondamentale), A = basse alternée,
// '3' '2' '1' = cordes de Sol, Si, Mi aigu. 'B+1' = basse et Mi aigu pincés ensemble.
export const ARPEGGIOS = [
  { id: 'montant', name: 'Arpège montant', level: 1, beats: 4, steps: ['B', '3', '2', '1', '2', '3', '2', '3'], tip: 'Le pouce joue la basse, puis index, majeur, annulaire sur les cordes 3, 2, 1. Laissez tout sonner.' },
  { id: 'ballade', name: 'Ballade (3/4)', level: 1, beats: 3, steps: ['B', '3', '2', '1', '2', '3'], tip: 'Le motif des berceuses et des valses lentes. Un aller-retour par mesure.' },
  { id: 'pince', name: 'Pincé', level: 2, beats: 4, steps: ['B+1', '3', '2', '3', 'A+1', '3', '2', '3'], tip: 'Pouce et annulaire pincent ensemble sur le temps : un son plein, très « folk ».' },
  { id: 'travis', name: 'Travis (basse alternée)', level: 3, beats: 4, steps: ['B', '2', 'A', '3', 'B', '2', 'A', '3'], tip: 'Le pouce alterne deux basses en régulier, les doigts jouent entre. Commencez très lentement : c’est un vrai défi de coordination.' },
]

export const FINGER = { B: 'p', A: 'p', 'B+1': 'p+a', 'A+1': 'p+a', 3: 'i', 2: 'm', 1: 'a' }
