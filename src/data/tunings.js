// Accordages : notes MIDI des cordes à vide, de la 6e à la 1re
export const TUNINGS = {
  standard: { name: 'Standard', notes: [40, 45, 50, 55, 59, 64], desc: 'Mi La Ré Sol Si Mi' },
  dropd: { name: 'Drop D', notes: [38, 45, 50, 55, 59, 64], desc: 'Ré La Ré Sol Si Mi : la 6e corde descend d’un ton. Riffs rock et power chords à un doigt.' },
  demiton: { name: '½ ton plus bas', notes: [39, 44, 49, 54, 58, 63], desc: 'Mi♭ La♭ Ré♭ Sol♭ Si♭ Mi♭ : tout descend d’un demi-ton. Même doigtés, son plus grave et cordes plus souples.' },
  openg: { name: 'Open G', notes: [38, 43, 50, 55, 59, 62], desc: 'Ré Sol Ré Sol Si Ré : les cordes à vide forment un accord de Sol. Blues, slide, folk.' },
  opend: { name: 'Open D', notes: [38, 45, 50, 54, 57, 62], desc: 'Ré La Ré Fa# La Ré : les cordes à vide forment un accord de Ré.' },
  dadgad: { name: 'DADGAD', notes: [38, 45, 50, 55, 57, 62], desc: 'Ré La Ré Sol La Ré : sonorité celtique et ouverte, très utilisée en folk.' },
}

export const TUNING_IDS = Object.keys(TUNINGS)

// Accords propres à chaque accordage (souvent à un doigt, en barré sur toutes les cordes)
const flat = (fret) => [fret, fret, fret, fret, fret, fret]
const one = (fret) => (fret ? [1, 1, 1, 1, 1, 1] : [0, 0, 0, 0, 0, 0])
const bar = (fret) => (fret ? { fret, from: 0, to: 5 } : undefined)

export const ALT_CHORDS = {
  dropd: [
    { id: 'D5', fr: 'Ré 5 (à vide)', frets: [0, 0, 0, -1, -1, -1], fingers: [0, 0, 0, 0, 0, 0] },
    { id: 'E5', fr: 'Mi 5 (un doigt)', frets: [2, 2, 2, -1, -1, -1], fingers: [1, 1, 1, 0, 0, 0], barre: { fret: 2, from: 0, to: 2 } },
    { id: 'G5', fr: 'Sol 5 (un doigt)', frets: [5, 5, 5, -1, -1, -1], fingers: [1, 1, 1, 0, 0, 0], barre: { fret: 5, from: 0, to: 2 } },
    { id: 'A5', fr: 'La 5 (un doigt)', frets: [7, 7, 7, -1, -1, -1], fingers: [1, 1, 1, 0, 0, 0], barre: { fret: 7, from: 0, to: 2 } },
    { id: 'D', fr: 'Ré majeur (Drop D)', frets: [0, 0, 0, 2, 3, 2], fingers: [0, 0, 0, 1, 3, 2] },
  ],
  openg: [
    { id: 'G', fr: 'Sol (cordes à vide)', frets: flat(0), fingers: one(0) },
    { id: 'C', fr: 'Do (barré case 5)', frets: flat(5), fingers: one(5), barre: bar(5) },
    { id: 'D', fr: 'Ré (barré case 7)', frets: flat(7), fingers: one(7), barre: bar(7) },
    { id: 'G', fr: 'Sol (barré case 12)', frets: flat(12), fingers: one(12), barre: bar(12), key: 'G12' },
  ],
  opend: [
    { id: 'D', fr: 'Ré (cordes à vide)', frets: flat(0), fingers: one(0) },
    { id: 'G', fr: 'Sol (barré case 5)', frets: flat(5), fingers: one(5), barre: bar(5) },
    { id: 'A', fr: 'La (barré case 7)', frets: flat(7), fingers: one(7), barre: bar(7) },
  ],
  dadgad: [
    { id: 'Dsus4', fr: 'Ré sus4 (cordes à vide)', frets: flat(0), fingers: one(0) },
    { id: 'D', fr: 'Ré majeur (DADGAD)', frets: [0, 0, 0, 2, 0, 0], fingers: [0, 0, 0, 1, 0, 0] },
    { id: 'Gsus4', fr: 'Sol sus4 (barré case 5)', frets: flat(5), fingers: one(5), barre: bar(5) },
    { id: 'Asus4', fr: 'La sus4 (barré case 7)', frets: flat(7), fingers: one(7), barre: bar(7) },
  ],
}

// Accords d'un accordage, avec leurs cordes à vide (pour le son et la reconnaissance)
export function chordsForTuning(id) {
  const t = TUNINGS[id]
  return (ALT_CHORDS[id] || []).map((c) => ({ ...c, type: 'accordage', level: 2, open: t.notes, tuning: id }))
}
