import { useRef } from 'react'

const TEMPO_NAMES = [
  [60, 'Largo'], [76, 'Adagio'], [108, 'Andante'], [120, 'Moderato'], [156, 'Allegro'], [200, 'Presto'], [999, 'Prestissimo'],
]
export const tempoName = (bpm) => TEMPO_NAMES.find(([max]) => bpm < max)[1]

export default function BpmControl({ bpm, setBpm, min = 40, max = 220, tap = true }) {
  const taps = useRef([])
  const clamp = (v) => Math.max(min, Math.min(max, Math.round(v)))

  const onTap = () => {
    const now = performance.now()
    const t = taps.current.filter((x) => now - x < 2500)
    t.push(now)
    taps.current = t.slice(-6)
    if (taps.current.length >= 2) {
      const iv = []
      for (let i = 1; i < taps.current.length; i++) iv.push(taps.current[i] - taps.current[i - 1])
      setBpm(clamp(60000 / (iv.reduce((a, b) => a + b, 0) / iv.length)))
    }
  }

  return (
    <div className="bpm">
      <div className="bpm-row">
        <button className="btn btn-round" onClick={() => setBpm(clamp(bpm - 5))} aria-label="Moins 5 BPM">−</button>
        <div className="bpm-value">
          <strong>{bpm}</strong>
          <span>BPM · {tempoName(bpm)}</span>
        </div>
        <button className="btn btn-round" onClick={() => setBpm(clamp(bpm + 5))} aria-label="Plus 5 BPM">+</button>
      </div>
      <input type="range" min={min} max={max} value={bpm} onChange={(e) => setBpm(Number(e.target.value))} aria-label="Tempo" />
      {tap && (
        <button className="btn btn-ghost small" onClick={onTap}>
          Taper le tempo
        </button>
      )}
    </div>
  )
}
