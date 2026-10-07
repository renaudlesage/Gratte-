// Moteur audio partagé : contexte unique, synthèse de corde (Karplus-Strong),
// clic de métronome et horloge de précision (ordonnancement anticipé).

let ctx = null

export function getCtx() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext
    ctx = new AC()
  }
  if (ctx.state === 'suspended') ctx.resume()
  return ctx
}

// Cordes à vide en accordage standard, de la 6e (Mi grave) à la 1re (Mi aigu)
export const OPEN_MIDI = [40, 45, 50, 55, 59, 64]
export const STRING_NAMES = ['Mi grave', 'La', 'Ré', 'Sol', 'Si', 'Mi aigu']
export const NOTE_FR = ['Do', 'Do#', 'Ré', 'Ré#', 'Mi', 'Fa', 'Fa#', 'Sol', 'Sol#', 'La', 'La#', 'Si']
export const NOTE_EN = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

export const midiToFreq = (m) => 440 * Math.pow(2, (m - 69) / 12)
export const freqToMidi = (f) => 69 + 12 * Math.log2(f / 440)

const bufferCache = new Map()

// Corde pincée par synthèse Karplus-Strong, calculée une fois puis mise en cache
function stringBuffer(c, freq) {
  const key = Math.round(freq * 10)
  if (bufferCache.has(key)) return bufferCache.get(key)
  const sr = c.sampleRate
  const len = Math.floor(sr * 2.8)
  const buf = c.createBuffer(1, len, sr)
  const out = buf.getChannelData(0)
  const N = Math.max(2, Math.round(sr / freq))
  const ring = new Float32Array(N)
  // Bruit initial légèrement filtré pour une attaque moins agressive
  let prev = 0
  for (let i = 0; i < N; i++) {
    const n = Math.random() * 2 - 1
    prev = prev * 0.5 + n * 0.5
    ring[i] = prev
  }
  const decay = 0.9985
  let idx = 0
  for (let i = 0; i < len; i++) {
    const next = (idx + 1) % N
    const v = ring[idx]
    out[i] = v
    ring[idx] = decay * 0.5 * (v + ring[next])
    idx = next
  }
  // Fondu de fin pour éviter un clic
  const fade = Math.floor(sr * 0.15)
  for (let i = 0; i < fade; i++) out[len - fade + i] *= 1 - i / fade
  bufferCache.set(key, buf)
  return buf
}

export function pluck(freq, when = 0, gain = 0.35) {
  const c = getCtx()
  const t = when || c.currentTime
  const src = c.createBufferSource()
  src.buffer = stringBuffer(c, freq)
  const filter = c.createBiquadFilter()
  filter.type = 'lowpass'
  filter.frequency.value = 3200
  const g = c.createGain()
  g.gain.value = gain
  src.connect(filter).connect(g).connect(c.destination)
  src.start(t)
}

// frets : tableau de 6 valeurs (corde 6 → corde 1), -1 = corde étouffée
export function strum(frets, { when = 0, direction = 'down', spacing = 0.022, gain = 0.22 } = {}) {
  const c = getCtx()
  const start = when || c.currentTime + 0.02
  let order = [0, 1, 2, 3, 4, 5]
  if (direction === 'up') order = order.reverse().slice(0, 4) // un aller-retour vers le haut touche surtout les cordes aiguës
  let k = 0
  for (const s of order) {
    const f = frets[s]
    if (f < 0) continue
    pluck(midiToFreq(OPEN_MIDI[s] + f), start + k * spacing, direction === 'up' ? gain * 0.8 : gain)
    k++
  }
}

export function playNote(midi) {
  pluck(midiToFreq(midi), 0, 0.45)
}

export function click(when, accent = false) {
  const c = getCtx()
  const osc = c.createOscillator()
  const g = c.createGain()
  osc.frequency.value = accent ? 1600 : 1000
  g.gain.setValueAtTime(0.0001, when)
  g.gain.exponentialRampToValueAtTime(accent ? 0.6 : 0.35, when + 0.002)
  g.gain.exponentialRampToValueAtTime(0.0001, when + 0.05)
  osc.connect(g).connect(c.destination)
  osc.start(when)
  osc.stop(when + 0.06)
}

// Horloge : ordonnance les temps à l'avance sur l'horloge audio (précision de l'ordre de la ms)
// onSchedule(e) est appelé à l'avance avec l'heure audio exacte (pour programmer des sons)
// onTick(e) est appelé au moment où le temps sonne (pour l'affichage)
export class Clock {
  constructor(opts = {}) {
    this.bpm = opts.bpm ?? 80
    this.beatsPerBar = opts.beatsPerBar ?? 4
    this.subdivision = opts.subdivision ?? 1
    this.clickOn = opts.click ?? true
    this.accent = opts.accent ?? true
    this.onSchedule = opts.onSchedule || null
    this.onTick = opts.onTick || null
    this.timer = null
    this.timeouts = []
  }

  get running() {
    return this.timer !== null
  }

  start() {
    if (this.timer) return
    const c = getCtx()
    this.tick = 0
    this.nextTime = c.currentTime + 0.12
    this.timer = setInterval(() => this.schedule(), 25)
    this.schedule()
  }

  schedule() {
    const c = getCtx()
    while (this.nextTime < c.currentTime + 0.12) {
      this.scheduleTick(this.tick, this.nextTime)
      this.nextTime += 60 / this.bpm / this.subdivision
      this.tick++
    }
  }

  scheduleTick(tick, time) {
    const sub = tick % this.subdivision
    const beat = Math.floor(tick / this.subdivision)
    const beatInBar = beat % this.beatsPerBar
    const e = { tick, beat, beatInBar, sub, time }
    if (this.clickOn && sub === 0) click(time, this.accent && beatInBar === 0)
    if (this.onSchedule) this.onSchedule(e)
    const delay = Math.max(0, (time - getCtx().currentTime) * 1000)
    const id = setTimeout(() => {
      this.timeouts = this.timeouts.filter((t) => t !== id)
      if (this.timer && this.onTick) this.onTick(e)
    }, delay)
    this.timeouts.push(id)
  }

  stop() {
    clearInterval(this.timer)
    this.timer = null
    this.timeouts.forEach(clearTimeout)
    this.timeouts = []
  }
}
