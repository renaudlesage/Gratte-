import { useEffect, useMemo, useRef, useState } from 'react'
import { TABS } from '../data/tabs.js'
import { Clock, pluck, strum, midiToFreq, OPEN_MIDI } from '../lib/audio.js'
import { resolveChord } from '../lib/music.js'
import { useSettings } from '../lib/settings.jsx'
import { useProgress } from '../lib/progress.jsx'
import BpmControl from './BpmControl.jsx'
import { StaffCell, TrebleClef, noteNameOf, computeBeams, STAFF_HEIGHT } from './Staff.jsx'

const VIEW_KEY = 'gratte.tabview'
const readView = () => {
  try {
    return JSON.parse(localStorage.getItem(VIEW_KEY)) || { view: 'both', names: false }
  } catch {
    return { view: 'both', names: false }
  }
}

const TECH_LABEL = { h: 'h', p: 'p', '/': '/', '\\': '\\' }

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
  const legato = ev.tech && ev.tech !== 'pm'
  ev.n.forEach(([str, fret]) => {
    const s = 6 - str
    pluck(midiToFreq(OPEN_MIDI[s] + fret), time, (legato ? 0.22 : 0.36) * vol, s, ev.tech === 'pm')
  })
}

export default function TabPlayer({ params = {} }) {
  const [tabId, setTabId] = useState(params.tab || 'les-choux')
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
  const [running, setRunning] = useState(false)
  const [cur, setCur] = useState(-1)
  const { markPracticed, logActivity } = useProgress()
  const startedAt = useRef(0)
  const scroller = useRef(null)

  useEffect(() => {
    if (params.tab) setTabId(params.tab)
  }, [params.tab])

  // Début de chaque note, en croches
  const timeline = useMemo(() => buildTimeline(tab), [tab])
  const partnerTl = useMemo(() => (partner ? buildTimeline(partner) : null), [partner])

  const ref = useRef({})
  ref.current = { tab, timeline, loop, mine, other, chords, partner, partnerTl }

  const clockRef = useRef(null)
  if (!clockRef.current) {
    clockRef.current = new Clock({
      subdivision: 2,
      onSchedule: (e) => {
        const r = ref.current
        const tl = r.timeline
        const pass = Math.floor(e.tick / tl.total)
        if (!r.loop && pass > 0) return
        const pos = e.tick % tl.total
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
          const j = r.partnerTl.starts.indexOf(e.tick % r.partnerTl.total)
          if (j >= 0) playEvent(r.partner.notes[j], e.time, 0.65)
        }
      },
      onTick: (e) => {
        const { timeline: tl, loop: lp } = ref.current
        if (!lp && e.tick >= tl.total) {
          stop()
          return
        }
        const pos = e.tick % tl.total
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

  useEffect(() => () => clock.stop(), [clock])

  // Suit le curseur : la case jouée reste visible sur les morceaux longs
  useEffect(() => {
    const box = scroller.current
    if (!box || cur < 0) return
    const cell = box.querySelector(`[data-i="${cur}"]`)
    if (!cell) return
    const left = cell.offsetLeft - box.clientWidth / 3
    if (Math.abs(box.scrollLeft - left) > box.clientWidth / 4) box.scrollTo({ left: Math.max(0, left), behavior: 'smooth' })
  }, [cur])
  useEffect(() => {
    if (scroller.current) scroller.current.scrollLeft = 0
  }, [tabId])

  const beams = useMemo(() => computeBeams(tab.notes, tab.beats), [tab])
  const barLen = tab.beats * 2
  const isBar = (i) => i > 0 && timeline.starts[i] % barLen === 0

  function stop() {
    clock.stop()
    setRunning(false)
    setCur(-1)
    if (Date.now() - startedAt.current > 20000) logActivity('tab', ref.current.tab.id, clock.bpm)
  }

  const toggle = () => {
    if (clock.running) stop()
    else {
      clock.start()
      startedAt.current = Date.now()
      setRunning(true)
      markPracticed()
    }
  }

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

  return (
    <div className="tabplayer">
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
        <div className="segmented" role="radiogroup" aria-label="Affichage">
          {[['tab', 'Tablature'], ['staff', 'Partition'], ['both', 'Les deux']].map(([id, name]) => (
            <button key={id} role="radio" aria-checked={display.view === id} className={display.view === id ? 'on' : ''} onClick={() => setView({ view: id })}>{name}</button>
          ))}
        </div>
        <label className="field-inline">
          <input id="tab-names" type="checkbox" checked={display.names} onChange={(e) => setView({ names: e.target.checked })} />
          Nom des notes
        </label>
      </div>
      <p className="muted">{tab.tip}</p>

      <div className="tab-scroll" ref={scroller}>
        <div className="tabsheet" style={{ '--cells': timeline.total }}>
          <div className="tabsheet-row pm-row">
            <span className="tab-name" />
            {tab.notes.map((ev, i) => (
              <span key={i} data-i={i} className={`ts-cell${i === cur ? ' now' : ''}${ev.ch ? ' chord' : ''}${isBar(i) ? ' bar' : ''}`} style={{ flexGrow: ev.d }}>{ev.ch ? label(ev.ch) : ev.fermata ? '𝄐' : ev.tech === 'pm' ? 'PM' : ''}</span>
            ))}
          </div>
          {showStaff && (
            <div className="tabsheet-row staff-row" style={{ height: STAFF_HEIGHT }}>
              <span className="tab-name staff-name">
                <TrebleClef />
                <span className="st-time">
                  <b>{tab.beats}</b>
                  <b>4</b>
                </span>
              </span>
              {tab.notes.map((ev, i) => (
                <span key={i} className={`ts-cell staff${i === cur ? ' now' : ''}${isBar(i) ? ' bar' : ''}`} style={{ flexGrow: ev.d }}>
                  <StaffCell ev={ev} beam={beams[i]} />
                </span>
              ))}
            </div>
          )}
          {display.names && (
            <div className="tabsheet-row names-row">
              <span className="tab-name" />
              {tab.notes.map((ev, i) => (
                <span key={i} className={`ts-cell nname${i === cur ? ' now' : ''}${isBar(i) ? ' bar' : ''}`} style={{ flexGrow: ev.d }}>{noteNameOf(ev, note)}</span>
              ))}
            </div>
          )}
          {showTab && [1, 2, 3, 4, 5, 6].map((str) => (
            <div key={str} className="tabsheet-row">
              <span className="tab-name">{['e', 'B', 'G', 'D', 'A', 'E'][str - 1]}</span>
              {tab.notes.map((ev, i) => {
                const hit = ev.n.find(([s]) => s === str)
                return (
                  <span key={i} className={`ts-cell line${i === cur ? ' now' : ''}${isBar(i) ? ' bar' : ''}`} style={{ flexGrow: ev.d }}>
                    {hit ? (
                      <b>
                        {ev.tech && TECH_LABEL[ev.tech] ? <i>{TECH_LABEL[ev.tech]}</i> : null}
                        {hit[1]}
                      </b>
                    ) : null}
                  </span>
                )
              })}
            </div>
          ))}
        </div>
      </div>
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
    </div>
  )
}
