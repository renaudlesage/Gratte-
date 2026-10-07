// Détection de hauteur par autocorrélation (variante de l'algorithme ACF2+).
// Recherche limitée à la plage utile d'une guitare (≈ 60 Hz – 1200 Hz).

export function detectPitch(input, sampleRate) {
  let size = input.length
  let rms = 0
  for (let i = 0; i < size; i++) rms += input[i] * input[i]
  rms = Math.sqrt(rms / size)
  if (rms < 0.01) return -1 // trop faible : silence

  // Rogne les bords pour démarrer près d'un passage par zéro
  let r1 = 0
  let r2 = size - 1
  const thres = 0.2
  for (let i = 0; i < size / 2; i++) if (Math.abs(input[i]) < thres) { r1 = i; break }
  for (let i = 1; i < size / 2; i++) if (Math.abs(input[size - i]) < thres) { r2 = size - i; break }
  const buf = input.slice(r1, r2)
  size = buf.length

  const maxLag = Math.min(size - 2, Math.floor(sampleRate / 60))
  const c = new Float32Array(maxLag + 2)
  for (let lag = 0; lag <= maxLag + 1; lag++) {
    let sum = 0
    for (let j = 0; j < size - lag; j++) sum += buf[j] * buf[j + lag]
    c[lag] = sum
  }

  // Saute la descente initiale, puis prend le maximum
  let d = 0
  while (d < maxLag && c[d] > c[d + 1]) d++
  const minLag = Math.floor(sampleRate / 1200)
  let maxVal = -Infinity
  let maxPos = -1
  for (let i = Math.max(d, minLag); i <= maxLag; i++) {
    if (c[i] > maxVal) { maxVal = c[i]; maxPos = i }
  }
  if (maxPos <= 0 || maxVal < c[0] * 0.3) return -1 // pas assez périodique

  // Interpolation parabolique pour une précision sous-échantillon
  let t0 = maxPos
  const x1 = c[t0 - 1]
  const x2 = c[t0]
  const x3 = c[t0 + 1]
  const a = (x1 + x3 - 2 * x2) / 2
  const b = (x3 - x1) / 2
  if (a) t0 = t0 - b / (2 * a)
  return sampleRate / t0
}

export function median(values) {
  const s = [...values].sort((a, b) => a - b)
  const m = Math.floor(s.length / 2)
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}
