import { useEffect, useState } from 'react'
import { CHORDS } from '../data/chords.js'
import { strum } from '../lib/audio.js'
import ChordDiagram from './ChordDiagram.jsx'

const FILTERS = [
  ['tous', 'Tous'],
  ['majeur', 'Majeurs'],
  ['mineur', 'Mineurs'],
  ['7e', '7e'],
  ['autre', 'Couleurs'],
  ['barré', 'Barrés'],
]

export default function ChordLibrary({ params = {} }) {
  const [filter, setFilter] = useState('tous')
  const [active, setActive] = useState(params.focus || null)

  useEffect(() => {
    if (params.focus) {
      setActive(params.focus)
      document.getElementById(`chord-${params.focus}`)?.scrollIntoView({ block: 'center', behavior: 'smooth' })
    }
  }, [params.focus])

  const list = filter === 'tous' ? CHORDS : CHORDS.filter((c) => c.type === filter)

  const play = (c) => {
    setActive(c.id)
    strum(c.frets)
  }

  return (
    <div>
      <p className="muted">Touchez un accord pour l’écouter. Les chiffres indiquent les doigts : 1 index, 2 majeur, 3 annulaire, 4 auriculaire. ○ = corde à vide, × = ne pas jouer.</p>
      <div className="chips">
        {FILTERS.map(([id, label]) => (
          <button key={id} className={`chip${filter === id ? ' on' : ''}`} onClick={() => setFilter(id)}>
            {label}
          </button>
        ))}
      </div>
      <div className="chord-grid">
        {list.map((c) => (
          <button key={c.id} id={`chord-${c.id}`} className={`chord-card${active === c.id ? ' on' : ''}`} onClick={() => play(c)}>
            <ChordDiagram chord={c} size={120} highlight={active === c.id} />
            <span className="chord-card-fr">{c.fr}</span>
            <span className="level" title="Difficulté">{'●'.repeat(c.level)}{'○'.repeat(3 - c.level)}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
