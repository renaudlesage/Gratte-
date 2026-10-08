import { useEffect, useRef, useState } from 'react'
import { detectPitch, median } from '../lib/pitch.js'
import { getCtx, freqToMidi, midiToFreq, NOTE_FR, NOTE_EN, playNote } from '../lib/audio.js'
import { TUNINGS, TUNING_IDS } from '../data/tunings.js'
import { useProgress } from '../lib/progress.jsx'
import { useSettings } from '../lib/settings.jsx'

export default function Tuner() {
  const [listening, setListening] = useState(false)
  const [error, setError] = useState('')
  const [reading, setReading] = useState(null) // { freq, midi, cents, string, stringCents }
  const streamRef = useRef(null)
  const rafRef = useRef(0)
  const historyRef = useRef([])
  const { markPracticed, logActivity } = useProgress()
  const tunedLogged = useRef(false)
  const { notation, tuning, update } = useSettings()
  const tuningId = TUNINGS[tuning] ? tuning : 'standard'
  const OPEN = TUNINGS[tuningId].notes
  const openRef = useRef(OPEN)
  openRef.current = OPEN
  const [MAIN, SUB] = notation === 'fr' ? [NOTE_FR, NOTE_EN] : [NOTE_EN, NOTE_FR]

  const stop = () => {
    cancelAnimationFrame(rafRef.current)
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    setListening(false)
  }

  useEffect(() => stop, [])

  const start = async () => {
    setError('')
    if (!navigator.mediaDevices?.getUserMedia) {
      setError("Ce navigateur ne donne pas accès au micro. Essayez Chrome, Safari ou Firefox, en HTTPS.")
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
      })
      streamRef.current = stream
      const ctx = getCtx()
      const source = ctx.createMediaStreamSource(stream)
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 2048
      source.connect(analyser)
      const buf = new Float32Array(analyser.fftSize)
      let last = 0
      setListening(true)
      markPracticed()

      const loop = (t) => {
        rafRef.current = requestAnimationFrame(loop)
        if (t - last < 60) return
        last = t
        analyser.getFloatTimeDomainData(buf)
        const f = detectPitch(buf, ctx.sampleRate)
        if (f < 60 || f > 1200) {
          historyRef.current = []
          return
        }
        const h = historyRef.current
        h.push(f)
        if (h.length > 5) h.shift()
        if (h.length < 3) return
        const freq = median(h)
        const exact = freqToMidi(freq)
        const midi = Math.round(exact)
        const cents = Math.round((exact - midi) * 100)
        // Corde la plus proche en accordage standard
        let string = 0
        let best = Infinity
        openRef.current.forEach((m, i) => {
          const d = Math.abs(exact - m)
          if (d < best) { best = d; string = i }
        })
        const stringCents = Math.round((exact - openRef.current[string]) * 100)
        setReading({ freq, midi, cents, string, stringCents })
      }
      rafRef.current = requestAnimationFrame(loop)
    } catch (e) {
      setError(
        e?.name === 'NotAllowedError'
          ? "Le micro est refusé ou indisponible ici. Autorisez-le pour ce site dans le navigateur (en HTTPS). En attendant, les notes de référence ci-dessous fonctionnent sans micro."
          : "Impossible d'ouvrir le micro : " + (e?.message || e),
      )
    }
  }

  // Si on est à plus d'un demi-ton de la corde visée, on affiche l'écart de la note la plus proche
  const target = reading && Math.abs(reading.stringCents) <= 100 ? reading.stringCents : reading?.cents
  const clamped = Math.max(-50, Math.min(50, target ?? 0))
  const inTune = reading && Math.abs(target) <= 5
  useEffect(() => {
    if (inTune && !tunedLogged.current) {
      tunedLogged.current = true
      logActivity('tune')
    }
  }, [inTune, logActivity])
  const noteIdx = reading ? ((reading.midi % 12) + 12) % 12 : 0

  return (
    <div className="tuner">
      <div className="chips tuning-chips">
        {TUNING_IDS.map((id) => (
          <button key={id} className={`chip${tuningId === id ? ' on' : ''}`} onClick={() => update({ tuning: id })}>
            {TUNINGS[id].name}
          </button>
        ))}
      </div>
      {tuningId !== 'standard' && <p className="muted small tuning-desc">{TUNINGS[tuningId].desc}</p>}
      <div className={`tuner-dial${inTune ? ' in-tune' : ''}`}>
        <div className="tuner-note">
          {reading ? (
            <>
              <span className="tuner-note-main">{MAIN[noteIdx]}</span>
              <span className="tuner-note-sub">{SUB[noteIdx]} · {reading.freq.toFixed(1)} Hz</span>
            </>
          ) : (
            <span className="tuner-note-sub">{listening ? 'Jouez une corde…' : 'Accordeur au micro'}</span>
          )}
        </div>
        <div className="tuner-scale">
          {[-50, -25, 0, 25, 50].map((v) => (
            <span key={v} style={{ left: `${50 + v}%` }} className={v === 0 ? 'zero' : ''} />
          ))}
          <div className="tuner-needle" style={{ left: `${50 + clamped}%`, opacity: reading ? 1 : 0.25 }} />
        </div>
        <div className="tuner-hint">
          {!reading
            ? ' '
            : inTune
              ? '✓ Juste'
              : target < 0
                ? `Trop bas de ${-target} cents : resserrez`
                : `Trop haut de ${target} cents : détendez`}
        </div>
        {reading && Math.abs(reading.stringCents) <= 100 && (
          <div className="tuner-string">Corde {6 - reading.string} · {MAIN[OPEN[reading.string] % 12]}</div>
        )}
      </div>

      {listening ? (
        <button className="btn" onClick={stop}>Arrêter le micro</button>
      ) : (
        <button className="btn btn-primary" onClick={start}>🎤 Démarrer l’accordeur</button>
      )}
      {error && <p className="error">{error}</p>}

      <h3 className="section-title">Notes de référence</h3>
      <p className="muted small">Pas de micro ? Accordez à l’oreille : touchez une corde pour l’entendre.</p>
      <div className="ref-strings">
        {OPEN.map((m, i) => (
          <button
            key={i}
            className={`ref-string${reading && reading.string === i && Math.abs(reading.stringCents) <= 100 ? ' active' : ''}`}
            onClick={() => playNote(m, i)}
          >
            <strong>{MAIN[m % 12]}</strong>
            <span>{6 - i}</span>
            <small>{midiToFreq(m).toFixed(0)} Hz</small>
          </button>
        ))}
      </div>
    </div>
  )
}
