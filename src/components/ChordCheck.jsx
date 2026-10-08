import { useRef, useState } from 'react'
import { checkTarget } from '../lib/chordDetect.js'
import { useChordListener, PLAYING_RMS } from '../lib/useChordListener.js'
import { STRING_NAMES, OPEN_MIDI } from '../lib/audio.js'
import { useSettings } from '../lib/settings.jsx'
import { useProgress } from '../lib/progress.jsx'

// Panneau « Vérifier mon accord » : écoute, reconnaît et explique ce qui ne sonne pas
export default function ChordCheck({ chord, compact = false }) {
  const { label, note } = useSettings()
  const { logActivity } = useProgress()
  const [result, setResult] = useState(null)
  const [chroma, setChroma] = useState(null)
  const hist = useRef([])
  const okSince = useRef(0)

  const { listening, error, start, stop } = useChordListener(({ analysis, rms }) => {
    if (rms < PLAYING_RMS || analysis.energy === 0) {
      hist.current = []
      setResult((r) => (r && r.status === 'ok' ? r : { status: 'silence' }))
      return
    }
    setChroma(Array.from(analysis.chroma))
    const r = checkTarget(analysis, chord)
    // On lisse sur 3 analyses pour éviter le clignotement
    hist.current = [...hist.current, r].slice(-3)
    const okCount = hist.current.filter((x) => x.status === 'ok').length
    const shown = okCount >= 2 ? hist.current.find((x) => x.status === 'ok') : r
    setResult(shown)
    if (shown.status === 'ok' && !okSince.current) {
      okSince.current = Date.now()
      logActivity('check', chord.id)
    }
    if (shown.status !== 'ok') okSince.current = 0
  })

  const toggle = async () => {
    if (listening) {
      stop()
      setResult(null)
      setChroma(null)
    } else {
      setResult({ status: 'silence' })
      await start()
    }
  }

  const open = chord.open || OPEN_MIDI
  const tones = new Set(chord.frets.map((f, s) => (f < 0 ? null : ((open[s] + f) % 12))).filter((x) => x !== null))

  return (
    <div className={`check${compact ? ' compact' : ''}`}>
      <button className={`btn ${listening ? '' : 'btn-primary'}`} onClick={toggle}>
        {listening ? '■ Arrêter l’écoute' : `🎤 Vérifier mon ${label(chord.id)}`}
      </button>
      {error && <p className="error small">{error}</p>}
      {listening && result && (
        <div className={`check-result s-${result.status}`} aria-live="polite">
          {result.status === 'silence' && <strong>Grattez l’accord, je vous écoute…</strong>}
          {result.status === 'ok' && (
            <strong>
              ✓ {label(chord.id)} reconnu
              {result.silent.length ? ' (presque !)' : ''}
            </strong>
          )}
          {result.status === 'close' && <strong>Presque : il manque de la netteté</strong>}
          {result.status === 'other' && (
            <strong>J’entends plutôt {label(result.best.id)}</strong>
          )}
          {result.status !== 'silence' && result.silent.length > 0 && (
            <span>
              {result.silent.length === 1 ? 'Cette corde semble ne pas sonner : ' : 'Ces cordes semblent ne pas sonner : '}
              {result.silent.map((s) => `${STRING_NAMES[s]} (${6 - s})`).join(', ')}. Cambrez le doigt voisin ou appuyez plus près de la frette.
            </span>
          )}
          {result.status !== 'silence' && result.status !== 'ok' && result.foreign.length > 0 && (
            <span>Note étrangère : {result.foreign.map(note).join(', ')}. Un doigt est peut-être sur la mauvaise case.</span>
          )}
        </div>
      )}
      {listening && chroma && !compact && (
        <div className="chroma" aria-hidden>
          {chroma.map((v, pc) => (
            <div key={pc} className={`chroma-col${tones.has(pc) ? ' tone' : ''}`}>
              <span style={{ height: `${Math.round(Math.max(0, v) * 100)}%` }} />
              <small>{note(pc)}</small>
            </div>
          ))}
        </div>
      )}
      {!compact && !listening && (
        <p className="muted small">
          Fonctionne mieux dans une pièce calme, guitare accordée, téléphone à environ 50 cm.
        </p>
      )}
    </div>
  )
}
