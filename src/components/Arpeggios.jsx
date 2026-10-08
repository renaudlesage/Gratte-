import { useEffect, useRef, useState } from 'react'
import { ARPEGGIOS, FINGER } from '../data/arpeggios.js'
import { getChord } from '../data/chords.js'
import { Clock, pluck, midiToFreq, OPEN_MIDI } from '../lib/audio.js'
import { bassStrings } from '../lib/music.js'
import { useProgress } from '../lib/progress.jsx'
import BpmControl from './BpmControl.jsx'
import ChordSelect from './ChordSelect.jsx'

// Cordes jouées à un pas donné, pour un accord donné
function stepStrings(step, chord) {
  const { bass, alt } = bassStrings(chord)
  return String(step)
    .split('+')
    .map((r) => (r === 'B' ? bass : r === 'A' ? alt : 6 - Number(r)))
    .filter((s) => chord.frets[s] >= 0)
}

export default function Arpeggios() {
  const [patternId, setPatternId] = useState('montant')
  const [chordId, setChordId] = useState('C')
  const [bpm, setBpm] = useState(60)
  const [withGuitar, setWithGuitar] = useState(true)
  const [running, setRunning] = useState(false)
  const [step, setStep] = useState(-1)
  const startedAt = useRef(0)
  const { markPracticed, logActivity } = useProgress()

  const pattern = ARPEGGIOS.find((p) => p.id === patternId)
  const chord = getChord(chordId)
  const ref = useRef({})
  ref.current = { pattern, chord, withGuitar }

  const clockRef = useRef(null)
  if (!clockRef.current) {
    clockRef.current = new Clock({
      subdivision: 2,
      onSchedule: (e) => {
        const { pattern: p, chord: c, withGuitar: g } = ref.current
        if (!g) return
        const st = p.steps[e.tick % p.steps.length]
        stepStrings(st, c).forEach((s) => pluck(midiToFreq(OPEN_MIDI[s] + c.frets[s]), e.time, s === stepStrings(st, c)[0] && st.startsWith('B') ? 0.3 : 0.24, s))
      },
      onTick: (e) => setStep(e.tick % ref.current.pattern.steps.length),
    })
  }
  const clock = clockRef.current
  clock.bpm = bpm
  clock.beatsPerBar = pattern.beats

  useEffect(() => () => clock.stop(), [clock])

  const stop = () => {
    clock.stop()
    setRunning(false)
    setStep(-1)
    if (Date.now() - startedAt.current > 20000) logActivity('arpege', patternId, bpm)
  }

  const toggle = () => {
    if (clock.running) stop()
    else {
      clock.start()
      startedAt.current = Date.now()
      setRunning(true)
      markPracticed()
    }
  }

  // Tablature : corde 1 en haut
  const rows = [5, 4, 3, 2, 1, 0]
  const cols = pattern.steps.map((st) => stepStrings(st, chord))

  return (
    <div className="arp">
      <div className="chips">
        {ARPEGGIOS.map((p) => (
          <button key={p.id} className={`chip${p.id === patternId ? ' on' : ''}`} onClick={() => { if (clock.running) stop(); setPatternId(p.id) }}>
            {p.name}
          </button>
        ))}
      </div>
      <p className="muted">{pattern.tip}</p>

      <div className="tab-scroll">
        <div className="tab" style={{ gridTemplateColumns: `28px repeat(${pattern.steps.length}, minmax(30px, 1fr))` }}>
          {rows.map((s) => (
            <div key={s} style={{ display: 'contents' }}>
              <span className="tab-name">{['E', 'A', 'D', 'G', 'B', 'e'][s]}</span>
              {cols.map((strs, i) => (
                <span key={i} className={`tab-cell${i === step ? ' now' : ''}`}>
                  {strs.includes(s) ? <b>{chord.frets[s]}</b> : null}
                </span>
              ))}
            </div>
          ))}
          <span />
          {pattern.steps.map((st, i) => (
            <span key={`f${i}`} className={`tab-finger${i === step ? ' now' : ''}`}>{FINGER[st]}</span>
          ))}
        </div>
      </div>
      <p className="muted small center">p = pouce · i = index · m = majeur · a = annulaire. Les chiffres sont les cases à jouer.</p>

      <BpmControl bpm={bpm} setBpm={setBpm} min={40} max={140} tap={false} />
      <div className="row wrap center gap">
        <ChordSelect id="arp-chord" label="Accord" value={chordId} onChange={setChordId} />
        <label className="field-inline">
          <input id="arp-model" type="checkbox" checked={withGuitar} onChange={(e) => setWithGuitar(e.target.checked)} />
          Entendre le modèle
        </label>
      </div>
      <button className={`btn btn-big ${running ? '' : 'btn-primary'}`} onClick={toggle}>{running ? '■ Stop' : '▶ Jouer l’arpège'}</button>
    </div>
  )
}
