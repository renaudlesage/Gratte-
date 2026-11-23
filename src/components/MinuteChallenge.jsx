import { useCallback, useEffect, useRef, useState } from 'react'
import { getChord, SUGGESTED_PAIRS } from '../data/chords.js'
import { useProgress, pairKey } from '../lib/progress.jsx'
import { getCtx, click, strum } from '../lib/audio.js'
import ChordDiagram from './ChordDiagram.jsx'
import Stuck from './Stuck.jsx'
import ChordSelect from './ChordSelect.jsx'
import { pickBetween, diagnose } from '../lib/chordDetect.js'
import { STRING_NAMES } from '../lib/audio.js'
import { useChordListener, PLAYING_RMS } from '../lib/useChordListener.js'
import { useSettings } from '../lib/settings.jsx'
import { useAddress } from '../lib/address.js'

const DURATION = 60
const frDate = (d) => new Date(d + 'T12:00:00').toLocaleDateString('fr-BE', { day: 'numeric', month: 'short' })

// Trois pronostics proches du record (ou des repères pour un premier essai)
const predictions = (best) => (best > 0 ? [...new Set([Math.max(0, best - 3), best, best + 3])] : [5, 10, 15])

export default function MinuteChallenge({ params = {} }) {
  const [a, setA] = useState(params.pair?.[0] || 'Em')
  const [b, setB] = useState(params.pair?.[1] || 'Am')
  const [phase, setPhase] = useState('idle') // idle | countdown | running | done
  const [left, setLeft] = useState(DURATION)
  const [count, setCount] = useState(0)
  const [record, setRecord] = useState(false)
  const timer = useRef(null)
  const countRef = useRef(0)
  const { bests, history, recordChallenge } = useProgress()
  const { label } = useSettings()
  const t = useAddress()
  // Calibration : pronostic en un toucher avant le défi, comparé au résultat
  const [pred, setPred] = useState(null)
  const predRef = useRef(null)
  predRef.current = pred
  const [shownPred, setShownPred] = useState(null)
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
    setShownPred(predRef.current)
    setRecord(recordChallenge(a, b, countRef.current, predRef.current))
    setPred(null)
  }, [a, b, recordChallenge, mic.stop])

  const selfCountRef = useRef(false)
  selfCountRef.current = selfCount && !autoMic
  const submitTyped = (e) => {
    e.preventDefault()
    const n = Math.max(0, Math.min(200, parseInt(typed, 10) || 0))
    countRef.current = n
    setCount(n)
    setPhase('done')
    setShownPred(predRef.current)
    setRecord(recordChallenge(a, b, n, predRef.current))
    setPred(null)
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
    setShownPred(null)
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
          <Predict best={best} pred={pred} setPred={setPred} t={t} />
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

      <p className="visually-hidden" aria-live="polite">
        {phase === 'done' ? `${count} changements en 1 minute.${shownPred !== null ? ` Pronostic : ${shownPred}.` : ''}${record ? ' Nouveau record.' : ''}` : ''}
      </p>

      {phase === 'done' && (
        <div className="result">
          <div className="result-num">{count}</div>
          <div>changements en 1 minute</div>
          {record ? <p className="record">🏆 Nouveau record !</p> : best > 0 && <p className="muted">Record : {best}</p>}
          <Calibration pred={shownPred} count={count} history={history} t={t} />
          <ThenNow pairHistory={history.filter((h) => h.pair === pairKey(a, b))} count={count} t={t} />
          {!(shownPred !== null && count < shownPred - 2) && <p className="muted small">
            {count < 20 ? 'Ralentissez et visez la propreté : la vitesse viendra toute seule.' : count < 40 ? 'Bien ! Refaites le défi demain, le cerveau consolide pendant la nuit.' : 'Excellent, ce changement est presque automatique. Passez à une autre paire.'}
          </p>}
          <Quality q={quality.current} label={label} />
          <Predict best={best} pred={pred} setPred={setPred} t={t} again />
          {micFailed}
          <button className="btn btn-primary" onClick={() => start()}>Recommencer</button>
        </div>
      )}
      {(phase === 'idle' || phase === 'done') && <Stuck context={{ chords: [a, b] }} />}
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

// Pronostic avant le défi : un toucher (facultatif), retoucher pour annuler
function Predict({ best, pred, setPred, t, again = false }) {
  return (
    <div className="predict" role="group" aria-labelledby="predict-q">
      <p className="small" id="predict-q">
        <strong>{t('Votre pronostic', 'Ton pronostic')}{again ? ' pour le prochain essai' : ''} ?</strong>{' '}
        <span className="muted">{t('Combien de changements propres pensez-vous faire ?', 'Combien de changements propres penses-tu faire ?')}</span>
      </p>
      <div className="srl-row">
        {predictions(best).map((v) => (
          <button key={v} type="button" className="srl-opt" aria-pressed={pred === v} onClick={() => setPred(pred === v ? null : v)}>
            {v}
          </button>
        ))}
      </div>
    </div>
  )
}

// Pronostic contre résultat : nommer l'écart, sans jugement, et en tirer quoi faire
function Calibration({ pred, count, history, t }) {
  if (pred === null || pred === undefined) return null
  const diff = count - pred
  const recent = history.filter((h) => Number.isFinite(h.pred)).slice(-5)
  const over = recent.filter((h) => h.pred - h.count > 2).length
  const under = recent.filter((h) => h.count - h.pred > 2).length
  let msg
  if (Math.abs(diff) <= 2) msg = t('Pronostic juste : vous savez où vous en êtes. C’est ce qui permet de doser le travail au bon endroit.', 'Pronostic juste : tu sais où tu en es. C’est ce qui permet de doser le travail au bon endroit.')
  else if (diff > 0) msg = t(`${diff} de plus que prévu : vous en savez plus que vous ne le pensiez. Osez un pronostic plus haut la prochaine fois.`, `${diff} de plus que prévu : tu en sais plus que tu ne le pensais. Ose un pronostic plus haut la prochaine fois.`)
  else msg = t(`${-diff} de moins que prévu. Courant : un changement qui paraît acquis l’est moins sous chrono. Ralentissez et visez la propreté plutôt que la vitesse.`, `${-diff} de moins que prévu. Courant : un changement qui paraît acquis l’est moins sous chrono. Ralentis et vise la propreté plutôt que la vitesse.`)
  const trend =
    recent.length >= 3 && over >= 3
      ? t(`Vos ${recent.length} derniers pronostics : ${over} au-dessus du résultat. Le défi lui-même est le meilleur test : fiez-vous au chiffre.`, `Tes ${recent.length} derniers pronostics : ${over} au-dessus du résultat. Le défi lui-même est le meilleur test : fie-toi au chiffre.`)
      : recent.length >= 3 && under >= 3
        ? t(`Vos ${recent.length} derniers pronostics : ${under} en dessous du résultat. Vous vous sous-estimez régulièrement.`, `Tes ${recent.length} derniers pronostics : ${under} en dessous du résultat. Tu te sous-estimes régulièrement.`)
        : null
  return (
    <div className="calib">
      <div className="calib-nums">
        <span><strong>{pred}</strong>pronostic</span>
        <span><strong>{count}</strong>réel</span>
      </div>
      <p className="small">{msg}</p>
      {trend && <p className="small muted">{trend}</p>}
    </div>
  )
}

// Preuve de progrès sur cette paire : premier essai contre aujourd'hui, attribuée à la répétition
function ThenNow({ pairHistory, count, t }) {
  if (pairHistory.length < 2) return null
  const first = pairHistory[0]
  const n = pairHistory.length
  if (count < first.count + 3) return null
  return (
    <p className="small then-now">
      {t('Premier essai sur cette paire', 'Premier essai sur cette paire')} ({frDate(first.date)}) : <strong>{first.count}</strong>. {t('Aujourd’hui', 'Aujourd’hui')} : <strong>{count}</strong>, {t(`après ${n} défis. C’est la répétition qui a fait cette différence.`, `après ${n} défis. C’est ta répétition qui a fait cette différence.`)}
    </p>
  )
}
