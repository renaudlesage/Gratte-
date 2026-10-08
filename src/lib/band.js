// Accompagnement : batterie et basse synthétisées, programmées mesure par mesure.
import { getCtx, midiToFreq, masterOut } from './audio.js'
import { parseChord } from './music.js'

export const STYLES = [
  ['aucun', 'Sans groupe'],
  ['pop', 'Pop'],
  ['folk', 'Folk'],
  ['rock', 'Rock'],
  ['blues', 'Blues (shuffle)'],
  ['valse', 'Valse'],
]

let noiseBuf = null
const busses = new WeakMap()

function bus(c) {
  if (busses.has(c)) return busses.get(c)
  const comp = c.createDynamicsCompressor()
  comp.threshold.value = -16
  comp.ratio.value = 4
  comp.connect(masterOut(c))
  const drums = c.createGain()
  drums.gain.value = 0.42
  drums.connect(comp)
  const bass = c.createGain()
  bass.gain.value = 0.4
  bass.connect(comp)
  const b = { drums, bass }
  busses.set(c, b)
  return b
}

function noise(c) {
  if (noiseBuf && noiseBuf.sampleRate === c.sampleRate) return noiseBuf
  noiseBuf = c.createBuffer(1, c.sampleRate, c.sampleRate)
  const d = noiseBuf.getChannelData(0)
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
  return noiseBuf
}

function kick(c, t, v = 1) {
  const o = c.createOscillator()
  const g = c.createGain()
  o.frequency.setValueAtTime(140, t)
  o.frequency.exponentialRampToValueAtTime(45, t + 0.12)
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(0.9 * v, t + 0.004)
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.35)
  o.connect(g).connect(bus(c).drums)
  o.start(t)
  o.stop(t + 0.4)
}

function snare(c, t, v = 1, rim = false) {
  const n = c.createBufferSource()
  n.buffer = noise(c)
  const f = c.createBiquadFilter()
  f.type = rim ? 'bandpass' : 'highpass'
  f.frequency.value = rim ? 2200 : 1200
  const g = c.createGain()
  const dur = rim ? 0.05 : 0.18
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime((rim ? 0.35 : 0.5) * v, t + 0.002)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  n.connect(f).connect(g).connect(bus(c).drums)
  n.start(t, Math.random() * 0.5)
  n.stop(t + dur + 0.02)
  if (!rim) {
    const o = c.createOscillator()
    const og = c.createGain()
    o.frequency.setValueAtTime(220, t)
    o.frequency.exponentialRampToValueAtTime(160, t + 0.08)
    og.gain.setValueAtTime(0.0001, t)
    og.gain.exponentialRampToValueAtTime(0.3 * v, t + 0.002)
    og.gain.exponentialRampToValueAtTime(0.0001, t + 0.1)
    o.connect(og).connect(bus(c).drums)
    o.start(t)
    o.stop(t + 0.12)
  }
}

function hat(c, t, v = 1, open = false) {
  const n = c.createBufferSource()
  n.buffer = noise(c)
  const f = c.createBiquadFilter()
  f.type = 'highpass'
  f.frequency.value = 7000
  const g = c.createGain()
  const dur = open ? 0.25 : 0.045
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(0.22 * v, t + 0.002)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  n.connect(f).connect(g).connect(bus(c).drums)
  n.start(t, Math.random() * 0.5)
  n.stop(t + dur + 0.02)
}

function shaker(c, t, v = 1) {
  const n = c.createBufferSource()
  n.buffer = noise(c)
  const f = c.createBiquadFilter()
  f.type = 'bandpass'
  f.frequency.value = 5500
  f.Q.value = 1.2
  const g = c.createGain()
  g.gain.setValueAtTime(0.0001, t)
  g.gain.linearRampToValueAtTime(0.16 * v, t + 0.02)
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.09)
  n.connect(f).connect(g).connect(bus(c).drums)
  n.start(t, Math.random() * 0.5)
  n.stop(t + 0.12)
}

