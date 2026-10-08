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
  const [trainer, setTrainer] = useState(false)
  const [step, setStep] = useState(4) // BPM ajoutés
  const [every, setEvery] = useState(4) // toutes les N mesures
  const [target, setTarget] = useState(120)
  const [barsLeft, setBarsLeft] = useState(null)
  const startBpm = useRef(80)
  const clockRef = useRef(null)
  const cfg = useRef({})
  cfg.current = { trainer, step, every, target }
  const { markPracticed, logActivity } = useProgress()

  if (!clockRef.current) {
    clockRef.current = new Clock({
      onSchedule: (e) => {
        const c = cfg.current
        if (!c.trainer || e.beatInBar !== 0 || e.beat === 0) return
        const bar = e.beat / clockRef.current.beatsPerBar
        // Accélère au début de chaque palier, jusqu'au tempo visé
        if (bar % c.every === 0 && clockRef.current.bpm < c.target) {
          const next = Math.min(c.target, clockRef.current.bpm + c.step)
          clockRef.current.bpm = next
          setBpm(next) // le rendu suivant réapplique ce tempo à l'horloge
        }
      },
      onTick: (e) => {
        setCurrent(e.beatInBar)
        const c = cfg.current
        if (c.trainer && e.beatInBar === 0) {
          const bar = e.beat / clockRef.current.beatsPerBar
          setBarsLeft(clockRef.current.bpm >= c.target ? 0 : c.every - (bar % c.every))
        }
      },
    })
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
      setBarsLeft(null)
      if (trainer) {
        logActivity('speed', '', bpm)
        setBpm(startBpm.current)
      }
    } else {
      startBpm.current = bpm
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
          <select id="metro-beats" value={beats} onChange={(e) => setBeats(Number(e.target.value))}>
            {[2, 3, 4, 5, 6, 7].map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </label>
        <label className="field-inline">
          <input id="metro-accent" type="checkbox" checked={accent} onChange={(e) => setAccent(e.target.checked)} />
          Accent sur le 1
        </label>
      </div>

      <div className="eval-box">
        <label className="field-inline">
          <input id="metro-trainer" type="checkbox" checked={trainer} disabled={running} onChange={(e) => setTrainer(e.target.checked)} />
          Accélérateur de tempo
        </label>
        {trainer && (
          <>
            <div className="row wrap gap">
              <label className="field-inline">
                +
                <select id="tr-step" value={step} onChange={(e) => setStep(Number(e.target.value))} disabled={running}>
                  {[2, 4, 5, 8, 10].map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
                BPM toutes les
                <select id="tr-every" value={every} onChange={(e) => setEvery(Number(e.target.value))} disabled={running}>
                  {[1, 2, 4, 8].map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
                mesures
              </label>
              <label className="field-inline">
                jusqu’à
                <select id="tr-target" value={target} onChange={(e) => setTarget(Number(e.target.value))} disabled={running}>
                  {[80, 100, 120, 140, 160, 180, 200].map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
                BPM
              </label>
            </div>
            <p className="muted small">
              {running && barsLeft !== null
                ? barsLeft === 0
                  ? `Tempo visé atteint : ${bpm} BPM. Tenez-le !`
                  : `Prochaine accélération dans ${barsLeft} mesure${barsLeft > 1 ? 's' : ''}.`
                : 'Jouez un exercice en boucle : le tempo monte tout seul. Arrêtez-vous dès que ce n’est plus propre, et notez ce tempo : c’est votre limite actuelle.'}
            </p>
          </>
        )}
      </div>

      <button className={`btn btn-big ${running ? '' : 'btn-primary'}`} onClick={toggle}>
        {running ? '■ Stop' : '▶ Démarrer'}
      </button>
    </div>
  )
}
