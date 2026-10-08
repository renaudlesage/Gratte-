import { LESSONS } from '../data/lessons.js'
import { useProgress, today } from '../lib/progress.jsx'
import { useSettings } from '../lib/settings.jsx'
import { buildPlan } from '../lib/coach.js'

export default function Home({ navigate }) {
  const progress = useProgress()
  const { doneCount, nextLesson, streak, bests, days } = progress
  const { label } = useSettings()
  const pct = Math.round((doneCount / LESSONS.length) * 100)
  const plan = buildPlan(progress, today())
  const doneItems = plan.filter((i) => i.done).length
  const minutes = plan.reduce((s, i) => s + i.minutes, 0)
  const topBests = Object.entries(bests)
    .filter(([k]) => k.includes('|'))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)

  return (
    <div className="home">
      <section className="hero">
        <h1>Apprenez la guitare,<br />un quart d’heure par jour.</h1>
        <p>Accordez, apprenez les accords, vérifiez-les au micro, travaillez les changements et le rythme.</p>
      </section>

      <div className="stats">
        <div className="stat">
          <strong>{streak}</strong>
          <span>{streak > 1 ? 'jours de suite' : 'jour de suite'}</span>
        </div>
        <div className="stat">
          <strong>{doneCount}/{LESSONS.length}</strong>
          <span>leçons</span>
        </div>
        <div className="stat">
          <strong>{days.length}</strong>
          <span>jours de pratique</span>
        </div>
      </div>
      <div className="progress-bar" aria-label={`Progression ${pct} %`}><span style={{ width: `${pct}%` }} /></div>
      <button className="btn btn-ghost small stats-link" onClick={() => navigate('progres')}>Mes progrès : calendrier, courbes et badges →</button>

      <section className="coach">
        <div className="coach-head">
          <h3 className="section-title">Votre séance du jour</h3>
          <span className="coach-meta">{doneItems}/{plan.length} · {minutes} min</span>
        </div>
        <ol className="coach-list">
          {plan.map((item) => (
            <li key={item.id}>
              <button className={`coach-item${item.done ? ' done' : ''}`} onClick={() => navigate(...item.nav)}>
                <span className="coach-check" aria-label={item.done ? 'fait' : 'à faire'}>{item.done ? '✓' : ''}</span>
                <span className="coach-body">
                  <strong>{item.title.replace(/([A-G][#b]?(?:maj7|add9|sus2|sus4|m7|m|7)?)(?= ↔| \(|$)/g, (m) => label(m))}</strong>
                  <small>{item.detail}</small>
                </span>
                <span className="coach-min">{item.minutes} min</span>
              </button>
            </li>
          ))}
        </ol>
        {doneItems === plan.length && <p className="good-text center">Séance terminée, bravo ! Revenez demain : la régularité fait tout.</p>}
      </section>

      {plan.some((i) => i.id === 'lesson') ? null : nextLesson ? (
        <button className="card card-cta" onClick={() => navigate('lecons', { id: nextLesson.id })}>
          <small>Leçon en cours</small>
          <strong>{nextLesson.title}</strong>
          <span>{nextLesson.intro}</span>
        </button>
      ) : (
        <div className="card card-cta">
          <strong>🎉 Parcours terminé !</strong>
          <span>Continuez les défis, les chansons et les arpèges.</span>
        </div>
      )}

      {topBests.length > 0 && (
        <>
          <h3 className="section-title">Vos records (défi minute)</h3>
          <ul className="bests">
            {topBests.map(([k, v]) => (
              <li key={k}>
                <span>{k.split('|').map(label).join(' ↔ ')}</span>
                <strong>{v}</strong>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}
