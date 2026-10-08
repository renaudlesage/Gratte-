import { useEffect, useRef, useState } from 'react'
import { PATTERNS } from '../data/patterns.js'
import { getChord } from '../data/chords.js'
import { Clock, strum } from '../lib/audio.js'
import { useProgress } from '../lib/progress.jsx'
import { useSettings } from '../lib/settings.jsx'
import { useOnsets } from '../lib/useOnsets.js'
import { scoreRhythm } from '../lib/onset.js'
import BpmControl from './BpmControl.jsx'
import ChordSelect from './ChordSelect.jsx'

const COUNT_LABELS = ['1', 'et', '2', 'et', '3', 'et', '4', 'et']
const EVAL_BARS = 8
const slotName = (i) => (i % 2 === 0 ? `temps ${i / 2 + 1}` : `« et » du ${Math.floor(i / 2) + 1}`)

export default function Strumming({ params = {} }) {
  const [patternId, setPatternId] = useState(params.pattern || 'noires')
  const [chordId, setChordId] = useState(params.chord || 'Em')
  const [bpm, setBpm] = useState(params.bpm || 70)
  const [withGuitar, setWithGuitar] = useState(true)
  const [running, setRunning] = useState(false)
  const [slot, setSlot] = useState(-1)
  const [evalMode, setEvalMode] = useState(false)
  const [silentClick, setSilentClick] = useState(false)
  const [evalState, setEvalState] = useState({ phase: 'idle' }) // idle | countin | running | done
  const [marks, setMarks] = useState({}) // slot → écart (ms) du dernier coup
  const [calibrating, setCalibrating] = useState(false)
  const { markPracticed, logActivity, recordRhythm, recordBest, bests } = useProgress()
  const { rhythmLatency, update } = useSettings()
  const startedAt = useRef(0)
  const ev = useRef({ expected: [], onsets: [] })

  const pattern = PATTERNS.find((p) => p.id === patternId) || PATTERNS[0]
  const ref = useRef({})
  ref.current = { pattern, chordId, withGuitar: withGuitar && !evalMode, evalMode, latency: rhythmLatency ?? 0.05, bpm }

  const mic = useOnsets((times) => {
    const r = ref.current
    if (!r.evalMode) return
    const slotDur = 60 / r.bpm / 2
    for (const raw of times) {
      const t = raw - r.latency
      ev.current.onsets.push(t)
      const near = ev.current.expected.reduce((a, x) => (Math.abs(x.t - t) < Math.abs((a?.t ?? Infinity) - t) ? x : a), null)
      if (near && Math.abs(near.t - t) < slotDur / 2) setMarks((m) => ({ ...m, [near.slot]: Math.round((t - near.t) * 1000) }))
    }
  })

  const clockRef = useRef(null)
  if (!clockRef.current) {
    clockRef.current = new Clock({
      subdivision: 2,
      onSchedule: (e) => {
        const { pattern: p, chordId: cid, withGuitar: g, evalMode: em } = ref.current
        const i = e.tick % p.slots.length
        const s = p.slots[i]
        if (g && s) strum(getChord(cid).frets, { when: e.time, direction: s === 'U' ? 'up' : 'down', spacing: 0.012, gain: 0.15 })
        if (em) {
          const bar = Math.floor(e.tick / p.slots.length)
          if (s && bar >= 1 && bar <= EVAL_BARS) ev.current.expected.push({ t: e.time, slot: i, beatInBar: i })
        }
      },
      onTick: (e) => {
        const p = ref.current.pattern
        setSlot(e.tick % p.slots.length)
        if (ref.current.evalMode) {
          const bar = Math.floor(e.tick / p.slots.length)
          if (bar === 0) setEvalState((st) => (st.phase === 'countin' ? st : { phase: 'countin' }))
          else if (bar <= EVAL_BARS) setEvalState((st) => (st.phase === 'running' && st.bar === bar ? st : { phase: 'running', bar }))
          else finishEval()
        }
      },
    })
  }
  const clock = clockRef.current
  clock.bpm = bpm
  clock.beatsPerBar = pattern.beats
  clock.clickOn = !(evalMode && silentClick)

  useEffect(() => () => clock.stop(), [clock])

  useEffect(() => {
    if (params.pattern) setPatternId(params.pattern)
    if (params.chord) setChordId(params.chord)
    if (params.bpm) setBpm(params.bpm)
  }, [params.pattern, params.chord, params.bpm])

  function finishEval() {
    if (!clock.running) return
    clock.stop()
    mic.stop()
    setRunning(false)
    setSlot(-1)
    const r = ref.current
    const res = scoreRhythm(ev.current.expected, ev.current.onsets, 60 / r.bpm / 2)
    const record = recordBest(`rythme:${r.pattern.id}`, res.score)
    logActivity('rhythmscore', r.pattern.id, res.score)
    if (res.score >= 70) recordRhythm(r.pattern.id, r.bpm)
    setEvalState({ phase: 'done', res, record })
  }

  const stopAndLog = () => {
    clock.stop()
    mic.stop()
    setRunning(false)
    setSlot(-1)
    if (evalMode) setEvalState({ phase: 'idle' })
    if (!evalMode && Date.now() - startedAt.current > 20000) {
      recordRhythm(patternId, bpm)
      logActivity('rhythm', patternId, bpm)
    }
  }

  const toggle = async () => {
    if (clock.running) {
      stopAndLog()
      return
    }
    if (evalMode) {
      const ok = await mic.start()
      if (!ok) return
      ev.current = { expected: [], onsets: [] }
      setMarks({})
      setEvalState({ phase: 'countin' })
    }
    clock.start()
    startedAt.current = Date.now()
    setRunning(true)
    markPracticed()
  }

  const choosePattern = (id) => {
    if (clock.running) stopAndLog()
    setPatternId(id)
    setEvalState({ phase: 'idle' })
  }

  if (calibrating) return <Calibration onDone={(lat) => { if (lat !== null) update({ rhythmLatency: lat }); setCalibrating(false) }} />

  const res = evalState.res

  return (
    <div className="strum">
      <div className="chips">
        {PATTERNS.map((p) => (
          <button key={p.id} className={`chip${p.id === patternId ? ' on' : ''}`} onClick={() => choosePattern(p.id)}>
            {p.name}
          </button>
        ))}
      </div>
      <p className="muted">{pattern.tip}</p>

      <div className="strum-grid" style={{ gridTemplateColumns: `repeat(${pattern.slots.length}, 1fr)` }}>
        {pattern.slots.map((s, i) => {
          const m = marks[i]
          const markCls = m === undefined ? '' : Math.abs(m) <= 40 ? ' m-ok' : m < 0 ? ' m-early' : ' m-late'
          return (
            <div key={i} className={`strum-slot${i === slot ? ' on' : ''}${s ? '' : ' empty'}${i % 2 === 0 ? ' beat' : ''}${evalMode && s ? markCls : ''}`}>
              <span className="strum-arrow">{s === 'D' ? '↓' : s === 'U' ? '↑' : '·'}</span>
              <span className="strum-count">{evalMode && s && m !== undefined ? `${m > 0 ? '+' : ''}${m}` : COUNT_LABELS[i]}</span>
            </div>
          )
        })}
      </div>

      <div className="eval-box">
        <label className="field-inline">
          <input id="eval-mode" type="checkbox" checked={evalMode} disabled={running} onChange={(e) => { setEvalMode(e.target.checked); setEvalState({ phase: 'idle' }) }} />
          🎤 Évaluer mon rythme au micro
        </label>
        {evalMode && (
          <div className="eval-opts">
            <p className="muted small">
              Une mesure de décompte, puis {EVAL_BARS} mesures notées. Vert = dans le temps (±40 ms), bleu = en avance, rouge = en retard.
              {rhythmLatency === null || rhythmLatency === undefined ? ' Calibrez d’abord le micro (30 secondes) pour une mesure juste.' : ` Latence calibrée : ${Math.round(rhythmLatency * 1000)} ms.`}
            </p>
            <div className="row wrap gap">
              <button className="btn small" onClick={() => setCalibrating(true)} disabled={running}>Calibrer le micro</button>
              <label className="field-inline small">
                <input id="silent-click" type="checkbox" checked={silentClick} onChange={(e) => setSilentClick(e.target.checked)} />
                Clic visuel seulement
              </label>
            </div>
            <p className="muted small">Idéal avec des écouteurs : le micro n’entend alors que la guitare.</p>
          </div>
        )}
      </div>

      {evalMode && evalState.phase === 'countin' && <p className="eval-status">Décompte… préparez-vous</p>}
      {evalMode && evalState.phase === 'running' && <p className="eval-status">Mesure {evalState.bar}/{EVAL_BARS}</p>}
      {evalMode && evalState.phase === 'done' && res && (
        <div className="result eval-result">
          <div className="result-num">{res.score}%</div>
          <div>des coups dans le temps</div>
          {evalState.record && <p className="record">🏆 Meilleur score sur ce rythme !</p>}
          <p className="small">
            Régularité : écart type {res.sdMs} ms · tendance {res.meanMs > 0 ? `${res.meanMs} ms en retard` : res.meanMs < 0 ? `${-res.meanMs} ms en avance` : 'pile à l’heure'}
            {res.missed ? ` · ${res.missed} coup${res.missed > 1 ? 's' : ''} manqué${res.missed > 1 ? 's' : ''}` : ''}
          </p>
          <p className="muted small">
            {res.worst
              ? `Point à travailler : vous êtes ${res.worst.mean < 0 ? 'en avance' : 'en retard'} sur le ${slotName(res.worst.beat)} (${Math.round(Math.abs(res.worst.mean) * 1000)} ms). Comptez à voix haute.`
              : res.score >= 85
                ? 'Très régulier. Montez de 5 BPM.'
                : res.sdMs > 35
                  ? 'Les coups varient beaucoup : ralentissez et gardez le bras en mouvement constant.'
                  : 'Continuez à ce tempo jusqu’à dépasser 85 %.'}
          </p>
          <p className="muted small">Record sur ce rythme : {bests[`rythme:${pattern.id}`] || res.score}%</p>
        </div>
      )}
      {mic.error && <p className="error small">{mic.error}</p>}

      <BpmControl bpm={bpm} setBpm={setBpm} min={40} max={160} tap={false} />

      <div className="row wrap center gap">
        <ChordSelect id="strum-chord" label="Accord" value={chordId} onChange={setChordId} />
        <label className="field-inline">
          <input id="strum-model" type="checkbox" checked={withGuitar && !evalMode} disabled={evalMode} onChange={(e) => setWithGuitar(e.target.checked)} />
          Entendre le modèle
        </label>
      </div>

      <button className={`btn btn-big ${running ? '' : 'btn-primary'}`} onClick={toggle}>
        {running ? '■ Stop' : evalMode ? '🎤 Lancer l’évaluation' : '▶ Jouer le rythme'}
      </button>
      {!evalMode && <p className="muted small center">Astuce : écoutez d’abord le modèle, puis décochez « Entendre le modèle » et jouez seul avec le clic.</p>}
    </div>
  )
}

