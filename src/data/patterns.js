// Rythmiques en croches : chaque case = une demi-pulsation. 'D' = bas, 'U' = haut, '' = on ne touche pas (la main bouge quand même)
export const PATTERNS = [
  { id: 'noires', name: 'Quatre temps', level: 1, beats: 4, slots: ['D', '', 'D', '', 'D', '', 'D', ''], tip: 'Un coup vers le bas sur chaque temps. La base de tout.' },
  { id: 'croches', name: 'Croches régulières', level: 1, beats: 4, slots: ['D', 'U', 'D', 'U', 'D', 'U', 'D', 'U'], tip: 'Bas sur le temps, haut entre les temps. Le poignet fait un balancier constant.' },
  { id: 'folk', name: 'Folk (le classique)', level: 2, beats: 4, slots: ['D', '', 'D', 'U', '', 'U', 'D', 'U'], tip: 'Le rythme de milliers de chansons. Au 3e temps, la main descend dans le vide sans toucher les cordes.' },
  { id: 'pop', name: 'Pop', level: 2, beats: 4, slots: ['D', '', 'D', '', 'D', 'U', 'D', 'U'], tip: 'Deux temps posés, puis on accélère sur la seconde moitié.' },
  { id: 'ballade', name: 'Ballade', level: 2, beats: 4, slots: ['D', '', '', 'U', '', 'U', 'D', ''], tip: 'Aéré, idéal pour les morceaux lents. Laissez sonner.' },
  { id: 'valse', name: 'Valse (3/4)', level: 2, beats: 3, slots: ['D', '', 'D', 'U', 'D', 'U'], tip: 'Trois temps par mesure : accentuez bien le premier.' },
]
