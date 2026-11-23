import { useEffect, useState } from 'react'
import { LESSONS } from '../data/lessons.js'
import { getChord } from '../data/chords.js'
import { strum } from '../lib/audio.js'
import { useProgress } from '../lib/progress.jsx'
import ChordDiagram from './ChordDiagram.jsx'
import ChordCheck from './ChordCheck.jsx'
import LessonStepper from './LessonStepper.jsx'
import RecallWarmup from './RecallWarmup.jsx'
import { useAccess } from '../lib/access.jsx'
import { useSettings } from '../lib/settings.jsx'
import { taskProof, PROOF_LABEL } from '../lib/evidence.js'
import { chordText } from '../lib/chordText.js'
import { targetAllowed } from '../lib/navAccess.js'

export default function Lessons({ params = {}, navigate }) {
  const progress = useProgress()
  const { tasks, toggleTask, lessonDone, nextLesson } = progress
  const access = useAccess()
  const { can } = access
  const { label } = useSettings()
  const T = (s) => chordText(s, label)
  // Élève : seulement les leçons activées par le prof (la numérotation reste celle du parcours)
  const shown = LESSONS.map((l, i) => ({ l, i })).filter(({ l }) => can('lecon:' + l.id))
  const [open, setOpen] = useState(params.id || (nextLesson && can('lecon:' + nextLesson.id) ? nextLesson.id : shown[0]?.l.id))
  const [checkId, setCheckId] = useState(null)
  const [stepper, setStepper] = useState(null) // id de la leçon en mode pas à pas
  const [warmed, setWarmed] = useState({}) // leçons dont l'échauffement de mémoire est fait ou passé

  useEffect(() => {
    if (params.id) setOpen(params.id)
  }, [params.id])

  return (
    <div className="lessons">
      {!shown.length && <p className="muted">Ton prof n’a pas encore activé de leçon.</p>}
      {shown.map(({ l, i }, k) => {
        const done = lessonDone(l)
        const nDone = l.tasks.filter((t) => tasks[t.id] || taskProof(t, progress)).length
        const actions = l.actions.filter((a) => targetAllowed(access, a.tab, a.params))
        const isOpen = open === l.id
        // Accords des leçons précédentes du même parcours, à retrouver de mémoire avant la leçon (si elle n'est pas finie)
        const prevChords = done ? [] : [...new Set(LESSONS.slice(0, i).filter((x) => (x.parcours || 1) === (l.parcours || 1)).flatMap((x) => x.chords))].filter((c) => !l.chords.includes(c))
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
                {!warmed[l.id] && prevChords.length > 0 && (
                  <RecallWarmup key={l.id} chords={prevChords} onDone={() => setWarmed((w) => ({ ...w, [l.id]: true }))} />
                )}
                <p className="lesson-intro">{T(l.intro)}</p>
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
                {stepper === l.id ? (
                  <LessonStepper lesson={l} onClose={() => setStepper(null)} />
                ) : (
                  <>
                    <button className="btn stepper-launch" onClick={() => setStepper(l.id)}>
                      ▶ Pas à pas, mains libres (lu à voix haute)
                    </button>
                    <ol className="lesson-steps">
                      {l.steps.map((s, k) => <li key={k}>{T(s)}</li>)}
                    </ol>
                  </>
                )}
                <h4>Objectifs</h4>
                <ul className="tasks">
                  {l.tasks.map((t) => {
                    const proof = taskProof(t, progress)
                    const self = !!tasks[t.id]
                    return (
                      <li key={t.id} className={proof ? 'proved' : ''}>
                        <label>
                          <input type="checkbox" checked={proof || self} disabled={proof} onChange={() => toggleTask(t.id)} />
                          <span>
                            {T(t.label)}
                            {proof ? (
                              <small className="proof-tag ok">✓ {PROOF_LABEL[t.auto.type]}</small>
                            ) : self ? (
                              <small className="proof-tag">auto-évalué{t.auto ? ' · l’appli peut le valider' : ''}</small>
                            ) : t.auto ? (
                              <small className="proof-tag">se valide tout seul quand vous le réussissez dans l’appli</small>
                            ) : null}
                          </span>
                        </label>
                      </li>
                    )
                  })}
                </ul>
                {actions.length > 0 && (
                  <div className="row wrap gap">
                    {actions.map((a) => (
                      <button key={a.label} className="btn btn-primary" onClick={() => navigate(a.tab, a.params)}>
                        {T(a.label)} →
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </section>
          </div>
        )
      })}
    </div>
  )
}
