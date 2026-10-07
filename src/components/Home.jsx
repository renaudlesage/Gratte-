import { useState } from 'react'
import { LESSONS } from '../data/lessons.js'
import { useProgress } from '../lib/progress.jsx'

export default function Home({ navigate }) {
  const { doneCount, nextLesson, streak, bests, days, reset } = useProgress()
  const [confirming, setConfirming] = useState(false)
  const pct = Math.round((doneCount / LESSONS.length) * 100)
  const topBests = Object.entries(bests).sort((a, b) => b[1] - a[1]).slice(0, 5)

  return (
    <div className="home">
      <section className="hero">
        <h1>Apprenez la guitare,<br />un quart d’heure par jour.</h1>
        <p>Accordez, apprenez les accords, travaillez les changements et le rythme. Votre progression reste sur cet appareil.</p>
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

      {nextLesson ? (
        <button className="card card-cta" onClick={() => navigate('lecons', { id: nextLesson.id })}>
          <small>Continuer</small>
          <strong>{nextLesson.title}</strong>
          <span>{nextLesson.intro}</span>
        </button>
      ) : (
        <div className="card card-cta">
          <strong>🎉 Parcours terminé !</strong>
          <span>Continuez les défis minute et explorez de nouvelles grilles.</span>
        </div>
      )}

      <h3 className="section-title">Routine de 15 minutes</h3>
      <div className="routine">
        <button className="card" onClick={() => navigate('outils', { tool: 'accordeur' })}>
          <span className="routine-time">2 min</span><strong>Accorder</strong><span>Toujours commencer juste.</span>
        </button>
        <button className="card" onClick={() => navigate('pratique', { mode: 'minute' })}>
          <span className="routine-time">3 min</span><strong>Défi minute</strong><span>Une paire d’accords qui coince.</span>
        </button>
        <button className="card" onClick={() => navigate('pratique', { mode: 'rythmes' })}>
          <span className="routine-time">5 min</span><strong>Rythme</strong><span>Main droite régulière.</span>
        </button>
        <button className="card" onClick={() => navigate('lecons', nextLesson ? { id: nextLesson.id } : {})}>
          <span className="routine-time">5 min</span><strong>Leçon</strong><span>Un nouvel objectif.</span>
        </button>
      </div>

      {topBests.length > 0 && (
        <>
          <h3 className="section-title">Vos records (défi minute)</h3>
          <ul className="bests">
            {topBests.map(([k, v]) => (
              <li key={k}>
                <span>{k.replace('|', ' ↔ ')}</span>
                <strong>{v}</strong>
              </li>
            ))}
          </ul>
        </>
      )}

      {confirming ? (
        <div className="reset-confirm">
          <span>Effacer toute la progression sur cet appareil ?</span>
          <div className="row gap center">
            <button className="btn small" onClick={() => setConfirming(false)}>Annuler</button>
            <button className="btn small btn-danger" onClick={() => { reset(); setConfirming(false) }}>Effacer</button>
          </div>
        </div>
      ) : (
        <button className="btn btn-ghost small reset" onClick={() => setConfirming(true)}>
          Réinitialiser ma progression
        </button>
      )}
    </div>
  )
}
