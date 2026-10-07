import { useEffect, useRef, useState } from 'react'
import { Clock } from '../lib/audio.js'
import { useProgress } from '../lib/progress.jsx'
import BpmControl from './BpmControl.jsx'

export default function Metronome() {
  const [bpm, setBpm] = useState(80)
  const [beats, setBeats] = useState(4)
  const [accent, setAccent] = useState(true)
  const [running, setRunning] = useState(false)
  const [current, setCurrent] = useState(-1)
  const clockRef = useRef(null)
  const { markPracticed } = useProgress()

  if (!clockRef.current) {
    clockRef.current = new Clock({ onTick: (e) => setCurrent(e.beatInBar) })
  }
  const clock = clockRef.current
  clock.bpm = bpm
  clock.beatsPerBar = beats
  clock.accent = accent

  useEffect(() => () => clock.stop(), [clock])

  const toggle = () => {
    if (clock.running) {
      clock.stop()
      setRunning(false)
      setCurrent(-1)
    } else {
      clock.start()
      setRunning(true)
      markPracticed()
    }
  }

  return (
    <div className="metronome">
      <div className="beat-dots" aria-hidden>
        {Array.from({ length: beats }, (_, i) => (
          <span key={i} className={`beat-dot${i === current ? ' on' : ''}${i === 0 && accent ? ' accent' : ''}`} />
        ))}
      </div>
      <BpmControl bpm={bpm} setBpm={setBpm} />
      <div className="row wrap center gap">
        <label className="field-inline">
          Temps par mesure
          <select value={beats} onChange={(e) => setBeats(Number(e.target.value))}>
            {[2, 3, 4, 5, 6, 7].map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </label>
        <label className="field-inline">
          <input type="checkbox" checked={accent} onChange={(e) => setAccent(e.target.checked)} />
          Accent sur le 1
        </label>
      </div>
      <button className={`btn btn-big ${running ? '' : 'btn-primary'}`} onClick={toggle}>
        {running ? '■ Stop' : '▶ Démarrer'}
      </button>
    </div>
  )
}
