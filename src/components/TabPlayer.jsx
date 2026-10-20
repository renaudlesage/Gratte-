import { useEffect, useMemo, useRef, useState } from 'react'
import { TABS } from '../data/tabs.js'
import { Clock, pluck, strum, midiToFreq, OPEN_MIDI } from '../lib/audio.js'
import { resolveChord } from '../lib/music.js'
import { useSettings } from '../lib/settings.jsx'
import { useVoiceCommands, voiceSupported, VOICE_HELP } from '../lib/voice.js'
import { useProgress } from '../lib/progress.jsx'
import BpmControl from './BpmControl.jsx'
import { StaffCell, TrebleClef, KeySignature, keyPcsOf, noteNameOf, computeBeams, STAFF_HEIGHT } from './Staff.jsx'

const VIEW_KEY = 'gratte.tabview'
const readView = () => {
  try {
    return { view: 'both', names: false, zoom: null, ...JSON.parse(localStorage.getItem(VIEW_KEY)) }
  } catch {
    return { view: 'both', names: false, zoom: null }
  }
}

// Tailles d'affichage de la partition (zoom), et taille automatique selon la largeur disponible
const ZOOMS = [0.85, 1, 1.15, 1.3, 1.5, 1.75, 2, 2.4]
const autoZoom = (w, stage) => (w >= 1100 ? 1.5 : w >= 760 ? 1.3 : 1) + (stage && w >= 760 ? 0.25 : 0)
const nearestZoom = (z) => ZOOMS.reduce((a, b) => (Math.abs(b - z) < Math.abs(a - z) ? b : a))

const TECH_LABEL = { h: 'h', p: 'p', '/': '/', '\\': '\\' }

// Largeur d'une case proportionnelle à sa durée, identique sur toutes les lignes (le rembourrage n'y change rien)
const cellStyle = (d) => ({ flex: `${d} 0 calc(var(--cellw) * ${d})` })

function buildTimeline(tab) {
  let t = 0
  const starts = tab.notes.map((ev) => {
    const s = t
    t += ev.d
    return s
  })
  return { starts, total: t }
}

function playEvent(ev, time, vol) {
  if (ev.tie) return // note liée : elle continue de sonner, on ne la rejoue pas
  const legato = ev.tech && ev.tech !== 'pm'
  ev.n.forEach(([str, fret]) => {
    const s = 6 - str
    pluck(midiToFreq(OPEN_MIDI[s] + fret), time, (legato ? 0.22 : 0.36) * vol, s, ev.tech === 'pm')
  })
}

