import { useEffect, useRef, useState } from 'react'
import { CHORDS, PROGRESSIONS, getChord } from '../data/chords.js'
import { Clock, strum } from '../lib/audio.js'
import { useProgress } from '../lib/progress.jsx'
import ChordDiagram from './ChordDiagram.jsx'
import BpmControl from './BpmControl.jsx'
import { useSettings } from '../lib/settings.jsx'
import { STYLES, scheduleBar } from '../lib/band.js'

export default function ChordFlow({ params = {} }) {
  const [seq, setSeq] = useState(params.chords || ['G', 'D', 'Em', 'C'])
  const [bpm, setBpm] = useState(params.bpm || 60)
  const [beatsPerChord, setBeatsPerChord] = useState(4)
  const [playChords, setPlayChords] = useState(true)
  const [band, setBand] = useState(params.band || 'aucun')
  const bandRef = useRef(band)
  bandRef.current = band
  const [running, setRunning] = useState(false)
  const [pos, setPos] = useState({ idx: 0, beat: -1 })
  const [adding, setAdding] = useState('Am')
  const { markPracticed, logActivity } = useProgress()
  const startedAt = useRef(0)
  const { label } = useSettings()

  const seqRef = useRef(seq)
  const playRef = useRef(playChords)
  seqRef.current = seq
  playRef.current = playChords

  const clockRef = useRef(null)
  if (!clockRef.current) {
    clockRef.current = new Clock({
      onSchedule: (e) => {
        if (e.beatInBar === 0) {
          const s = seqRef.current
          const k = Math.floor(e.beat / clockRef.current.beatsPerBar)
          const name = s[k % s.length]
          const c = getChord(name)
          if (playRef.current && c) strum(c.frets, { when: e.time, gain: 0.16 })
          scheduleBar(bandRef.current, name, s[(k + 1) % s.length], e.time, 60 / clockRef.current.bpm, Math.min(4, clockRef.current.beatsPerBar))
        }
      },
      onTick: (e) => {
        const s = seqRef.current
        setPos({ idx: Math.floor(e.beat / clockRef.current.beatsPerBar) % s.length, beat: e.beatInBar })
      },
    })
  }
  const clock = clockRef.current
  clock.bpm = bpm

  useEffect(() => () => clock.stop(), [clock])

  useEffect(() => {
    if (params.chords) setSeq(params.chords)
    if (params.bpm) setBpm(params.bpm)
    if (params.band) setBand(params.band)
  }, [params.chords, params.bpm, params.band])

  const toggle = () => {
    if (clock.running) {
      clock.stop()
      setRunning(false)
      setPos({ idx: 0, beat: -1 })
      if (Date.now() - startedAt.current > 30000) logActivity('flow', seq.join('-'))
    } else {
      clock.beatsPerBar = beatsPerChord
      clock.start()
      startedAt.current = Date.now()
      setRunning(true)
      markPracticed()
    }
  }

  const changeBeats = (n) => {
    setBeatsPerChord(n)
    clock.beatsPerBar = n
  }

  const current = getChord(seq[pos.idx % seq.length])
  const next = getChord(seq[(pos.idx + 1) % seq.length])

  return (
    <div className="flow">
      {!running && (
        <>
          <div className="chips">
            {PROGRESSIONS.map((p) => (
              <button key={p.name} className="chip" onClick={() => setSeq(p.chords)}>{p.name}</button>
            ))}
          </div>
          <div className="seq">
            {seq.map((id, i) => (
              <span key={i} className="seq-item">
                {label(id)}
                {seq.length > 1 && (
                  <button aria-label={`Retirer ${id}`} onClick={() => setSeq(seq.filter((_, j) => j !== i))}>×</button>
                )}
              </span>
            ))}
            <span className="seq-add">
              <select value={adding} onChange={(e) => setAdding(e.target.value)} aria-label="Accord à ajouter">
                {CHORDS.map((c) => <option key={c.id} value={c.id}>{label(c.id)}</option>)}
              </select>
              <button className="btn btn-ghost small" onClick={() => setSeq([...seq, adding])}>+ Ajouter</button>
            </span>
          </div>
        </>
      )}

      <div className="flow-stage">
        <div className="flow-current">
          <ChordDiagram chord={current} size={170} highlight={running} />
        </div>
        <div className="flow-next">
          <span className="muted small">Ensuite</span>
          <ChordDiagram chord={next} size={90} />
        </div>
      </div>

      <div className="beat-dots" aria-hidden>
        {Array.from({ length: beatsPerChord }, (_, i) => (
          <span key={i} className={`beat-dot${i === pos.beat ? ' on' : ''}${i === beatsPerChord - 1 && pos.beat === i ? ' warn' : ''}`} />
        ))}
      </div>

      <BpmControl bpm={bpm} setBpm={setBpm} min={40} max={160} tap={false} />

      <div className="row wrap center gap">
        <label className="field-inline">
          Temps par accord
          <select value={beatsPerChord} onChange={(e) => changeBeats(Number(e.target.value))} disabled={running}>
            {[2, 3, 4, 8].map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </label>
        <label className="field-inline">
          <input type="checkbox" checked={playChords} onChange={(e) => setPlayChords(e.target.checked)} />
          Jouer l’accord avec moi
        </label>
        <label className="field-inline">
          Groupe
          <select id="flow-band" value={band} onChange={(e) => setBand(e.target.value)}>
            {STYLES.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
          </select>
        </label>
      </div>

      <button className={`btn btn-big ${running ? '' : 'btn-primary'}`} onClick={toggle}>
        {running ? '■ Stop' : '▶ Lancer l’enchaînement'}
      </button>
    </div>
  )
}
