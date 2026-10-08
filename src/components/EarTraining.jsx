import { useState } from 'react'
import { CHORDS, getChord } from '../data/chords.js'
import { strum, pluck, midiToFreq, OPEN_MIDI } from '../lib/audio.js'
import { useProgress } from '../lib/progress.jsx'
import { useSettings } from '../lib/settings.jsx'

const MAJ_MIN = CHORDS.filter((c) => (c.type === 'majeur' || c.type === 'mineur') && c.level === 1)
const LEVELS = [
  ['majmin', 'Majeur ou mineur ?'],
  ['accords', 'Quel accord ?'],
]

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)]
const shuffle = (arr) => [...arr].sort(() => Math.random() - 0.5)

// Jeu d'oreille : l'appli joue, vous reconnaissez
export default function EarTraining({ knownChords }) {
  const { label } = useSettings()
  const { recordBest, bests, logActivity } = useProgress()
  const [level, setLevel] = useState('majmin')
  const [q, setQ] = useState(null) // { chord, options, answer }
  const [picked, setPicked] = useState(null)
  const [score, setScore] = useState({ ok: 0, total: 0, streak: 0 })
  const [record, setRecord] = useState(false)

  const pool = (() => {
    const known = (knownChords || []).map(getChord).filter(Boolean)
    return known.length >= 4 ? known : CHORDS.filter((c) => c.level === 1)
  })()

  const play = (chord, arpeggio = false) => {
    if (arpeggio) {
      let k = 0
      chord.frets.forEach((f, s) => {
        if (f >= 0) pluck(midiToFreq(OPEN_MIDI[s] + f), 0.05 + k++ * 0.28, 0.32, s)
      })
    } else strum(chord.frets, { spacing: 0.03 })
  }

  const next = (lv = level) => {
    setPicked(null)
    setRecord(false)
    let item
    if (lv === 'majmin') {
      const chord = pick(MAJ_MIN)
      item = { chord, options: ['majeur', 'mineur'], answer: chord.type }
    } else {
      const chord = pick(pool)
      const others = shuffle(pool.filter((c) => c.id !== chord.id)).slice(0, 3)
      item = { chord, options: shuffle([chord, ...others]).map((c) => c.id), answer: chord.id }
    }
    setQ(item)
    play(item.chord)
  }

  const answer = (opt) => {
    if (picked) return
    setPicked(opt)
    const good = opt === q.answer
    const streak = good ? score.streak + 1 : 0
    setScore((s) => ({ ok: s.ok + (good ? 1 : 0), total: s.total + 1, streak }))
    if (good && recordBest(`ear:${level}`, streak)) setRecord(true)
    logActivity('ear', level, good ? 1 : 0)
  }

  const changeLevel = (lv) => {
    setLevel(lv)
    setScore({ ok: 0, total: 0, streak: 0 })
    setQ(null)
    setPicked(null)
  }

  return (
    <div className="ear">
      <div className="chips">
        {LEVELS.map(([id, name]) => (
          <button key={id} className={`chip${level === id ? ' on' : ''}`} onClick={() => changeLevel(id)}>{name}</button>
        ))}
      </div>
      <p className="muted">
        {level === 'majmin'
          ? 'Un accord majeur sonne lumineux, un mineur plus sombre ou mélancolique. Écoutez et choisissez.'
          : `L’appli joue un accord parmi ceux que vous connaissez (${pool.map((c) => label(c.id)).join(', ')}). Lequel ?`}
      </p>

      <div className="ear-stats">
        <span>Score <strong>{score.ok}/{score.total}</strong></span>
        <span>Série <strong>{score.streak}</strong></span>
        <span>Record <strong>{bests[`ear:${level}`] || 0}</strong></span>
      </div>

      {!q ? (
        <button className="btn btn-primary btn-big" onClick={() => next()}>▶ Écouter le premier accord</button>
      ) : (
        <>
          <div className="row center gap wrap">
            <button className="btn" onClick={() => play(q.chord)}>↻ Réécouter</button>
            <button className="btn btn-ghost" onClick={() => play(q.chord, true)}>Note par note</button>
          </div>
          <div className={`ear-options n${q.options.length}`}>
            {q.options.map((opt) => {
              const state = picked ? (opt === q.answer ? ' good' : opt === picked ? ' bad' : '') : ''
              return (
                <button key={opt} className={`ear-option${state}`} onClick={() => answer(opt)}>
                  {level === 'majmin' ? (opt === 'majeur' ? 'Majeur' : 'Mineur') : label(opt)}
                </button>
              )
            })}
          </div>
          {picked && (
            <div className="center-col">
              <p className={picked === q.answer ? 'good-text' : 'bad-text'}>
                {picked === q.answer ? '✓ Bien entendu !' : `C’était ${label(q.chord.id)} (${q.chord.fr}).`}
                {record && ' 🏆 Nouveau record de série !'}
              </p>
              <button className="btn btn-primary" onClick={() => next()}>Accord suivant →</button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
