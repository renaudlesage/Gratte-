import { useState } from 'react'
import { RecallItem } from './ChordRecall.jsx'
import { today, useProgress } from '../lib/progress.jsx'
import { planRecall } from '../lib/recall.js'
import { getChord } from '../data/chords.js'
import './recall.css'

// « Récupérer d'abord » : en tête de leçon, 1 ou 2 accords des leçons précédentes à reconstituer
// avant de voir le contenu. Choix par la planification espacée (dus et erreurs d'abord) ;
// si rien n'est dû, les prochaines échéances. Bouton « Passer » discret.
export function pickWarmup(chords, activity, day, max = 2) {
  const plan = planRecall(chords.filter((id) => getChord(id)), activity, day, { max })
  const ids = plan.due.length ? plan.due : plan.upcoming.map((u) => u.id)
  return ids.slice(0, max)
}

export default function RecallWarmup({ chords = [], onDone }) {
  const progress = useProgress()
  // Choix figé à l'ouverture : la série ne bouge pas pendant qu'on répond
  const [ids] = useState(() => pickWarmup(chords, progress?.activity || [], today()))
  const [pos, setPos] = useState(0)
  const [closed, setClosed] = useState(false)

  if (!ids.length || closed) return null

  const finish = () => {
    setClosed(true)
    onDone?.()
  }

  return (
    <section className="rc rc-warmup card" aria-label="Échauffement de mémoire">
      <div className="rc-head">
        <h2 className="rc-title">Avant la leçon : de mémoire</h2>
        <button type="button" className="rc-skip" onClick={finish}>
          Passer
        </button>
      </div>
      <p className="muted rc-lead">
        {ids.length > 1 ? `${pos + 1} / ${ids.length} · ` : ''}Retrouver un accord sans le regarder, même de travers, aide à le garder.
      </p>
      <RecallItem
        key={ids[pos]}
        chordId={ids[pos]}
        nextLabel={pos + 1 < ids.length ? 'Accord suivant' : 'Passer à la leçon'}
        onFinish={() => (pos + 1 < ids.length ? setPos(pos + 1) : finish())}
      />
    </section>
  )
}
