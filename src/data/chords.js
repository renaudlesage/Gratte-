// Doigtés : frets = [corde 6 (Mi grave) … corde 1 (Mi aigu)], -1 = étouffée, 0 = à vide
// fingers : 1 index, 2 majeur, 3 annulaire, 4 auriculaire
// barre : { fret, from, to } index de cordes (0 = corde 6)

export const CHORDS = [
  { id: 'Em', fr: 'Mi mineur', type: 'mineur', level: 1, frets: [0, 2, 2, 0, 0, 0], fingers: [0, 2, 3, 0, 0, 0] },
  { id: 'Am', fr: 'La mineur', type: 'mineur', level: 1, frets: [-1, 0, 2, 2, 1, 0], fingers: [0, 0, 2, 3, 1, 0] },
  { id: 'Dm', fr: 'Ré mineur', type: 'mineur', level: 1, frets: [-1, -1, 0, 2, 3, 1], fingers: [0, 0, 0, 2, 3, 1] },
  { id: 'E', fr: 'Mi majeur', type: 'majeur', level: 1, frets: [0, 2, 2, 1, 0, 0], fingers: [0, 2, 3, 1, 0, 0] },
  { id: 'A', fr: 'La majeur', type: 'majeur', level: 1, frets: [-1, 0, 2, 2, 2, 0], fingers: [0, 0, 1, 2, 3, 0] },
  { id: 'D', fr: 'Ré majeur', type: 'majeur', level: 1, frets: [-1, -1, 0, 2, 3, 2], fingers: [0, 0, 0, 1, 3, 2] },
  { id: 'G', fr: 'Sol majeur', type: 'majeur', level: 1, frets: [3, 2, 0, 0, 0, 3], fingers: [2, 1, 0, 0, 0, 3] },
  { id: 'C', fr: 'Do majeur', type: 'majeur', level: 1, frets: [-1, 3, 2, 0, 1, 0], fingers: [0, 3, 2, 0, 1, 0] },
  { id: 'Cadd9', fr: 'Do add9', type: 'autre', level: 2, frets: [-1, 3, 2, 0, 3, 0], fingers: [0, 2, 1, 0, 3, 0] },
  { id: 'Asus2', fr: 'La sus2', type: 'autre', level: 2, frets: [-1, 0, 2, 2, 0, 0], fingers: [0, 0, 1, 2, 0, 0] },
  { id: 'Dsus4', fr: 'Ré sus4', type: 'autre', level: 2, frets: [-1, -1, 0, 2, 3, 3], fingers: [0, 0, 0, 1, 3, 4] },
  { id: 'Fmaj7', fr: 'Fa maj7', type: 'autre', level: 2, frets: [-1, -1, 3, 2, 1, 0], fingers: [0, 0, 3, 2, 1, 0] },
  { id: 'E7', fr: 'Mi 7', type: '7e', level: 2, frets: [0, 2, 0, 1, 0, 0], fingers: [0, 2, 0, 1, 0, 0] },
  { id: 'A7', fr: 'La 7', type: '7e', level: 2, frets: [-1, 0, 2, 0, 2, 0], fingers: [0, 0, 2, 0, 3, 0] },
  { id: 'D7', fr: 'Ré 7', type: '7e', level: 2, frets: [-1, -1, 0, 2, 1, 2], fingers: [0, 0, 0, 2, 1, 3] },
  { id: 'G7', fr: 'Sol 7', type: '7e', level: 2, frets: [3, 2, 0, 0, 0, 1], fingers: [3, 2, 0, 0, 0, 1] },
  { id: 'C7', fr: 'Do 7', type: '7e', level: 2, frets: [-1, 3, 2, 3, 1, 0], fingers: [0, 3, 2, 4, 1, 0] },
  { id: 'B7', fr: 'Si 7', type: '7e', level: 2, frets: [-1, 2, 1, 2, 0, 2], fingers: [0, 2, 1, 3, 0, 4] },
  { id: 'E5', fr: 'Mi 5 (power chord)', type: 'power', level: 2, frets: [0, 2, 2, -1, -1, -1], fingers: [0, 1, 1, 0, 0, 0] },
  { id: 'A5', fr: 'La 5 (power chord)', type: 'power', level: 2, frets: [-1, 0, 2, 2, -1, -1], fingers: [0, 0, 1, 1, 0, 0] },
  { id: 'D5', fr: 'Ré 5 (power chord)', type: 'power', level: 2, frets: [-1, -1, 0, 2, 3, -1], fingers: [0, 0, 0, 1, 2, 0] },
  { id: 'G5', fr: 'Sol 5 (power chord)', type: 'power', level: 2, frets: [3, 5, 5, -1, -1, -1], fingers: [1, 3, 4, 0, 0, 0] },
  { id: 'C5', fr: 'Do 5 (power chord)', type: 'power', level: 2, frets: [-1, 3, 5, 5, -1, -1], fingers: [0, 1, 3, 4, 0, 0] },
  { id: 'F5', fr: 'Fa 5 (power chord)', type: 'power', level: 2, frets: [1, 3, 3, -1, -1, -1], fingers: [1, 3, 4, 0, 0, 0] },
  { id: 'F', fr: 'Fa majeur (barré)', type: 'barré', level: 3, frets: [1, 3, 3, 2, 1, 1], fingers: [1, 3, 4, 2, 1, 1], barre: { fret: 1, from: 0, to: 5 } },
  { id: 'Bm', fr: 'Si mineur (barré)', type: 'barré', level: 3, frets: [-1, 2, 4, 4, 3, 2], fingers: [0, 1, 3, 4, 2, 1], barre: { fret: 2, from: 1, to: 5 } },
  { id: 'F#m', fr: 'Fa# mineur (barré)', type: 'barré', level: 3, frets: [2, 4, 4, 2, 2, 2], fingers: [1, 3, 4, 1, 1, 1], barre: { fret: 2, from: 0, to: 5 } },
  { id: 'B', fr: 'Si majeur (barré)', type: 'barré', level: 3, frets: [-1, 2, 4, 4, 4, 2], fingers: [0, 1, 2, 3, 4, 1], barre: { fret: 2, from: 1, to: 5 } },
]

export const CHORD_MAP = Object.fromEntries(CHORDS.map((c) => [c.id, c]))
export const getChord = (id) => CHORD_MAP[id]

export const SUGGESTED_PAIRS = [
  ['Em', 'Am'], ['D', 'A'], ['A', 'E'], ['G', 'C'], ['C', 'Am'], ['D', 'G'],
  ['Em', 'G'], ['G', 'D'], ['E7', 'A7'], ['C', 'Fmaj7'], ['F', 'C'], ['Bm', 'G'],
  ['E5', 'A5'], ['G5', 'C5'],
]

export const PROGRESSIONS = [
  { name: 'Pop (I–V–vi–IV)', chords: ['G', 'D', 'Em', 'C'] },
  { name: 'Mélancolique', chords: ['Am', 'G', 'C', 'Em'] },
  { name: 'Années 50', chords: ['C', 'Am', 'F', 'G'] },
  { name: 'Folk en Ré', chords: ['D', 'A', 'G', 'D'] },
  { name: 'Blues en Mi', chords: ['E7', 'E7', 'A7', 'E7', 'B7', 'A7', 'E7', 'B7'] },
  { name: 'Débutant (2 accords)', chords: ['Em', 'Am'] },
  { name: 'Rock en power chords', chords: ['E5', 'G5', 'A5', 'C5'] },
]