// Calibration : on mesure le délai entre le clic et le coup capté par le micro
function Calibration({ onDone }) {
  const [phase, setPhase] = useState('intro') // intro | run | result
  const [beat, setBeat] = useState(-1)
  const [result, setResult] = useState(null)
  const data = useRef({ expected: [], onsets: [] })
  const mic = useOnsets((times) => data.current.onsets.push(...times))
  const clockRef = useRef(null)
  if (!clockRef.current) {
    clockRef.current = new Clock({
      bpm: 80,
      beatsPerBar: 4,
      onSchedule: (e) => {
        if (e.beat >= 4 && e.beat < 16) data.current.expected.push(e.time)
      },
      onTick: (e) => {
        setBeat(e.beat)
        if (e.beat >= 17) finish()
      },
    })
  }
  const clock = clockRef.current
  useEffect(() => () => clock.stop(), [clock])

  function finish() {
    if (!clock.running) return
    clock.stop()
    mic.stop()
    const offs = data.current.expected
      .map((t) => {
        const o = data.current.onsets.filter((x) => x - t > -0.05 && x - t < 0.4)
        return o.length ? o[0] - t : null
      })
      .filter((x) => x !== null)
      .sort((a, b) => a - b)
    if (offs.length < 6) {
      setResult({ ok: false, msg: `Seulement ${offs.length} coups entendus sur 12. Rapprochez le téléphone ou frappez plus fort, puis recommencez.` })
    } else {
      const med = offs[Math.floor(offs.length / 2)]
      const spread = offs[Math.floor(offs.length * 0.8)] - offs[Math.floor(offs.length * 0.2)]
      setResult(spread > 0.06 ? { ok: false, msg: 'Les coups étaient trop irréguliers pour mesurer la latence. Recommencez en suivant bien le clic.' } : { ok: true, latency: Math.max(0, Math.min(0.4, med)) })
    }
    setPhase('result')
  }

  const run = async () => {
    data.current = { expected: [], onsets: [] }
    const ok = await mic.start()
    if (!ok) return
    setPhase('run')
    clock.start()
  }

  return (
    <div className="calib">
      <h3 className="player-title">Calibrer le micro</h3>
      {phase === 'intro' && (
        <>
          <p>Chaque appareil met un petit délai à entendre le son. Pour le mesurer : après 4 clics de décompte, frappez les cordes étouffées (main gauche posée dessus) <strong>pile sur chacun des 12 clics suivants</strong>.</p>
          <button className="btn btn-primary btn-big" onClick={run}>Commencer</button>
        </>
      )}
      {phase === 'run' && (
        <div className="center-col">
          <div className="countdown small-count">{beat < 4 ? 4 - Math.max(0, beat) : beat - 3}</div>
          <p className="muted">{beat < 4 ? 'Décompte…' : 'Frappez sur chaque clic'}</p>
        </div>
      )}
      {phase === 'result' && result && (
        <div className="center-col">
          {result.ok ? (
            <>
              <p className="good-text">Latence mesurée : {Math.round(result.latency * 1000)} ms</p>
              <button className="btn btn-primary" onClick={() => onDone(result.latency)}>Enregistrer</button>
            </>
          ) : (
            <>
              <p className="bad-text">{result.msg}</p>
              <button className="btn btn-primary" onClick={() => setPhase('intro')}>Recommencer</button>
            </>
          )}
        </div>
      )}
      {mic.error && <p className="error small">{mic.error}</p>}
      <button className="btn btn-ghost small" onClick={() => { clock.stop(); mic.stop(); onDone(null) }}>Annuler</button>
    </div>
  )
}
