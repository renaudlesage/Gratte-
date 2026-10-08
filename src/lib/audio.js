// Moteur audio partagé : contexte unique, synthèse de corde (Karplus-Strong étendu),
// deux timbres (acoustique / électrique), clic de métronome et horloge de précision.

let ctx = null
let override = null // contexte hors ligne temporaire (rendu de fichiers, tests)

export function getCtx() {
  if (override) return override
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

/* ---------- Choix du timbre ---------- */

export const VOICES = [
  ['acoustique', 'Acoustique'],
  ['electrique', 'Électrique'],
]
const VOICE_KEY = 'gratte.voice'
let voice = 'acoustique'
try {
  const v = localStorage.getItem(VOICE_KEY)
  if (v === 'acoustique' || v === 'electrique') voice = v
} catch {
  /* stockage indisponible */
}
export const getVoice = () => voice
export function setVoice(v) {
  voice = v
  try {
    localStorage.setItem(VOICE_KEY, v)
  } catch {
    /* stockage indisponible */
  }
}

/* ---------- Synthèse des cordes ---------- */

const bufferCache = new Map()
const CACHE_MAX = 90

function cacheGet(key, make) {
  if (bufferCache.has(key)) {
    const b = bufferCache.get(key)
    bufferCache.delete(key)
    bufferCache.set(key, b) // plus récemment utilisé
    return b
  }
  const b = make()
  bufferCache.set(key, b)
  if (bufferCache.size > CACHE_MAX) bufferCache.delete(bufferCache.keys().next().value)
  return b
}

// Guitare acoustique (cordes acier) : Karplus-Strong avec accord fin (passe-tout fractionnaire),
// sustain réaliste par corde, attaque brillante, position du médiator et bruit d'attaque.
function acousticBuffer(c, freq, variant) {
  const sr = c.sampleRate
  // Une corde grave d'acoustique sonne ~5 s, une aiguë ~1,5 s
  const t60 = Math.max(1.2, 5 - 1.25 * Math.log2(freq / 82.4))
  const len = Math.floor(sr * Math.min(3.2, t60 * 0.75 + 0.4))
  const buf = c.createBuffer(1, len, sr)
  const out = buf.getChannelData(0)

  // Longueur de boucle exacte : retard entier + 0,5 (moyenne) + passe-tout fractionnaire
  const D = sr / freq
  let N = Math.floor(D - 0.5)
  let frac = D - 0.5 - N
  if (frac < 0.15) { N -= 1; frac += 1 }
  const C = (1 - frac) / (1 + frac)
  const g = Math.pow(0.001, 1 / (t60 * freq)) // perte par aller-retour

  // Excitation : bruit peu filtré (attaque d'un médiator), puis filtre en peigne
  // qui imite la position de pincement, près du chevalet → son clair et boisé
  const rnd = mulberry(Math.round(freq * 100) + variant * 7919)
  const bright = 0.2 + rnd() * 0.12
  const exc = new Float32Array(N)
  let lp = 0
  for (let i = 0; i < N; i++) {
    lp = bright * lp + (1 - bright) * (rnd() * 2 - 1)
    exc[i] = lp
  }
  const P = Math.max(1, Math.round(N * (0.11 + rnd() * 0.05)))
  const shaped = new Float32Array(N)
  let mean = 0
  for (let i = 0; i < N; i++) {
    shaped[i] = exc[i] - (i >= P ? exc[i - P] : 0)
    mean += shaped[i]
  }
  mean /= N
  let peak = 0
  for (let i = 0; i < N; i++) {
    shaped[i] -= mean
    peak = Math.max(peak, Math.abs(shaped[i]))
  }
  for (let i = 0; i < N; i++) shaped[i] /= peak || 1

  const line = new Float32Array(N)
  let idx = 0
  let prevDelayed = 0
  let apX = 0
  let apY = 0
  for (let i = 0; i < len; i++) {
    const delayed = line[idx]
    const avg = 0.5 * (delayed + prevDelayed)
    prevDelayed = delayed
    const ap = C * avg + apX - C * apY
    apX = avg
    apY = ap
    const y = (i < N ? shaped[i] : 0) + g * ap
    line[idx] = y
    idx = idx + 1 === N ? 0 : idx + 1
    out[i] = y
  }

  // Bruit d'attaque du médiator sur la corde (quelques millisecondes)
  const clickLen = Math.floor(sr * 0.012)
  let prevN = 0
  for (let i = 0; i < clickLen; i++) {
    const n = rnd() * 2 - 1
    out[i] += (n - prevN) * 0.11 * Math.exp(-i / (sr * 0.0025))
    prevN = n
  }

  // Coupe-continu + normalisation + fondu final
  let x1 = 0
  let y1 = 0
  peak = 0
  for (let i = 0; i < len; i++) {
    const y = out[i] - x1 + 0.995 * y1
    x1 = out[i]
    y1 = y
    out[i] = y
    peak = Math.max(peak, Math.abs(y))
  }
  const fade = Math.floor(sr * 0.2)
  for (let i = 0; i < len; i++) {
    out[i] /= peak || 1
    if (i > len - fade) out[i] *= (len - i) / fade
  }
  return buf
}

// Guitare électrique en son clair : sustain long, timbre rond (version d'origine)
function electricBuffer(c, freq) {
  const sr = c.sampleRate
  const len = Math.floor(sr * 2.8)
  const buf = c.createBuffer(1, len, sr)
  const out = buf.getChannelData(0)
  const N = Math.max(2, Math.round(sr / freq))
  const ring = new Float32Array(N)
  let prev = 0
  for (let i = 0; i < N; i++) {
    prev = prev * 0.5 + (Math.random() * 2 - 1) * 0.5
    ring[i] = prev
  }
  let idx = 0
  for (let i = 0; i < len; i++) {
    const next = (idx + 1) % N
    const v = ring[idx]
    out[i] = v
    ring[idx] = 0.9985 * 0.5 * (v + ring[next])
    idx = next
  }
  const fade = Math.floor(sr * 0.15)
  for (let i = 0; i < fade; i++) out[len - fade + i] *= 1 - i / fade
  return buf
}

function stringBuffer(c, freq, v) {
  if (v === 'electrique') return cacheGet(`e:${c.sampleRate}:${Math.round(freq * 10)}`, () => electricBuffer(c, freq))
  const variant = Math.floor(Math.random() * 2)
  return cacheGet(`a:${c.sampleRate}:${Math.round(freq * 10)}:${variant}`, () => acousticBuffer(c, freq, variant))
}

function mulberry(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/* ---------- Caisse de résonance et chaîne de sortie ---------- */

// Réponse impulsionnelle de caisse : modes de résonance d'une table d'harmonie
// (résonance d'air ~100 Hz, table ~200 Hz, puis modes supérieurs) + court bruit boisé.
function bodyImpulse(c) {
  const sr = c.sampleRate
  const len = Math.floor(sr * 0.18)
  const buf = c.createBuffer(1, len, sr)
  const d = buf.getChannelData(0)
  const modes = [
    [102, 1.0, 0.055], [196, 0.85, 0.045], [228, 0.45, 0.035], [290, 0.5, 0.03], [395, 0.45, 0.025],
    [520, 0.35, 0.02], [680, 0.28, 0.016], [880, 0.22, 0.012], [1150, 0.18, 0.009], [1580, 0.14, 0.007],
    [2250, 0.12, 0.005], [3200, 0.09, 0.004],
  ]
  const rnd = mulberry(4242)
  d[0] = 1
  for (let i = 1; i < len; i++) {
    const t = i / sr
    let s = 0
    for (const [f, a, tau] of modes) s += a * Math.exp(-t / tau) * Math.sin(2 * Math.PI * f * t)
    s += (rnd() * 2 - 1) * 0.25 * Math.exp(-t / 0.008)
    d[i] = s * 0.035
  }
  return buf
}

const chains = new WeakMap()

function outputChain(c) {
  if (chains.has(c)) return chains.get(c)
  const master = c.createDynamicsCompressor()
  master.threshold.value = -14
  master.ratio.value = 3
  master.attack.value = 0.004
  master.release.value = 0.2
  master.connect(c.destination)

  // Acoustique : son direct + caisse convoluée, puis égalisation typée « folk »
  const ac = c.createGain()
  const hp = c.createBiquadFilter()
  hp.type = 'highpass'
  hp.frequency.value = 75
  const eq = [
    ['peaking', 105, 1.2, 3],
    ['peaking', 200, 1.4, 2],
    ['peaking', 900, 1.0, -2.5],
    ['peaking', 3200, 0.9, 3],
    ['highshelf', 8500, 0.7, -5],
  ].map(([type, f, q, gain]) => {
    const b = c.createBiquadFilter()
    b.type = type
    b.frequency.value = f
    b.Q.value = q
    b.gain.value = gain
    return b
  })
  const dry = c.createGain()
  dry.gain.value = 0.55
  const body = c.createConvolver()
  body.normalize = false
  body.buffer = bodyImpulse(c)
  const wet = c.createGain()
  wet.gain.value = 0.9
  ac.connect(dry).connect(hp)
  ac.connect(body).connect(wet).connect(hp)
  eq.reduce((node, b) => node.connect(b), hp).connect(master)

  // Électrique : filtre passe-bas d'origine
  const el = c.createBiquadFilter()
  el.type = 'lowpass'
  el.frequency.value = 3200
  el.connect(master)

  const chain = { acoustique: ac, electrique: el, ringing: new Map() }
  chains.set(c, chain)
  return chain
}

/* ---------- Jeu ---------- */

// stringIdx : quand une corde est rejouée, la note précédente sur cette corde est étouffée,
// comme sur un vrai instrument (évite la bouillie sonore pendant les rythmiques).
export function pluck(freq, when = 0, gain = 0.35, stringIdx = null) {
  const c = getCtx()
  const t = Math.max(when || 0, c.currentTime)
  const v = voice
  const chain = outputChain(c)
  const src = c.createBufferSource()
  src.buffer = stringBuffer(c, freq, v)
  const g = c.createGain()
  g.gain.value = v === 'acoustique' ? gain * 0.9 : gain
  src.connect(g).connect(chain[v])
  if (stringIdx !== null) {
    const prev = chain.ringing.get(stringIdx)
    if (prev) {
      prev.gain.cancelScheduledValues(t)
      prev.gain.setTargetAtTime(0, t, 0.012)
      try {
        prev.src.stop(t + 0.2)
      } catch {
        /* déjà arrêtée */
      }
    }
    chain.ringing.set(stringIdx, { gain: g.gain, src })
  }
  src.start(t)
}

// frets : tableau de 6 valeurs (corde 6 → corde 1), -1 = corde étouffée
export function strum(frets, { when = 0, direction = 'down', spacing = 0.022, gain = 0.22 } = {}) {
  const c = getCtx()
  const start = when || c.currentTime + 0.02
  let order = [0, 1, 2, 3, 4, 5]
  if (direction === 'up') order = order.reverse().slice(0, 4) // vers le haut, on touche surtout les cordes aiguës
  let k = 0
  for (const s of order) {
    const f = frets[s]
    if (f < 0) continue
    // Légères variations de force et de placement : un humain ne gratte jamais deux fois pareil
    const human = 0.88 + Math.random() * 0.24
    const jitter = k === 0 ? 0 : (Math.random() - 0.5) * spacing * 0.35
    const base = direction === 'up' ? gain * 0.8 : gain
    pluck(midiToFreq(OPEN_MIDI[s] + f), start + k * spacing + jitter, base * human, s)
    k++
  }
}

export function playNote(midi, stringIdx = null) {
  pluck(midiToFreq(midi), 0, 0.45, stringIdx)
}

// Rendu hors ligne (vérification du son, export éventuel)
export async function renderOffline(seconds, play, sampleRate = 44100) {
  const oc = new OfflineAudioContext(1, Math.ceil(seconds * sampleRate), sampleRate)
  override = oc
  try {
    play()
  } finally {
    override = null
  }
  return oc.startRendering()
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
