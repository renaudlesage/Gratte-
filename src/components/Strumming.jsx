import { useEffect, useRef, useState } from 'react'
import { PATTERNS } from '../data/patterns.js'
import { getChord } from '../data/chords.js'
import { Clock, strum } from '../lib/audio.js'
import { useProgress } from '../lib/progress.jsx'
import BpmControl from './BpmControl.jsx'
import ChordSelect from './ChordSelect.jsx'

const COUNT_LABELS = ['1', 'et', '2', 'et', '3', 'et', '4', 'et']

export default function Strumming({ params = {} }) {
  const [patternId, setPatternId] = useState(params.pattern || 'noires')
  const [chordId, setChordId] = useState(params.chord || 'Em')
  const [bpm, setBpm] = useState(params.bpm || 70)
  const [withGuitar, setWithGuitar] = useState(true)
  const [running, setRunning] = useState(false)
  const [slot, setSlot] = useState(-1)
  const { markPracticed } = useProgress()

  const pattern = PATTERNS.find((p) => p.id === patternId) || PATTERNS[0]
  const ref = useRef({})
  ref.current = { pattern, chordId, withGuitar }

  const clockRef = useRef(null)
  if (!clockRef.current) {
    clockRef.current = new Clock({
      subdivision: 2,
      onSchedule: (e) => {
        const { pattern: p, chordId: cid, withGuitar: g } = ref.current
        const s = p.slots[e.tick % p.slots.length]
        if (g && s) strum(getChord(cid).frets, { when: e.time, direction: s === 'U' ? 'up' : 'down', spacing: 0.012, gain: 0.15 })
      },
      onTick: (e) => setSlot(e.tick % ref.current.pattern.slots.length),
    })
  }
  const clock = clockRef.current
  clock.bpm = bpm
  clock.beatsPerBar = pattern.beats

  useEffect(() => () => clock.stop(), [clock])

  useEffect(() => {
    if (params.pattern) setPatternId(params.pattern)
    if (params.chord) setChordId(params.chord)
    if (params.bpm) setBpm(params.bpm)
  }, [params.pattern, params.chord, params.bpm])

  const toggle = () => {
    if (clock.running) {
      clock.stop()
      setRunning(false)
      setSlot(-1)
    } else {
      clock.start()
      setRunning(true)
      markPracticed()
    }
  }

  const choosePattern = (id) => {
    if (clock.running) {
      clock.stop()
      setRunning(false)
      setSlot(-1)
    }
    setPatternId(id)
  }

  return (
    <div className="strum">
      <div className="chips">
        {PATTERNS.map((p) => (
          <button key={p.id} className={`chip${p.id === patternId ? ' on' : ''}`} onClick={() => choosePattern(p.id)}>
            {p.name}
          </button>
        ))}
      </div>
      <p className="muted">{pattern.tip}</p>

      <div className="strum-grid" style={{ gridTemplateColumns: `repeat(${pattern.slots.length}, 1fr)` }}>
        {pattern.slots.map((s, i) => (
          <div key={i} className={`strum-slot${i === slot ? ' on' : ''}${s ? '' : ' empty'}${i % 2 === 0 ? ' beat' : ''}`}>
            <span className="strum-arrow">{s === 'D' ? '↓' : s === 'U' ? '↑' : '·'}</span>
            <span className="strum-count">{COUNT_LABELS[i]}</span>
          </div>
        ))}
      </div>

      <BpmControl bpm={bpm} setBpm={setBpm} min={40} max={160} tap={false} />

      <div className="row wrap center gap">
        <ChordSelect label="Accord" value={chordId} onChange={setChordId} />
        <label className="field-inline">
          <input type="checkbox" checked={withGuitar} onChange={(e) => setWithGuitar(e.target.checked)} />
          Entendre le modèle
        </label>
      </div>

      <button className={`btn btn-big ${running ? '' : 'btn-primary'}`} onClick={toggle}>
        {running ? '■ Stop' : '▶ Jouer le rythme'}
      </button>
      <p className="muted small center">Astuce : écoutez d’abord le modèle, puis décochez « Entendre le modèle » et jouez seul avec le clic.</p>
    </div>
  )
}
