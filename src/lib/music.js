// Théorie utile : noms de notes, transposition, accords barrés générés, conseil de capodastre.
import { CHORD_MAP } from '../data/chords.js'
import { OPEN_MIDI } from './audio.js'

export const NOTES_EN = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
export const NOTES_FR = ['Do', 'Do#', 'Ré', 'Ré#', 'Mi', 'Fa', 'Fa#', 'Sol', 'Sol#', 'La', 'La#', 'Si']
const LETTER = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }

export const noteName = (pc, notation = 'en') => (notation === 'fr' ? NOTES_FR : NOTES_EN)[((pc % 12) + 12) % 12]

export function parseChord(name) {
  const m = /^([A-G])([#b]?)(.*)$/.exec(String(name || '').trim())
  if (!m) return null
  const pc = (LETTER[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) + 12) % 12
  return { pc, suffix: m[3] }
}

// Nom normalisé en dièses (Bb → A#)
export function normalizeChord(name) {
  const p = parseChord(name)
  return p ? NOTES_EN[p.pc] + p.suffix : name
}

export function transposeChord(name, semitones) {
  const p = parseChord(name)
  if (!p) return name
  return NOTES_EN[(p.pc + semitones + 1200) % 12] + p.suffix
}

// Nom affiché selon la notation choisie (Am → Lam)
export function chordLabel(name, notation = 'en') {
  if (notation !== 'fr') return name
  const p = parseChord(name)
  return p ? NOTES_FR[p.pc] + p.suffix : name
}

const SUFFIX_FR = { '': 'majeur', m: 'mineur', 7: '7', m7: 'm7', maj7: 'maj7', 5: '5 (power chord)' }

// Formes mobiles : forme de Mi (fondamentale sur la 6e corde) et forme de La (sur la 5e)
const E_SHAPES = {
  '': { frets: [0, 2, 2, 1, 0, 0], fingers: [1, 3, 4, 2, 1, 1] },
  m: { frets: [0, 2, 2, 0, 0, 0], fingers: [1, 3, 4, 1, 1, 1] },
  7: { frets: [0, 2, 0, 1, 0, 0], fingers: [1, 3, 1, 2, 1, 1] },
  m7: { frets: [0, 2, 0, 0, 0, 0], fingers: [1, 3, 1, 1, 1, 1] },
  5: { frets: [0, 2, 2, -1, -1, -1], fingers: [1, 3, 4, 0, 0, 0] },
}
const A_SHAPES = {
  '': { frets: [-1, 0, 2, 2, 2, 0], fingers: [0, 1, 2, 3, 4, 1] },
  m: { frets: [-1, 0, 2, 2, 1, 0], fingers: [0, 1, 3, 4, 2, 1] },
  7: { frets: [-1, 0, 2, 0, 2, 0], fingers: [0, 1, 3, 1, 4, 1] },
  m7: { frets: [-1, 0, 2, 0, 1, 0], fingers: [0, 1, 3, 1, 2, 1] },
  maj7: { frets: [-1, 0, 2, 1, 2, 0], fingers: [0, 1, 3, 2, 4, 1] },
  5: { frets: [-1, 0, 2, 2, -1, -1], fingers: [0, 1, 3, 4, 0, 0] },
}

function shapeAt(shape, fret, fromString) {
  const frets = shape.frets.map((f) => (f < 0 ? -1 : f + fret))
  const fingers = shape.fingers.slice()
  const power = shape.frets.filter((f) => f >= 0).length <= 3
  return { frets, fingers, barre: power ? undefined : { fret, from: fromString, to: 5 } }
}

// Retourne un accord affichable et jouable : celui du dictionnaire, ou un barré généré
export function resolveChord(name) {
  if (!name) return null
  if (CHORD_MAP[name]) return CHORD_MAP[name]
  const norm = normalizeChord(name)
  if (CHORD_MAP[norm]) return CHORD_MAP[norm]
  const p = parseChord(norm)
  if (!p) return null
  const opts = []
  if (E_SHAPES[p.suffix]) {
    const fret = (p.pc - 4 + 12) % 12 || 12
    opts.push(shapeAt(E_SHAPES[p.suffix], fret, 0))
  }
  if (A_SHAPES[p.suffix]) {
    const fret = (p.pc - 9 + 12) % 12 || 12
    opts.push(shapeAt(A_SHAPES[p.suffix], fret, 1))
  }
  if (!opts.length) return null
  const pos = (o) => Math.min(...o.frets.filter((f) => f >= 0))
  opts.sort((a, b) => pos(a) - pos(b))
  const best = opts[0]
  return {
    id: norm,
    fr: `${NOTES_FR[p.pc]} ${SUFFIX_FR[p.suffix] ?? p.suffix} (barré)`,
    type: 'barré',
    level: 3,
    generated: true,
    ...best,
  }
}

// Coût de jeu d'un accord pour un débutant
function chordCost(name) {
  const c = CHORD_MAP[normalizeChord(name)]
  if (c) return c.level === 1 ? 0 : c.level === 2 ? 1 : 2.5
  return resolveChord(name) ? 3.5 : 6
}

// Capodastre conseillé : celui qui donne les formes d'accords les plus faciles
export function suggestCapo(chords, transpose = 0) {
  const uniq = [...new Set(chords)]
  let best = { capo: 0, cost: Infinity }
  for (let capo = 0; capo <= 7; capo++) {
    const cost = uniq.reduce((s, ch) => s + chordCost(transposeChord(ch, transpose - capo)), 0) + capo * 0.15
    if (cost < best.cost - 1e-9) best = { capo, cost }
  }
  return best.capo
}

// Forme à jouer pour un accord sonnant, compte tenu de la transposition et du capo
export const shapeFor = (name, transpose = 0, capo = 0) => transposeChord(name, transpose - capo)

// Frettes réelles avec capodastre (les cordes à vide deviennent la case du capo)
export const withCapo = (frets, capo) => frets.map((f) => (f < 0 ? f : f + capo))

// Corde de basse (fondamentale la plus grave) et basse alternée pour le picking
export function bassStrings(chord) {
  const p = parseChord(chord.id)
  const played = chord.frets.map((f, s) => (f >= 0 ? s : -1)).filter((s) => s >= 0)
  let bass = played[0]
  if (p) {
    const root = played.find((s) => (OPEN_MIDI[s] + chord.frets[s]) % 12 === p.pc)
    if (root !== undefined && root <= 2) bass = root
  }
  let alt = bass === 0 ? 2 : bass + 1
  if (!played.includes(alt)) alt = played.find((s) => s > bass) ?? bass
  return { bass, alt }
}
