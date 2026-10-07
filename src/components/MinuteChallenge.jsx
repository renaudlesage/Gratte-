import { useCallback, useEffect, useRef, useState } from 'react'
import { getChord, SUGGESTED_PAIRS } from '../data/chords.js'
import { useProgress, pairKey } from '../lib/progress.jsx'
import { getCtx, click, strum } from '../lib/audio.js'
import ChordDiagram from './ChordDiagram.jsx'
import ChordSelect from './ChordSelect.jsx'

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
    const c = getCtx()
    click(c.currentTime + 0.01, true)
    click(c.currentTime + 0.15, true)
    setPhase('done')
    setRecord(recordChallenge(a, b, countRef.current))
  }, [a, b, recordChallenge])

  const start = () => {
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

  return (
    <div className="challenge">
      <p className="muted">
        Enchaînez les deux accords pendant 60 secondes et touchez le gros bouton (ou la barre d’espace) à chaque changement propre. C’est l’exercice le plus efficace pour progresser vite.
      </p>

      {phase === 'idle' || phase === 'done' ? (
        <>
          <div className="row gap">
            <ChordSelect label="Accord 1" value={a} onChange={setA} />
            <ChordSelect label="Accord 2" value={b} onChange={setB} />
          </div>
          <div className="chips">
            {SUGGESTED_PAIRS.map(([x, y]) => (
              <button key={x + y} className={`chip${pairKey(x, y) === pairKey(a, b) ? ' on' : ''}`} onClick={() => { setA(x); setB(y) }}>
                {x} ↔ {y}
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
          <button className="btn btn-primary btn-big" onClick={start} disabled={a === b}>Lancer le défi</button>
        </div>
      )}

      {phase === 'countdown' && <div className="countdown">{left}</div>}

      {phase === 'running' && (
        <div className="center-col">
          <div className="timer">{left}s</div>
          <button className="tap-zone" onClick={inc}>
            <strong>{count}</strong>
            <span>Touchez à chaque changement</span>
          </button>
          <button className="btn btn-ghost small" onClick={cancel}>Annuler</button>
        </div>
      )}

      {phase === 'done' && (
        <div className="result">
          <div className="result-num">{count}</div>
          <div>changements en 1 minute</div>
          {record ? <p className="record">🏆 Nouveau record !</p> : best > 0 && <p className="muted">Record : {best}</p>}
          <p className="muted small">
            {count < 20 ? 'Ralentissez et visez la propreté : la vitesse viendra toute seule.' : count < 40 ? 'Bien ! Refaites le défi demain, le cerveau consolide pendant la nuit.' : 'Excellent, ce changement est presque automatique. Passez à une autre paire.'}
          </p>
          <button className="btn btn-primary" onClick={start}>Recommencer</button>
        </div>
      )}
    </div>
  )
}
