import { useEffect, useMemo, useRef, useState } from 'react'
import { TABS } from '../data/tabs.js'
import { Clock, pluck, midiToFreq, OPEN_MIDI } from '../lib/audio.js'
import { useProgress } from '../lib/progress.jsx'
import BpmControl from './BpmControl.jsx'

const TECH_LABEL = { h: 'h', p: 'p', '/': '/', '\\': '\\' }

export default function TabPlayer({ params = {} }) {
  const [tabId, setTabId] = useState(params.tab || 'araignee')
  const tab = TABS.find((t) => t.id === tabId) || TABS[0]
  const [bpm, setBpm] = useState(tab.bpm)
  const [loop, setLoop] = useState(true)
  const [running, setRunning] = useState(false)
  const [cur, setCur] = useState(-1)
  const { markPracticed, logActivity } = useProgress()
  const startedAt = useRef(0)

  useEffect(() => {
    if (params.tab) setTabId(params.tab)
  }, [params.tab])

  // Début de chaque note, en croches
  const timeline = useMemo(() => {
    let t = 0
    const starts = tab.notes.map((ev) => {
      const s = t
      t += ev.d
      return s
    })
    return { starts, total: t }
  }, [tab])

  const ref = useRef({})
  ref.current = { tab, timeline, loop }

  const clockRef = useRef(null)
  if (!clockRef.current) {
    clockRef.current = new Clock({
      subdivision: 2,
      onSchedule: (e) => {
        const { tab: tb, timeline: tl, loop: lp } = ref.current
        const pass = Math.floor(e.tick / tl.total)
        if (!lp && pass > 0) return
        const pos = e.tick % tl.total
        const i = tl.starts.indexOf(pos)
        if (i < 0) return
        const ev = tb.notes[i]
        const legato = ev.tech && ev.tech !== 'pm'
        ev.n.forEach(([str, fret]) => {
          const s = 6 - str
          pluck(midiToFreq(OPEN_MIDI[s] + fret), e.time, legato ? 0.22 : 0.36, s, ev.tech === 'pm')
        })
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
      <p className="muted">{tab.tip}</p>

      <div className="tab-scroll">
        <div className="tabsheet">
          <div className="tabsheet-row pm-row">
            <span className="tab-name" />
            {tab.notes.map((ev, i) => (
              <span key={i} className={`ts-cell${i === cur ? ' now' : ''}`} style={{ flexGrow: ev.d }}>{ev.tech === 'pm' ? 'PM' : ''}</span>
            ))}
          </div>
          {[1, 2, 3, 4, 5, 6].map((str) => (
            <div key={str} className="tabsheet-row">
              <span className="tab-name">{['e', 'B', 'G', 'D', 'A', 'E'][str - 1]}</span>
              {tab.notes.map((ev, i) => {
                const hit = ev.n.find(([s]) => s === str)
                return (
                  <span key={i} className={`ts-cell line${i === cur ? ' now' : ''}`} style={{ flexGrow: ev.d }}>
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
      <p className="muted small center">Lecture de bas en haut : la ligne du bas est la corde grave (Mi). Le chiffre est la case à jouer, 0 = corde à vide.</p>

      <BpmControl bpm={bpm} setBpm={setBpm} min={30} max={180} tap={false} />
      <div className="row center gap">
        <label className="field-inline">
          <input id="tab-loop" type="checkbox" checked={loop} onChange={(e) => setLoop(e.target.checked)} />
          En boucle
        </label>
      </div>
      <button className={`btn btn-big ${running ? '' : 'btn-primary'}`} onClick={toggle}>{running ? '■ Stop' : '▶ Lire la tablature'}</button>
    </div>
  )
}
