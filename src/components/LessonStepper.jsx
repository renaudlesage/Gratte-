import { useCallback, useEffect, useRef, useState } from 'react'
import './stepper.css'
import { getChord } from '../data/chords.js'
import { chordText } from '../lib/chordText.js'
import { useSettings } from '../lib/settings.jsx'
import { useVoiceCommands, voiceSupported } from '../lib/voice.js'
import { strum } from '../lib/audio.js'
import ChordDiagram from './ChordDiagram.jsx'

// Mode « pas à pas, mains libres » : une étape à la fois, en grand, lue à voix haute.
// On avance au gros bouton, au clavier (flèches, espace) ou à la voix (« suivant », « précédent », « répète »).
const canSpeak = () => typeof window !== 'undefined' && 'speechSynthesis' in window

// À l'oral, « Em » se dit « Mi mineur »
const spoken = (s) => chordText(s, (c) => getChord(c)?.fr?.replace(/\s*\(.*\)/, '') || c)

function speak(text, onEnd) {
  if (!canSpeak()) return onEnd?.()
  const synth = window.speechSynthesis
  synth.cancel()
  const u = new SpeechSynthesisUtterance(text)
  u.lang = 'fr-FR'
  u.rate = 0.95
  const fr = synth.getVoices().find((v) => v.lang?.toLowerCase().startsWith('fr'))
  if (fr) u.voice = fr
  u.onend = () => onEnd?.()
  u.onerror = () => onEnd?.()
  synth.speak(u)
}

export default function LessonStepper({ lesson, onClose }) {
  const { label } = useSettings()
  const items = [lesson.intro, ...lesson.steps]
  const [i, setI] = useState(0)
  const [autoRead, setAutoRead] = useState(canSpeak())
  const [speaking, setSpeaking] = useState(false)
  const [voiceOn, setVoiceOn] = useState(false)
  const box = useRef(null)
  const last = items.length - 1

  const read = useCallback(
    (k = i) => {
      if (!canSpeak()) return
      setSpeaking(true)
      speak(`Étape ${k + 1} sur ${items.length}. ${spoken(items[k])}`, () => setSpeaking(false))
    },
    [i, items],
  )
  const stopSpeech = () => {
    if (canSpeak()) window.speechSynthesis.cancel()
    setSpeaking(false)
  }
  const go = (k) => setI(Math.max(0, Math.min(last, k)))

  // Lecture automatique à chaque nouvelle étape
  useEffect(() => {
    if (autoRead) read(i)
    box.current?.focus()
  }, [i]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => stopSpeech(), [])

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'ArrowRight' || (e.key === ' ' && e.target === box.current)) {
        e.preventDefault()
        go(i + 1)
      } else if (e.key === 'ArrowLeft') go(i - 1)
      else if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  // Commandes vocales, coupées pendant la lecture pour ne pas s'entendre soi-même
  const voice = useVoiceCommands(voiceOn && !speaking, (cmd) => {
    if (cmd.type === 'next') go(i + 1)
    else if (cmd.type === 'prev') go(i - 1)
    else if (cmd.type === 'bar-again' || cmd.type === 'play' || cmd.type === 'resume') read(i)
    else if (cmd.type === 'restart') go(0)
    else if (cmd.type === 'stop') stopSpeech()
    else if (cmd.type === 'stage') onClose()
  })

  const chords = lesson.chords.filter((c) => items[i].includes(`{${c}}`))

  return (
    <div className="stepper" role="region" aria-label={`Leçon pas à pas : ${lesson.title}`}>
      <div className="stepper-top">
        <span className="stepper-count">Étape {i + 1}/{items.length}</span>
        <button className="btn btn-ghost small" onClick={onClose}>✕ Quitter le pas à pas</button>
      </div>
      <div className="stepper-dots" aria-hidden="true">
        {items.map((_, k) => <span key={k} className={k === i ? 'on' : k < i ? 'past' : ''} />)}
      </div>
      <p className="stepper-text" ref={box} tabIndex={-1} aria-live="polite">{chordText(items[i], label)}</p>
      {chords.length > 0 && (
        <div className="stepper-chords">
          {chords.map((c) => (
            <button key={c} className="chord-mini" onClick={() => strum(getChord(c).frets)} aria-label={`Écouter ${label(c)}`}>
              <ChordDiagram chord={getChord(c)} size={110} />
            </button>
          ))}
        </div>
      )}
      <div className="stepper-nav">
        <button className="btn btn-big" onClick={() => go(i - 1)} disabled={i === 0} aria-label="Étape précédente">←</button>
        {canSpeak() && (
          <button className="btn btn-big" onClick={() => (speaking ? stopSpeech() : read(i))} aria-label={speaking ? 'Arrêter la lecture' : 'Lire l’étape à voix haute'}>
            {speaking ? '■' : '🔊'}
          </button>
        )}
        {i < last ? (
          <button className="btn btn-primary btn-big stepper-next" onClick={() => go(i + 1)}>Suivant →</button>
        ) : (
          <button className="btn btn-primary btn-big stepper-next" onClick={onClose}>Objectifs ✓</button>
        )}
      </div>
      <div className="stepper-options">
        {canSpeak() && (
          <label className="field-inline">
            <input type="checkbox" checked={autoRead} onChange={(e) => setAutoRead(e.target.checked)} />
            Lire chaque étape à voix haute
          </label>
        )}
        {voiceSupported() && (
          <label className="field-inline">
            <input type="checkbox" checked={voiceOn} onChange={(e) => setVoiceOn(e.target.checked)} />
            Commandes vocales : « suivant », « précédent », « répète »
          </label>
        )}
        {voiceOn && voice.error && <p className="error small" role="alert">{voice.error}</p>}
        {voiceOn && !voice.error && voice.heard && <p className="muted small">Entendu : « {voice.heard} »</p>}
      </div>
    </div>
  )
}
