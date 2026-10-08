// Tablatures. n : [[corde (1 = Mi aigu … 6 = Mi grave), case], …], d : durée en croches.
// tech : 'h' hammer-on, 'p' pull-off, '/' glissé montant, '\\' glissé descendant, 'pm' étouffé (palm mute).
const N = (s, f, d = 1, tech) => ({ n: [[s, f]], d, tech })
const C = (notes, d = 1, tech) => ({ n: notes, d, tech })

const spider = []
for (let s = 6; s >= 1; s--) for (let f = 1; f <= 4; f++) spider.push(N(s, f))

const pentaUp = [N(6, 5), N(6, 8), N(5, 5), N(5, 7), N(4, 5), N(4, 7), N(3, 5), N(3, 7), N(2, 5), N(2, 8), N(1, 5), N(1, 8)]

export const TABS = [
  {
    id: 'araignee',
    title: 'L’araignée (1-2-3-4)',
    kind: 'technique',
    level: 1,
    bpm: 60,
    beats: 4,
    tip: 'Un doigt par case : index case 1, majeur 2, annulaire 3, auriculaire 4, sur chaque corde. Échauffement idéal pour l’indépendance des doigts.',
    notes: spider,
  },
  {
    id: 'hammer-pull',
    title: 'Hammer-on et pull-off',
    kind: 'technique',
    level: 2,
    bpm: 60,
    beats: 4,
    tip: 'Hammer-on (h) : on attaque la première note, puis le doigt « frappe » la case suivante sans regratter. Pull-off (p) : on tire légèrement la corde en relevant le doigt.',
    notes: [N(3, 0), N(3, 2, 1, 'h'), N(3, 2), N(3, 0, 1, 'p'), N(3, 0), N(3, 2, 1, 'h'), N(3, 2), N(3, 0, 1, 'p'),
      N(2, 1), N(2, 3, 1, 'h'), N(2, 3), N(2, 1, 1, 'p'), N(2, 0), N(2, 1, 1, 'h'), N(2, 3, 1, 'h'), N(2, 1, 1, 'p')],
  },
  {
    id: 'glisses',
    title: 'Glissés',
    kind: 'technique',
    level: 2,
    bpm: 66,
    beats: 4,
    tip: 'Gardez la pression du doigt en glissant de la case de départ à la case d’arrivée : on n’attaque qu’une fois.',
    notes: [N(4, 2, 2), N(4, 4, 2, '/'), N(4, 4, 2), N(4, 2, 2, '\\'), N(3, 2, 2), N(3, 4, 2, '/'), N(3, 4, 2), N(3, 2, 2, '\\')],
  },
  {
    id: 'palm-mute',
    title: 'Riff rock étouffé (palm mute)',
    kind: 'technique',
    level: 2,
    bpm: 90,
    beats: 4,
    tip: 'Posez le tranchant de la main droite sur les cordes, juste devant le chevalet : le son devient court et percussif (PM). Relâchez pour les accents.',
    notes: [
      C([[6, 0], [5, 2]], 1, 'pm'), C([[6, 0], [5, 2]], 1, 'pm'), C([[6, 0], [5, 2]], 1, 'pm'), C([[6, 0], [5, 2]], 1, 'pm'),
      C([[6, 0], [5, 2]], 1, 'pm'), C([[6, 0], [5, 2]], 1, 'pm'), C([[6, 3], [5, 5]], 1), C([[6, 5], [5, 7]], 1),
      C([[6, 0], [5, 2]], 1, 'pm'), C([[6, 0], [5, 2]], 1, 'pm'), C([[6, 0], [5, 2]], 1, 'pm'), C([[6, 0], [5, 2]], 1, 'pm'),
      C([[5, 0], [4, 2]], 2), C([[6, 3], [5, 5]], 2),
    ],
  },
  {
    id: 'penta-la',
    title: 'Pentatonique de La mineur',
    kind: 'gamme',
    level: 2,
    bpm: 70,
    beats: 4,
    tip: 'Position 1, case 5 : index sur la case 5, annulaire sur la 7, auriculaire sur la 8. Montez puis redescendez, une note par croche.',
    notes: [...pentaUp, ...pentaUp.slice(0, -1).reverse(), N(6, 5, 1)],
  },
  {
    id: 'lick-blues',
    title: 'Phrase blues en La',
    kind: 'gamme',
    level: 3,
    bpm: 72,
    beats: 4,
    tip: 'Une phrase de 3 mesures à placer sur le blues en La (onglet Chansons, avec le groupe) : 4 répétitions = un tour de blues complet. Elle descend la pentatonique et finit sur la fondamentale.',
    notes: [N(1, 5, 2), N(2, 8), N(2, 5), N(3, 7), N(3, 5), N(4, 7, 2), N(3, 5), N(3, 7, 1, 'h'), N(2, 5, 2), N(3, 7, 2), N(4, 7, 4), { n: [], d: 6 }],
  },
  {
    id: 'hymne-joie',
    title: 'Hymne à la joie',
    kind: 'mélodie',
    by: 'Beethoven (1824)',
    level: 1,
    bpm: 80,
    beats: 4,
    tip: 'Tout se joue sur les deux cordes aiguës. Une note par temps, la dernière dure deux temps.',
    notes: [N(1, 0, 2), N(1, 0, 2), N(1, 1, 2), N(1, 3, 2), N(1, 3, 2), N(1, 1, 2), N(1, 0, 2), N(2, 3, 2),
      N(2, 1, 2), N(2, 1, 2), N(2, 3, 2), N(1, 0, 2), N(1, 0, 3), N(2, 3, 1), N(2, 3, 4)],
  },
  {
    id: 'clair-lune-melodie',
    title: 'Au clair de la lune (mélodie)',
    kind: 'mélodie',
    by: 'Traditionnel',
    level: 1,
    bpm: 90,
    beats: 4,
    tip: 'Trois notes seulement : Sol (corde 3 à vide), La (corde 3, case 2) et Si (corde 2 à vide).',
    notes: [N(3, 0, 2), N(3, 0, 2), N(3, 0, 2), N(3, 2, 2), N(2, 0, 4), N(3, 2, 4), N(3, 0, 2), N(2, 0, 2), N(3, 2, 2), N(3, 2, 2), N(3, 0, 8)],
  },
  {
    id: 'frere-jacques-melodie',
    title: 'Frère Jacques (mélodie)',
    kind: 'mélodie',
    by: 'Traditionnel',
    level: 1,
    bpm: 90,
    beats: 4,
    tip: 'Sur les cordes 2 et 3, plus un Ré grave (corde 4 à vide) à la fin. Idéal pour jouer en canon avec quelqu’un.',
    notes: [
      N(3, 0, 2), N(3, 2, 2), N(2, 0, 2), N(3, 0, 2), N(3, 0, 2), N(3, 2, 2), N(2, 0, 2), N(3, 0, 2),
      N(2, 0, 2), N(2, 1, 2), N(2, 3, 4), N(2, 0, 2), N(2, 1, 2), N(2, 3, 4),
      N(2, 3, 1), N(1, 0, 1), N(2, 3, 1), N(2, 1, 1), N(2, 0, 2), N(3, 0, 2), N(2, 3, 1), N(1, 0, 1), N(2, 3, 1), N(2, 1, 1), N(2, 0, 2), N(3, 0, 2),
      N(3, 0, 2), N(4, 0, 2), N(3, 0, 4), N(3, 0, 2), N(4, 0, 2), N(3, 0, 4),
    ],
  },
]