export default function TabPlayer({ params = {} }) {
  const [tabId, setTabId] = useState(params.tab || 'les-pompiers')
  const tab = TABS.find((t) => t.id === tabId) || TABS[0]
  const [bpm, setBpm] = useState(tab.bpm)
  const [loop, setLoop] = useState(true)
  const [mine, setMine] = useState(true) // entendre ma voix
  const [other, setOther] = useState(false) // entendre l'autre voix (duo)
  const [chords, setChords] = useState(false) // accords d'accompagnement
  const { label, note } = useSettings()
  const [display, setDisplay] = useState(readView) // affichage : tablature, partition ou les deux
  const setView = (patch) => {
    const next = { ...display, ...patch }
    setDisplay(next)
    try {
      localStorage.setItem(VIEW_KEY, JSON.stringify(next))
    } catch {
      /* stockage indisponible */
    }
  }
  const showStaff = display.view !== 'tab'
  const showTab = display.view !== 'staff'
  const partner = tab.partner ? TABS.find((t) => t.id === tab.partner) : null
  const hasChords = tab.notes.some((ev) => ev.ch)
  const hasLyrics = tab.notes.some((ev) => ev.ly)
  const [running, setRunning] = useState(false)
  const [cur, setCur] = useState(-1)
  const { markPracticed, logActivity } = useProgress()
  const startedAt = useRef(0)
  const scroller = useRef(null)
  const lineRefs = useRef([])
  const [stage, setStage] = useState(false) // mode pupitre : partition plein écran
  const [boxW, setBoxW] = useState(0)

  // Largeur disponible pour la partition (fenêtre DeX redimensionnable, rotation de la tablette…)
  useEffect(() => {
    const el = scroller.current
    if (!el) return undefined
    const measure = () => setBoxW(el.clientWidth)
    measure()
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', measure)
      return () => window.removeEventListener('resize', measure)
    }
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [stage])

  // Mode pupitre : plein écran si possible, Échap pour sortir, page figée derrière
  useEffect(() => {
    if (!stage) return undefined
    const onKey = (e) => {
      if (e.key === 'Escape') setStage(false)
      if (e.key === ' ' && e.target === document.body) {
        e.preventDefault()
        toggleRef.current()
      }
    }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
      if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {})
    }
  }, [stage])
  const enterStage = () => {
    setStage(true)
    document.documentElement.requestFullscreen?.().catch(() => {})
  }

  useEffect(() => {
    if (params.tab) setTabId(params.tab)
  }, [params.tab])

  // Début de chaque note, en subdivisions du temps (croches par défaut, doubles croches si res = 4)
  const res = tab.res || 2
  const timeline = useMemo(() => buildTimeline(tab), [tab])
  const partnerTl = useMemo(() => (partner ? buildTimeline(partner) : null), [partner])

  const ref = useRef({})
  ref.current = { tab, timeline, loop, mine, other, chords, partner, partnerTl }
  // L'horloge avance d'une subdivision du morceau à chaque pas

  const offsetRef = useRef(0) // position de départ (en subdivisions) : « mesure 5 », « reprends »…
  const posRef = useRef(0) // dernière position jouée
  const clockRef = useRef(null)
  if (!clockRef.current) {
    clockRef.current = new Clock({
      subdivision: 2,
      onSchedule: (e) => {
        const r = ref.current
        const tl = r.timeline
        const at = e.tick + offsetRef.current
        const pass = Math.floor(at / tl.total)
        if (!r.loop && pass > 0) return
        const pos = at % tl.total
        const i = tl.starts.indexOf(pos)
        if (i >= 0) {
          const ev = r.tab.notes[i]
          if (r.mine) playEvent(ev, e.time, 1)
          if (r.chords && ev.ch) {
            const c = resolveChord(ev.ch)
            if (c) strum(c.frets, { when: e.time, gain: 0.09, spacing: 0.03 })
          }
        }
        // Duo : l'autre voix joue en même temps, un peu plus doucement
        if (r.other && r.partner && r.partnerTl) {
          const j = r.partnerTl.starts.indexOf(at % r.partnerTl.total)
          if (j >= 0) playEvent(r.partner.notes[j], e.time, 0.65)
        }
      },
      onTick: (e) => {
        const { timeline: tl, loop: lp } = ref.current
        const at = e.tick + offsetRef.current
        if (!lp && at >= tl.total) {
          stop()
          posRef.current = 0
          return
        }
        const pos = at % tl.total
        posRef.current = pos
        let idx = -1
        tl.starts.forEach((s, k) => {
          if (s <= pos) idx = k
        })
        setCur(idx)
      },
    })
  }
  const clock = clockRef.current
  clock.bpm = bpm
  clock.beatsPerBar = tab.beats
  clock.subdivision = res

  useEffect(() => () => clock.stop(), [clock])


  const keyPcs = useMemo(() => keyPcsOf(tab.sharps), [tab])
  const beams = useMemo(() => computeBeams(tab.notes, tab.beats, res, keyPcs), [tab, res, keyPcs])
  const barLen = tab.beats * res
  const isBar = (i) => i > 0 && timeline.starts[i] % barLen === 0

  // Mise en page en lignes, comme une partition imprimée : autant de mesures par ligne que la largeur le permet
  const zoom = display.zoom || nearestZoom(autoZoom(boxW, stage))
  const baseCell = res > 2 ? (hasLyrics ? 32 : 22) : hasLyrics ? 34 : 26
  const nameW = (tab.sharps || 0) > 1 ? 72 : 62
  const layout = useMemo(() => {
    const bars = []
    tab.notes.forEach((ev, i) => {
      if (i === 0 || timeline.starts[i] % barLen === 0) bars.push({ a: i, b: i + 1, units: 0 })
      else bars[bars.length - 1].b = i + 1
      bars[bars.length - 1].units += ev.d
    })
    const inner = boxW ? boxW / zoom - nameW - 24 : 0
    const fit = inner ? Math.max(1, Math.min(8, Math.floor(inner / (barLen * baseCell)))) : bars.length
    const nLines = Math.ceil(bars.length / fit)
    const per = Math.ceil(bars.length / nLines) // lignes équilibrées
    // Écran étroit (téléphone) : on resserre jusqu'à 22 px par unité ; au-delà, la ligne défile horizontalement
    const minCell = inner && inner < barLen * baseCell ? Math.max(22, Math.floor(inner / barLen)) : baseCell
    const unit = inner ? Math.max(minCell, Math.floor((inner / (per * barLen)) * 10) / 10) : baseCell
    const lines = []
    for (let k = 0; k < bars.length; k += per) {
      const chunk = bars.slice(k, k + per)
      lines.push({ a: chunk[0].a, b: chunk[chunk.length - 1].b, units: chunk.reduce((n, x) => n + x.units, 0) })
    }
    return { lines, unit }
  }, [tab, timeline, barLen, boxW, zoom, baseCell, nameW])

  // Suit le curseur : la ligne jouée reste visible (défilement vertical, utile sur pupitre)
  const curLine = cur < 0 ? -1 : layout.lines.findIndex((l) => cur >= l.a && cur < l.b)
  useEffect(() => {
    const el = lineRefs.current[curLine]
    if (!el) return
    const r = el.getBoundingClientRect()
    const box = stage ? scroller.current.closest('.tabplayer').getBoundingClientRect() : { top: 0, bottom: window.innerHeight }
    if (r.top < box.top + 8 || r.bottom > box.bottom - 8) el.scrollIntoView({ block: curLine === 0 ? 'center' : 'start', behavior: 'smooth' })
  }, [curLine, stage])

  function stop() {
    clock.stop()
    setRunning(false)
    setCur(-1)
    if (Date.now() - startedAt.current > 20000) logActivity('tab', ref.current.tab.id, clock.bpm)
  }

  // Lance la lecture à partir d'une position (en subdivisions du temps)
  const playFrom = (pos = 0) => {
    if (clock.running) clock.stop()
    offsetRef.current = Math.max(0, Math.min(pos, timeline.total - 1))
    posRef.current = offsetRef.current
    clock.start()
    if (!running) startedAt.current = Date.now()
    setRunning(true)
    markPracticed()
  }
  const toggle = () => {
    if (clock.running) stop()
    else playFrom(0)
  }
  const barStart = (pos) => Math.floor(pos / barLen) * barLen

  // Commandes vocales
  const [voiceOn, setVoiceOn] = useState(false)
  const [voiceMsg, setVoiceMsg] = useState('')
  const [voiceHelp, setVoiceHelp] = useState(false)
  const voiceAct = useRef(null)
  voiceAct.current = (cmd) => {
    const nBars = Math.ceil(timeline.total / barLen)
    const say = (m) => setVoiceMsg(m)
    switch (cmd.type) {
      case 'stop':
        if (clock.running) stop()
        return say('Stop')
      case 'play':
        if (!clock.running) playFrom(0)
        return say('Lecture')
      case 'restart':
        playFrom(0)
        return say('Depuis le début')
      case 'resume':
        playFrom(barStart(posRef.current))
        return say(`Reprise mesure ${Math.floor(posRef.current / barLen) + 1}`)
      case 'bar': {
        const n = Math.max(1, Math.min(nBars, cmd.n))
        playFrom((n - 1) * barLen)
        return say(`Mesure ${n}`)
      }
      case 'bar-again':
        playFrom(barStart(posRef.current))
        return say(`Encore la mesure ${Math.floor(posRef.current / barLen) + 1}`)
      case 'faster':
        setBpm((b) => Math.min(180, b + cmd.step))
        return say(`Plus vite (+${cmd.step})`)
      case 'slower':
        setBpm((b) => Math.max(30, b - cmd.step))
        return say(`Moins vite (−${cmd.step})`)
      case 'bpm':
        setBpm(Math.max(30, Math.min(180, cmd.n)))
        return say(`Tempo ${cmd.n}`)
      case 'zoom':
        zoomByRef.current(cmd.dir)
        return say(cmd.dir > 0 ? 'Plus grand' : 'Plus petit')
      case 'loop':
        setLoop(cmd.on)
        return say(cmd.on ? 'En boucle' : 'Une seule fois')
      case 'chords':
        setChords(cmd.on)
        return say(cmd.on ? 'Accords' : 'Sans accords')
      case 'view':
        setView({ view: cmd.view })
        return say({ tab: 'Tablature', staff: 'Partition', both: 'Les deux' }[cmd.view])
      case 'next':
      case 'prev': {
        const k = TABS.findIndex((t) => t.id === tabId)
        const t = TABS[(k + (cmd.type === 'next' ? 1 : -1) + TABS.length) % TABS.length]
        choose(t.id)
        return say(t.title)
      }
      case 'stage':
        if (cmd.on) enterStage()
        else setStage(false)
        return say(cmd.on ? 'Mode pupitre' : 'Quitter')
      default:
    }
  }
  const voice = useVoiceCommands(voiceOn, (cmd) => voiceAct.current(cmd))
  useEffect(() => {
    if (!voiceMsg) return undefined
    const t = setTimeout(() => setVoiceMsg(''), 2500)
    return () => clearTimeout(t)
  }, [voiceMsg])
  const toggleRef = useRef(toggle)
  toggleRef.current = toggle
  const zoomBy = (dir) => {
    const i = ZOOMS.indexOf(zoom)
    setView({ zoom: ZOOMS[Math.max(0, Math.min(ZOOMS.length - 1, i + dir))] })
  }
  const zoomByRef = useRef(zoomBy)
  zoomByRef.current = zoomBy

  const choose = (id) => {
    if (clock.running) stop()
    const t = TABS.find((x) => x.id === id)
    setTabId(id)
    setBpm(t.bpm)
  }

  const groups = [
    ['cours', 'Mes morceaux de cours'],
    ['technique', 'Techniques'],
    ['gamme', 'Gammes et phrases'],
    ['mélodie', 'Mélodies'],
  ]

  // Une ligne de partition : les notes a … b-1 (index globaux conservés pour le curseur et les ligatures)
  const renderLine = (line, k) => {
    const idx = []
    for (let i = line.a; i < line.b; i++) idx.push(i)
    const bar = (i) => i !== line.a && isBar(i)
    const cls = (i, extra) => `ts-cell ${extra}${i === cur ? ' now' : ''}${bar(i) ? ' bar' : ''}`
    return (
      <div
        key={line.a}
        ref={(el) => (lineRefs.current[k] = el)}
        className={`tabsheet line-sheet${k === curLine ? ' playing' : ''}`}
        style={{ zoom, '--cells': line.units, '--cellw': `${layout.unit}px`, '--namew': `${nameW}px` }}
      >
        <div className="tabsheet-row pm-row">
          <span className="tab-name line-no">{k > 0 ? Math.round(timeline.starts[line.a] / barLen) + 1 : ''}</span>
          {idx.map((i) => {
            const ev = tab.notes[i]
            return (
              <span key={i} data-i={i} className={cls(i, ev.ch ? 'chord' : '')} style={cellStyle(ev.d)}>
                {ev.ch ? label(ev.ch) : ''}{ev.fermata ? (ev.ch ? ' 𝄐' : '𝄐') : ''}{!ev.ch && !ev.fermata && ev.tech === 'pm' ? 'PM' : ''}
              </span>
            )
          })}
        </div>
        {showStaff && (
          <div className="tabsheet-row staff-row" style={{ height: STAFF_HEIGHT }}>
            <span className="tab-name staff-name">
              <TrebleClef />
              <KeySignature sharps={tab.sharps} />
              {k === 0 && (
                <span className="st-time" style={(tab.sharps || 0) > 1 ? { left: 52 } : undefined}>
                  <b>{tab.beats}</b>
                  <b>4</b>
                </span>
              )}
            </span>
            {idx.map((i) => (
              <span key={i} className={cls(i, 'staff')} style={cellStyle(tab.notes[i].d)}>
                <StaffCell ev={tab.notes[i]} beam={beams[i]} res={res} keyPcs={keyPcs} tieNext={!!tab.notes[i + 1]?.tie} />
              </span>
            ))}
          </div>
        )}
        {hasLyrics && (
          <div className="tabsheet-row lyrics-row">
            <span className="tab-name" />
            {idx.map((i) => (
              <span key={i} className={cls(i, 'lyr')} style={cellStyle(tab.notes[i].d)}>{tab.notes[i].ly || ''}</span>
            ))}
          </div>
        )}
        {display.names && (
          <div className="tabsheet-row names-row">
            <span className="tab-name" />
            {idx.map((i) => (
              <span key={i} className={cls(i, 'nname')} style={cellStyle(tab.notes[i].d)}>{noteNameOf(tab.notes[i], note)}</span>
            ))}
          </div>
        )}
        {showTab && [1, 2, 3, 4, 5, 6].map((str) => (
          <div key={str} className="tabsheet-row">
            <span className="tab-name">{['e', 'B', 'G', 'D', 'A', 'E'][str - 1]}</span>
            {idx.map((i) => {
              const ev = tab.notes[i]
              const hit = ev.n.find(([st]) => st === str)
              return (
                <span key={i} className={cls(i, 'line')} style={cellStyle(ev.d)}>
                  {hit ? (
                    <b>
                      {ev.tech && TECH_LABEL[ev.tech] ? <i>{TECH_LABEL[ev.tech]}</i> : null}
                      {ev.tie ? `(${hit[1]})` : hit[1]}
                    </b>
                  ) : null}
                </span>
              )
            })}
          </div>
        ))}
      </div>
    )
  }

  const viewSwitch = (
    <div className="segmented" role="radiogroup" aria-label="Affichage">
      {[['tab', 'Tablature'], ['staff', 'Partition'], ['both', 'Les deux']].map(([id, name]) => (
        <button key={id} role="radio" aria-checked={display.view === id} className={display.view === id ? 'on' : ''} onClick={() => setView({ view: id })}>{name}</button>
      ))}
    </div>
  )
  const sizeControl = (
    <div className="size-ctl" role="group" aria-label="Taille de la partition">
      <button className="btn btn-round small" onClick={() => zoomBy(-1)} disabled={zoom <= ZOOMS[0]} aria-label="Plus petit">A−</button>
      <span className="size-val">{Math.round(zoom * 100)} %</span>
      <button className="btn btn-round small" onClick={() => zoomBy(1)} disabled={zoom >= ZOOMS[ZOOMS.length - 1]} aria-label="Plus grand">A+</button>
      {display.zoom && <button className="btn btn-ghost small" onClick={() => setView({ zoom: null })}>Auto</button>}
    </div>
  )
  const clampBpm = (v) => Math.max(30, Math.min(180, v))
  const voiceButton = voiceSupported() ? (
    <button
      className={`btn small voice-btn${voiceOn ? ' on' : ''}${voiceOn && voice.listening ? ' live' : ''}`}
      onClick={() => setVoiceOn((v) => !v)}
      aria-pressed={voiceOn}
      title="Commandes vocales"
    >
      🎤 {voiceOn ? (voice.listening ? 'À l’écoute' : 'Micro…') : 'Voix'}
    </button>
  ) : null
  const voiceStatus = voiceOn ? (
    <div className="voice-status" aria-live="polite">
      {voice.error ? <span className="error">{voice.error}</span> : voiceMsg ? <strong>✓ {voiceMsg}</strong> : <span className="muted">{voice.heard ? `« ${voice.heard} »` : 'Dites « joue », « stop », « au début », « mesure 3 », « plus vite »…'}</span>}
      <button className="btn btn-ghost small" onClick={() => setVoiceHelp((h) => !h)}>{voiceHelp ? 'Masquer' : 'Toutes les commandes'}</button>
      {voiceHelp && (
        <ul className="voice-help">
          {VOICE_HELP.map(([say, what]) => (
            <li key={say}><b>{say}</b> {what}</li>
          ))}
        </ul>
      )}
    </div>
  ) : null

  return (
    <div className={`tabplayer${stage ? ' stage' : ''}`}>
      {stage ? (
        <div className="stage-bar">
          <button className="btn btn-ghost small" onClick={() => setStage(false)} aria-label="Quitter le mode pupitre">✕</button>
          <strong className="stage-title">{tab.title}</strong>
          <div className="stage-bpm">
            <button className="btn btn-round small" onClick={() => setBpm(clampBpm(bpm - 5))} aria-label="Moins 5 BPM">−</button>
            <span><b>{bpm}</b> BPM</span>
            <button className="btn btn-round small" onClick={() => setBpm(clampBpm(bpm + 5))} aria-label="Plus 5 BPM">+</button>
          </div>
          {viewSwitch}
          {sizeControl}
          {voiceButton}
          <button className={`btn ${running ? '' : 'btn-primary'} stage-play`} onClick={toggle}>{running ? '■ Stop' : '▶ Lire'}</button>
          {voiceStatus}
        </div>
      ) : (
        <>
          {groups.map(([k, name]) => (
            <div key={k}>
              <span className="chip-group-label">{name}</span>
              <div className="chips">
                {TABS.filter((t) => t.kind === k).map((t) => (
                  <button key={t.id} className={`chip${t.id === tabId ? ' on' : ''}`} onClick={() => choose(t.id)}>{t.title}</button>
                ))}
              </div>
            </div>
          ))}
          {tab.by && <p className="small muted">{tab.by}</p>}
          <div className="row wrap gap view-switch">
            {viewSwitch}
            <label className="field-inline">
              <input id="tab-names" type="checkbox" checked={display.names} onChange={(e) => setView({ names: e.target.checked })} />
              Nom des notes
            </label>
            {sizeControl}
            <button className="btn small" onClick={enterStage}>⛶ Mode pupitre</button>
            {voiceButton}
          </div>
          {voiceStatus}
          <p className="muted">{tab.tip}</p>
        </>
      )}

      <div className="sheet-lines" ref={scroller}>
        {layout.lines.map(renderLine)}
      </div>

      {!stage && (
        <>
          <p className="muted small center">
            {showTab ? 'Tablature : la ligne du bas est la corde grave (Mi), le chiffre est la case (0 = à vide). ' : ''}
            {showStaff ? 'Partition : notes écrites comme pour la guitare (une octave au-dessus du son réel).' : ''}
          </p>

          <BpmControl bpm={bpm} setBpm={setBpm} min={30} max={180} tap={false} />
          <div className="row center gap">
            <label className="field-inline">
              <input id="tab-loop" type="checkbox" checked={loop} onChange={(e) => setLoop(e.target.checked)} />
              En boucle
            </label>
            {hasChords && (
              <label className="field-inline">
                <input id="tab-chords" type="checkbox" checked={chords} onChange={(e) => setChords(e.target.checked)} />
                Accords
              </label>
            )}
          </div>
          {partner && (
            <div className="duo-box">
              <strong>Duo</strong>
              <label className="field-inline">
                <input id="tab-mine" type="checkbox" checked={mine} onChange={(e) => setMine(e.target.checked)} />
                Entendre ma voix
              </label>
              <label className="field-inline">
                <input id="tab-other" type="checkbox" checked={other} onChange={(e) => setOther(e.target.checked)} />
                Entendre l’autre voix ({partner.title.replace(/^.*\(|\)$/g, '')})
              </label>
              <button className="btn btn-ghost small" onClick={() => choose(partner.id)}>Voir l’autre voix</button>
            </div>
          )}
          <button className={`btn btn-big ${running ? '' : 'btn-primary'}`} onClick={toggle}>{running ? '■ Stop' : '▶ Lire la tablature'}</button>
        </>
      )}
    </div>
  )
}
