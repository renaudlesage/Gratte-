// Reconnaissance d'accords à partir d'un spectre (amplitudes linéaires).
// Principe : on extrait un « chroma » (énergie par classe de note) des pics du spectre,
// puis on le compare à un modèle de chaque accord calculé à partir de son doigté exact
// (notes réellement jouées + leurs harmoniques).
import { CHORDS } from '../data/chords.js'
import { OPEN_MIDI, midiToFreq } from './audio.js'

const F_MIN = 70
const F_MAX = 2000
const HARMONICS = 6
// Réglages validés sur l'ensemble du dictionnaire (2 timbres, bruit, désaccord)
export const P = { comp: 0.5, hw: 1, nh: 6, white: 1.0 }

const templateCache = new Map()

// Modèle chroma d'un doigté (frets) : notes jouées + harmoniques pondérées
export function chordTemplate(frets) {
  const key = frets.join(',') + JSON.stringify(P)
  if (templateCache.has(key)) return templateCache.get(key)
  const t = new Float32Array(12)
  frets.forEach((f, s) => {
    if (f < 0) return
    const f0 = midiToFreq(OPEN_MIDI[s] + f)
    for (let h = 1; h <= P.nh; h++) {
      const fh = f0 * h
      if (fh > F_MAX) break
      const pc = ((Math.round(69 + 12 * Math.log2(fh / 440)) % 12) + 12) % 12
      t[pc] += Math.pow(h, -P.hw)
    }
  })
  normalize(t)
  templateCache.set(key, t)
  return t
}

function normalize(v) {
  let n = 0
  for (let i = 0; i < v.length; i++) n += v[i] * v[i]
  n = Math.sqrt(n) || 1
  for (let i = 0; i < v.length; i++) v[i] /= n
  return v
}

const cosine = (a, b) => {
  let s = 0
  for (let i = 0; i < 12; i++) s += a[i] * b[i]
  return s
}

// mags : amplitudes linéaires des cases FFT (taille fftSize/2), sr : fréquence d'échantillonnage
export function analyzeSpectrum(mags, sr, fftSize) {
  const binHz = sr / fftSize
  const lo = Math.max(2, Math.floor(F_MIN / binHz))
  const hi = Math.min(mags.length - 2, Math.ceil(F_MAX / binHz))
  // Somme cumulée pour la moyenne locale (blanchiment : on garde ce qui dépasse le fond)
  const cum = new Float64Array(mags.length + 1)
  for (let i = 0; i < mags.length; i++) cum[i + 1] = cum[i] + mags[i]
  const chroma = new Float32Array(12)
  const notes = new Float32Array(128) // énergie par note MIDI (pour le diagnostic par corde)
  let peakMax = 0
  for (let k = lo; k <= hi; k++) {
    const m = mags[k]
    if (m < mags[k - 1] || m < mags[k + 1]) continue
    const f = k * binHz
    const w = Math.max(3, Math.round((f * 0.06) / binHz))
    const a = Math.max(0, k - w)
    const b = Math.min(mags.length, k + w + 1)
    const local = (cum[b] - cum[a]) / (b - a)
    const v = m - P.white * local
    if (v <= 0) continue
    // Interpolation parabolique de la fréquence du pic
    const l = mags[k - 1]
    const r = mags[k + 1]
    const den = l - 2 * m + r
    const off = den ? (0.5 * (l - r)) / den : 0
    const fp = (k + off) * binHz
    const midi = 69 + 12 * Math.log2(fp / 440)
    const near = Math.round(midi)
    const dev = midi - near
    const wgt = Math.exp(-((dev / 0.3) ** 2))
    const e = Math.pow(v, P.comp) * wgt
    chroma[((near % 12) + 12) % 12] += e
    if (near >= 0 && near < 128) notes[near] += v * wgt
    peakMax = Math.max(peakMax, v)
  }
  const energy = chroma.reduce((s, x) => s + x, 0)
  normalize(chroma)
  return { chroma, notes, energy, peakMax }
}

// Classe les accords candidats (par défaut tout le dictionnaire) par ressemblance
export function rankChords(chroma, candidates = CHORDS) {
  return candidates
    .map((c) => ({ id: c.id, chord: c, score: cosine(chroma, chordTemplate(c.frets)) }))
    .sort((a, b) => b.score - a.score)
}

export const MATCH_MIN = 0.8

// Diagnostic d'un accord visé : cordes qui semblent muettes, notes étrangères
export function diagnose(analysis, chord) {
  const { notes, chroma } = analysis
  const playedNotes = chord.frets.map((f, s) => (f >= 0 ? OPEN_MIDI[s] + f : null))
  const levels = playedNotes.map((m) => (m === null ? null : notes[m] + 0.5 * (notes[m + 12] || 0)))
  const maxLevel = Math.max(...levels.filter((x) => x !== null), 1e-12)
  const silent = []
  playedNotes.forEach((m, s) => {
    if (m === null) return
    // Une note jouée sur une autre corde à l'octave peut masquer une corde muette : on reste indulgent
    if (levels[s] < maxLevel * 0.04) silent.push(s)
  })
  const tpl = chordTemplate(chord.frets)
  const foreign = []
  for (let pc = 0; pc < 12; pc++) if (chroma[pc] - tpl[pc] > 0.28) foreign.push(pc)
  return { silent, foreign }
}

// Vérifie un accord visé. Les accords « jumeaux » (G/G7, C/Cadd9…) ne diffèrent que d'une note :
// si l'accord visé est presque à égalité avec le meilleur, on le considère comme reconnu.
export function checkTarget(analysis, chord, candidates = CHORDS) {
  const ranked = rankChords(analysis.chroma, candidates)
  const target = ranked.find((r) => r.id === chord.id) || { score: rankChords(analysis.chroma, [chord])[0].score }
  const best = ranked[0]
  let status = 'other'
  if (target.score >= MATCH_MIN && best.score - target.score <= 0.03) status = 'ok'
  else if (target.score >= MATCH_MIN - 0.08 && best.score - target.score <= 0.06) status = 'close'
  return { status, best, targetScore: target.score, ...diagnose(analysis, chord) }
}

// Choix entre deux accords (défi minute) : renvoie l'id reconnu ou null si incertain
export function pickBetween(analysis, a, b) {
  const sa = cosine(analysis.chroma, chordTemplate(a.frets))
  const sb = cosine(analysis.chroma, chordTemplate(b.frets))
  const [id, hi, lo] = sa >= sb ? [a.id, sa, sb] : [b.id, sb, sa]
  return hi >= MATCH_MIN - 0.04 && hi - lo >= 0.035 ? id : null
}
