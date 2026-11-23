import { useCallback, useEffect, useRef, useState } from 'react'
import { getChord, SUGGESTED_PAIRS } from '../data/chords.js'
import { useProgress, pairKey } from '../lib/progress.jsx'
import { getCtx, click, strum } from '../lib/audio.js'
import ChordDiagram from './ChordDiagram.jsx'
import ChordSelect from './ChordSelect.jsx'
import { pickBetween, diagnose } from '../lib/chordDetect.js'
import { STRING_NAMES } from '../lib/audio.js'
import { useChordListener, PLAYING_RMS } from '../lib/useChordListener.js'
import { useSettings } from '../lib/settings.jsx'

const DURATION = 60

export default function MinuteChallenge({ params = {} }) {
  const [a, setA] = useState(params.pair?.[0] || 'Em')
  const [b, setB] = useState(params.pair?.[1] || 'Am')
  const [phase, setPhase] = useState('idle') // idle | countdown | running | done
  const [left, setLeft] = useState(DURATION)
  const [count, setCount] = useState(0)
  const [record, setRecord] = useState(false)
  const timer = useRef(null)
  const countRef = useRef(0)
  const { bests, recordChallenge } = useProgress()
  const { label } = useSettings()
  const [autoMic, setAutoMic] = useState(false)
  const [selfCount, setSelfCount] = useState(false) // compter à voix haute, saisir le total à la fin
  const [typed, setTyped] = useState('')
  const quality = useRef({}) // accord → { n, dirty, strings: { corde: fois } }
  const [heard, setHeard] = useState(null)
  const phaseRef = useRef(phase)
  phaseRef.current = phase
  const det = useRef({ last: null, cand: null, n: 0 })
  const mic = useChordListener(({ analysis, rms }) => {
    if (rms < PLAYING_RMS) return
    const id = pickBetween(analysis, getChord(a), getChord(b))
    if (!id) return
    const d = det.current
    if (id === d.cand) d.n++
    else {
      d.cand = id
      d.n = 1
    }
    // Accord stable sur 2 analyses (≈ 0,2 s) : s'il diffère du précédent, c'est un changement
    if (d.n === 2) {
      setHeard(id)
      if (phaseRef.current === 'running' && d.last && d.last !== id) {
        countRef.current += 1
        setCount(countRef.current)
        // Netteté de l'accord atteint : cordes qui ne sonnent pas
        const { silent } = diagnose(analysis, getChord(id))
        const q = (quality.current[id] ||= { n: 0, dirty: 0, strings: {} })
        q.n++
        if (silent.length) q.dirty++
        for (const st of silent) q.strings[st] = (q.strings[st] || 0) + 1
      }
      d.last = id
    }
  })

  useEffect(() => {
    if (params.pair) {
      setA(params.pair[0])
      setB(params.pair[1])
    }
  }, [params.pair])

  useEffect(() => () => clearInterval(timer.current), [])

  const best = bests[pairKey(a, b)] || 0

  const finish = useCallback(() => {
    clearInterval(timer.current)
    mic.stop()
    const c = getCtx()
    click(c.currentTime + 0.01, true)
    click(c.currentTime + 0.15, true)
    if (selfCountRef.current) {
      setTyped('')
      setPhase('enter')
      return
    }
    setPhase('done')
    setRecord(recordChallenge(a, b, countRef.current))
  }, [a, b, recordChallenge, mic.stop])

  const selfCountRef = useRef(false)
  selfCountRef.current = selfCount && !autoMic
  const submitTyped = (e) => {
    e.preventDefault()
    const n = Math.max(0, Math.min(200, parseInt(typed, 10) || 0))
    countRef.current = n
    setCount(n)
    setPhase('done')
    setRecord(recordChallenge(a, b, n))
  }

  const start = async (useMic = autoMic) => {
    if (useMic && !mic.listening) {
      const ok = await mic.start()
      if (!ok) return
    }
    det.current = { last: null, cand: null, n: 0 }
    quality.current = {}
    setHeard(null)
    countRef.current = 0
    setCount(0)
    setRecord(false)
    setPhase('countdown')
    let n = 3
    setLeft(n)
    const c = getCtx()
    click(c.currentTime + 0.01)
    timer.current = setInterval(() => {
      n--
      if (n > 0) {
        setLeft(n)
        click(getCtx().currentTime + 0.01)
      } else {
        clearInterval(timer.current)
        click(getCtx().currentTime + 0.01, true)
        setPhase('running')
        const end = Date.now() + DURATION * 1000
        setLeft(DURATION)
        timer.current = setInterval(() => {
          const s = Math.max(0, Math.ceil((end - Date.now()) / 1000))
          setLeft(s)
          if (s === 0) finish()
        }, 200)
      }
    }, 1000)
  }

  const cancel = () => {
    clearInterval(timer.current)
    mic.stop()
    setPhase('idle')
  }

  const inc = useCallback(() => {
    countRef.current += 1
    setCount(countRef.current)
  }, [])

  useEffect(() => {
    if (phase !== 'running') return
    const onKey = (e) => {
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault()
        inc()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [phase, inc])

  const ca = getChord(a)
  const cb = getChord(b)
  const showB = phase === 'running' && count % 2 === 1
  // Micro indisponible avec le comptage automatique : on propose de continuer au doigt
  const micFailed = mic.error && autoMic && (
    <div className="center-col">
      <p className="error small center" role="alert">{mic.error}</p>
      <button className="btn small" onClick={() => { setAutoMic(false); start(false) }} disabled={a === b}>Lancer sans micro</button>
    </div>
  )

  return (
    <div className="challenge">
      {(phase === 'idle' || phase === 'done') && (
        <p className="muted">
          Enchaînez les deux accords pendant 60 secondes et touchez le gros bouton (ou la barre d’espace) à chaque changement propre. C’est l’exercice le plus efficace pour progresser vite.
        </p>
      )}

      {phase === 'idle' || phase === 'done' ? (
        <>
          <div className="row gap">
            <ChordSelect label="Accord 1" value={a} onChange={setA} />
            <ChordSelect label="Accord 2" value={b} onChange={setB} />
          </div>
          <div className="chips">
            {SUGGESTED_PAIRS.map(([x, y]) => (
              <button key={x + y} className={`chip${pairKey(x, y) === pairKey(a, b) ? ' on' : ''}`} onClick={() => { setA(x); setB(y) }}>
                {label(x)} ↔ {label(y)}
              </button>
            ))}
          </div>
        </>
      ) : null}

      <div className="pair">
        <button className={`pair-chord${!showB ? ' on' : ''}`} onClick={() => strum(ca.frets)} disabled={phase === 'running'}>
          <ChordDiagram chord={ca} size={130} />
        </button>
        <span className="pair-arrow">↔</span>
        <button className={`pair-chord${showB ? ' on' : ''}`} onClick={() => strum(cb.frets)} disabled={phase === 'running'}>
          <ChordDiagram chord={cb} size={130} />
        </button>
      </div>

      {phase === 'idle' && (
        <div className="center-col">
          <p className="muted">Record sur cette paire : <strong>{best || '—'}</strong></p>
          <label className="field-inline">
            <input type="checkbox" checked={autoMic} onChange={(e) => setAutoMic(e.target.checked)} />
            Comptage automatique au micro
          </label>
          {!autoMic && (
            <label className="field-inline">
              <input type="checkbox" checked={selfCount} onChange={(e) => setSelfCount(e.target.checked)} />
              Compter à voix haute, saisir le total à la fin (sans lâcher la guitare)
            </label>
          )}
          {micFailed}
          <button className="btn btn-primary btn-big" onClick={() => start()} disabled={a === b}>Lancer le défi</button>
        </div>
      )}

      {phase === 'countdown' && <div className="countdown">{left}</div>}

      {phase === 'running' && (
        <div className="center-col">
          <div className="timer">{left}s</div>
          <button className="tap-zone" onClick={inc}>
            <strong>{count}</strong>
            <span>{mic.listening ? `🎤 J’entends : ${heard ? label(heard) : '…'}` : selfCountRef.current ? 'Comptez à voix haute : un changement propre = un de plus' : 'Touchez à chaque changement'}</span>
          </button>
          <button className="btn btn-ghost small" onClick={cancel}>Annuler</button>
        </div>
      )}

      {phase === 'enter' && (
        <form className="center-col" onSubmit={submitTyped}>
          <label htmlFor="mc-total"><strong>Combien de changements propres ?</strong></label>
          <input id="mc-total" type="number" inputMode="numeric" min="0" max="200" value={typed} onChange={(e) => setTyped(e.target.value)} autoFocus className="big-number" />
          <button className="btn btn-primary btn-big" type="submit">Enregistrer</button>
        </form>
      )}

      {phase === 'done' && (
        <div className="result">
          <div className="result-num">{count}</div>
          <div>changements en 1 minute</div>
          {record ? <p className="record">🏆 Nouveau record !</p> : best > 0 && <p className="muted">Record : {best}</p>}
          <p className="muted small">
            {count < 20 ? 'Ralentissez et visez la propreté : la vitesse viendra toute seule.' : count < 40 ? 'Bien ! Refaites le défi demain, le cerveau consolide pendant la nuit.' : 'Excellent, ce changement est presque automatique. Passez à une autre paire.'}
          </p>
          <Quality q={quality.current} label={label} />
          {micFailed}
          <button className="btn btn-primary" onClick={() => start()}>Recommencer</button>
        </div>
      )}
    </div>
  )
}

// Bilan du comptage au micro : changements nets ou approximatifs, et la corde qui pose problème
function Quality({ q, label }) {
  const ids = Object.keys(q)
  if (!ids.length) return null
  const n = ids.reduce((s, id) => s + q[id].n, 0)
  const dirty = ids.reduce((s, id) => s + q[id].dirty, 0)
  const worst = ids
    .flatMap((id) => Object.entries(q[id].strings).map(([st, k]) => ({ id, st: +st, k })))
    .sort((x, y) => y.k - x.k)[0]
  return (
    <div className="quality">
      <p className="small">
        <strong>{n - dirty}</strong> changement{n - dirty > 1 ? 's' : ''} net{n - dirty > 1 ? 's' : ''} · <strong>{dirty}</strong> approximatif{dirty > 1 ? 's' : ''}
      </p>
      {worst && worst.k >= 2 && (
        <p className="muted small">
          {label(worst.id)} arrive souvent incomplet : corde de {STRING_NAMES[worst.st]} ({6 - worst.st}) muette {worst.k} fois. Vérifiez-le au calme avec « Vérifier mon accord ».
        </p>
      )}
    </div>
  )
}
