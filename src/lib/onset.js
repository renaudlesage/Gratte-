// Détection des coups de médiator (attaques) dans le signal du micro.
// Fonction autonome : elle est aussi injectée telle quelle dans l'AudioWorklet,
// elle ne doit donc référencer aucune variable extérieure.
export function createOnsetDetector(sampleRate, opts) {
  const o = opts || {}
  const HOP = 128
  const slowCoef = Math.exp(-HOP / (sampleRate * (o.slow || 0.03))) // fond sonore récent
  const peakCoef = Math.exp(-HOP / (sampleRate * 2.0)) // niveau max récent (~2 s)
  const refractory = o.refr || 0.07 // une gratte arpégée dure ~40 ms : un seul coup
  const ratio = o.ratio || 1.6
  const jump = o.jump || 1.3
  const floorK = o.floor || 0.006
  const hp2 = o.hp2 !== false // double dérivée : réglages validés hors ligne (99 % des coups détectés)
  let prev2 = 0
  let prev = 0
  let slow = 0
  let peak = 0
  let lastOnset = -1
  let acc = 0
  let n = 0
  let hopStart = 0
  let prevHop = 0
  return {
    // block : échantillons, t0 : heure (s) du premier échantillon. Renvoie les heures des coups.
    process(block, t0) {
      const out = []
      for (let i = 0; i < block.length; i++) {
        if (n === 0) hopStart = t0 + i / sampleRate
        const x = block[i]
        let d = x - prev // passe-haut simple : accentue l'attaque du médiator
        if (hp2) {
          const d2 = d - prev2
          prev2 = d
          d = d2
        }
        prev = x
        acc += d * d
        n++
        if (n === HOP) {
          const e = acc / HOP
          peak = Math.max(e, peak * peakCoef)
          const floor = Math.max(1e-7, peak * floorK)
          const rising = e > slow * ratio && e > prevHop * jump
          if (rising && e > floor && hopStart - lastOnset > refractory) {
            out.push(hopStart)
            lastOnset = hopStart
          }
          slow = slow * slowCoef + e * (1 - slowCoef)
          prevHop = e
          acc = 0
          n = 0
        }
      }
      return out
    },
  }
}

// Compare les coups détectés aux coups attendus.
// expected : [{ t, beatInBar, sub }], onsets : [t] (déjà corrigés de la latence)
export function scoreRhythm(expected, onsets, slotDur, tolerance = 0.04) {
  const used = new Set()
  const hits = []
  let missed = 0
  for (const ex of expected) {
    let best = -1
    let bestDt = Infinity
    onsets.forEach((t, i) => {
      if (used.has(i)) return
      const dt = t - ex.t
      if (Math.abs(dt) < Math.abs(bestDt)) {
        bestDt = dt
        best = i
      }
    })
    if (best >= 0 && Math.abs(bestDt) < slotDur * 0.5) {
      used.add(best)
      hits.push({ ...ex, dt: bestDt })
    } else missed++
  }
  const extra = onsets.length - used.size
  const inTime = hits.filter((h) => Math.abs(h.dt) <= tolerance).length
  const total = expected.length || 1
  const mean = hits.length ? hits.reduce((s, h) => s + h.dt, 0) / hits.length : 0
  const sd = hits.length > 1 ? Math.sqrt(hits.reduce((s, h) => s + (h.dt - mean) ** 2, 0) / (hits.length - 1)) : 0
  // Temps où l'on est le plus en avance ou en retard
  const byBeat = {}
  for (const h of hits) {
    const k = h.beatInBar
    byBeat[k] = byBeat[k] || []
    byBeat[k].push(h.dt)
  }
  let worst = null
  for (const [k, arr] of Object.entries(byBeat)) {
    const m = arr.reduce((s, x) => s + x, 0) / arr.length
    if (arr.length >= 2 && Math.abs(m) > 0.025 && (!worst || Math.abs(m) > Math.abs(worst.mean))) worst = { beat: Number(k), mean: m }
  }
  return {
    score: Math.round((inTime / total) * 100),
    hits: hits.length,
    missed,
    extra,
    meanMs: Math.round(mean * 1000),
    sdMs: Math.round(sd * 1000),
    worst,
    details: hits,
  }
}