// Basse : onde triangle + légère saturation, enveloppe courte et ronde
function bassNote(c, t, midi, dur, v = 1) {
  const o = c.createOscillator()
  o.type = 'triangle'
  o.frequency.value = midiToFreq(midi)
  const o2 = c.createOscillator()
  o2.type = 'sine'
  o2.frequency.value = midiToFreq(midi - 12)
  const lp = c.createBiquadFilter()
  lp.type = 'lowpass'
  lp.frequency.setValueAtTime(900, t)
  lp.frequency.exponentialRampToValueAtTime(300, t + 0.15)
  const g = c.createGain()
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(0.7 * v, t + 0.008)
  g.gain.setTargetAtTime(0.4 * v, t + 0.05, 0.1)
  g.gain.setTargetAtTime(0.0001, t + dur * 0.9, 0.03)
  const g2 = c.createGain()
  g2.gain.value = 0.5
  o.connect(lp)
  o2.connect(g2).connect(lp)
  lp.connect(g).connect(bus(c).bass)
  o.start(t)
  o2.start(t)
  o.stop(t + dur + 0.2)
  o2.stop(t + dur + 0.2)
}

// Notes de basse de l'accord : fondamentale (registre Mi1–Ré#2), quinte, tierce, sixte
function bassNotes(chordName) {
  const p = parseChord(chordName)
  if (!p) return null
  let root = 28 + ((p.pc - 4 + 12) % 12) // Mi1 = 28
  if (root > 38) root -= 12
  const minor = /^m(?!aj)/.test(p.suffix)
  return { root, fifth: root + 7, third: root + (minor ? 3 : 4), sixth: root + 9, oct: root + 12, b7: root + 10 }
}

// Programme une mesure complète. t : début de mesure, beat : durée d'un temps (s)
export function scheduleBar(style, chordName, nextChordName, t, beat, beatsPerBar = 4) {
  if (!style || style === 'aucun') return
  const c = getCtx()
  const n = bassNotes(chordName)
  const swing = style === 'blues' ? (2 / 3) * beat : beat / 2 // croche « ternaire » en blues
  for (let b = 0; b < beatsPerBar; b++) {
    const tb = t + b * beat
    const off = tb + swing
    if (style === 'valse' || beatsPerBar === 3) {
      if (b === 0) {
        kick(c, tb, 0.9)
        if (n) bassNote(c, tb, n.root, beat * 0.95)
      } else {
        hat(c, tb, 0.8)
        snare(c, tb, 0.35, true)
        if (n && b === 2) bassNote(c, tb, n.fifth, beat * 0.9, 0.7)
      }
      continue
    }
    if (style === 'pop') {
      if (b === 0 || b === 2) kick(c, tb)
      if (b === 2) kick(c, off, 0.6)
      if (b === 1 || b === 3) snare(c, tb, 0.9)
      hat(c, tb, 0.9)
      hat(c, off, 0.6)
      if (n) {
        bassNote(c, tb, b === 3 ? n.fifth : n.root, beat * 0.48, b === 0 ? 1 : 0.8)
        bassNote(c, off, n.root, beat * 0.45, 0.7)
      }
    } else if (style === 'folk') {
      if (b === 0 || b === 2) kick(c, tb, 0.7)
      if (b === 1 || b === 3) snare(c, tb, 0.7, true)
      shaker(c, tb, 1)
      shaker(c, off, 0.7)
      if (n) bassNote(c, tb, b % 2 === 0 ? n.root : n.fifth, beat * 0.9, b === 0 ? 1 : 0.75)
    } else if (style === 'rock') {
      kick(c, tb, b === 0 || b === 2 ? 1 : 0.5)
      if (b === 1 || b === 3) snare(c, tb, 1)
      hat(c, tb, 1)
      hat(c, off, 0.8)
      if (n) {
        bassNote(c, tb, n.root, beat * 0.45, 1)
        bassNote(c, off, n.root, beat * 0.45, 0.85)
      }
    } else if (style === 'blues') {
      if (b === 0 || b === 2) kick(c, tb, 0.9)
      if (b === 1 || b === 3) snare(c, tb, 0.8)
      hat(c, tb, 0.9)
      hat(c, off, 0.55)
      if (n) {
        // Boogie : fondamentale, tierce, quinte, sixte (et septième en descente)
        const walk = [n.root, n.third, n.fifth, n.sixth]
        const walk2 = [n.oct, n.b7, n.sixth, n.fifth]
        const seq = b < 2 || beatsPerBar !== 4 ? walk : walk2
        bassNote(c, tb, seq[b % 4], swing * 0.95, 1)
        bassNote(c, off, seq[b % 4], (beat - swing) * 0.9, 0.6)
      }
    }
  }
  // Petite transition de batterie à l'approche d'un changement d'accord (pop / rock)
  if ((style === 'pop' || style === 'rock') && nextChordName && nextChordName !== chordName) {
    snare(c, t + (beatsPerBar - 1) * beat + beat / 2, 0.6)
  }
}
