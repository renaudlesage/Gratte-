import { LESSONS } from '../data/lessons.js'
import { useProgress } from '../lib/progress.jsx'
import { useSettings } from '../lib/settings.jsx'
import { chordText } from '../lib/chordText.js'
import Coach, { usePlan } from './Coach.jsx'

export default function Home({ navigate }) {
  const progress = useProgress()
  const { doneCount, nextLesson, streak, bests, days } = progress
  const { label } = useSettings()
  const plan = usePlan()
  const pct = Math.round((doneCount / LESSONS.length) * 100)
  const topBests = Object.entries(bests)
    .filter(([k]) => k.includes('|'))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
  const started = days.length > 0

  return (
    <div className="home">
      <section className="hero">
        <h1>Apprenez la guitare,<br />un quart d’heure par jour.</h1>
        {!started && <p>Accordez, apprenez les accords, vérifiez-les au micro, travaillez les changements et le rythme.</p>}
      </section>

      <Coach navigate={navigate} />

      {started && (
        <>
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
          <div className="progress-bar" role="img" aria-label={`Parcours : ${pct} %`}><span style={{ width: `${pct}%` }} /></div>
          <button className="btn btn-ghost small stats-link" onClick={() => navigate('progres')}>Mes progrès : calendrier, courbes et badges →</button>
        </>
      )}

      {plan.some((i) => i.id === 'lesson') ? null : nextLesson ? (
        <button className="card card-cta" onClick={() => navigate('lecons', { id: nextLesson.id })}>
          <small>Leçon en cours</small>
          <strong>{nextLesson.title}</strong>
          <span>{chordText(nextLesson.intro, label)}</span>
        </button>
      ) : (
        <div className="card card-cta">
          <strong>🎉 Parcours terminé !</strong>
          <span>Continuez les défis, les chansons et les arpèges.</span>
        </div>
      )}

      {topBests.length > 0 && (
        <>
          <h2 className="section-title">Vos records (défi minute)</h2>
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

      <button className="btn btn-ghost small stats-link" onClick={() => navigate('reglages')}>Vous avez un code de classe ? Rejoindre votre prof →</button>
    </div>
  )
}
