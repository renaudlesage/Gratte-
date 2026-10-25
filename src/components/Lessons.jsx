import { useEffect, useState } from 'react'
import { LESSONS } from '../data/lessons.js'
import { getChord } from '../data/chords.js'
import { strum } from '../lib/audio.js'
import { useProgress } from '../lib/progress.jsx'
import ChordDiagram from './ChordDiagram.jsx'
import ChordCheck from './ChordCheck.jsx'
import { useAccess } from '../lib/access.jsx'

export default function Lessons({ params = {}, navigate }) {
  const { tasks, toggleTask, lessonDone, nextLesson } = useProgress()
  const { can } = useAccess()
  // Élève : seulement les leçons activées par le prof (la numérotation reste celle du parcours)
  const shown = LESSONS.map((l, i) => ({ l, i })).filter(({ l }) => can('lecon:' + l.id))
  const [open, setOpen] = useState(params.id || (nextLesson && can('lecon:' + nextLesson.id) ? nextLesson.id : shown[0]?.l.id))
  const [checkId, setCheckId] = useState(null)

  useEffect(() => {
    if (params.id) setOpen(params.id)
  }, [params.id])

  return (
    <div className="lessons">
      {!shown.length && <p className="muted">Ton prof n’a pas encore activé de leçon.</p>}
      {shown.map(({ l, i }, k) => {
        const done = lessonDone(l)
        const nDone = l.tasks.filter((t) => tasks[t.id]).length
        const isOpen = open === l.id
        return (
          <div key={l.id} style={{ display: 'contents' }}>
          {(k === 0 || (shown[k - 1].l.parcours || 1) !== (l.parcours || 1)) && (
            <h3 className="section-title parcours-title">{(l.parcours || 1) === 1 ? 'Parcours 1 · Les bases' : 'Parcours 2 · Techniques et improvisation'}</h3>
          )}
          <section className={`lesson${isOpen ? ' open' : ''}${done ? ' done' : ''}`}>
            <button className="lesson-head" onClick={() => setOpen(isOpen ? null : l.id)} aria-expanded={isOpen}>
              <span className="lesson-num">{done ? '✓' : i + 1}</span>
              <span className="lesson-title">
                <strong>{l.title}</strong>
                <small>{l.minutes} min · {nDone}/{l.tasks.length} objectifs</small>
              </span>
              <span className="lesson-caret">{isOpen ? '−' : '+'}</span>
            </button>
            {isOpen && (
              <div className="lesson-body">
                <p className="lesson-intro">{l.intro}</p>
                {l.chords.length > 0 && (
                  <div className="lesson-chords">
                    {l.chords.map((id) => {
                      const c = getChord(id)
                      return (
                        <button key={id} className={`chord-mini${(checkId && l.chords.includes(checkId) ? checkId : l.chords[0]) === id ? ' on' : ''}`} onClick={() => { strum(c.frets); setCheckId(id) }} title="Écouter">
                          <ChordDiagram chord={c} size={96} />
                        </button>
                      )
                    })}
                  </div>
                )}
                {l.chords.length > 0 && (
                  <ChordCheck compact chord={getChord(checkId && l.chords.includes(checkId) ? checkId : l.chords[0])} key={l.id + (checkId || '')} />
                )}
                <ol className="lesson-steps">
                  {l.steps.map((s, k) => <li key={k}>{s}</li>)}
                </ol>
                <h4>Objectifs</h4>
                <ul className="tasks">
                  {l.tasks.map((t) => (
                    <li key={t.id}>
                      <label>
                        <input type="checkbox" checked={!!tasks[t.id]} onChange={() => toggleTask(t.id)} />
                        <span>{t.label}</span>
                      </label>
                    </li>
                  ))}
                </ul>
                <div className="row wrap gap">
                  {l.actions.map((a) => (
                    <button key={a.label} className="btn btn-primary" onClick={() => navigate(a.tab, a.params)}>
                      {a.label} →
                    </button>
                  ))}
                </div>
              </div>
            )}
          </section>
          </div>
        )
      })}
    </div>
  )
}
