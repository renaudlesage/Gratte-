import { useEffect, useState } from 'react'
import { CHORDS, getChord } from '../data/chords.js'
import { strum } from '../lib/audio.js'
import ChordDiagram from './ChordDiagram.jsx'
import ChordCheck from './ChordCheck.jsx'
import Fretboard from './Fretboard.jsx'
import Tabs from './Tabs.jsx'
import { useSettings } from '../lib/settings.jsx'
import { TUNINGS, chordsForTuning } from '../data/tunings.js'

const FILTERS = [
  ['tous', 'Tous'],
  ['majeur', 'Majeurs'],
  ['mineur', 'Mineurs'],
  ['7e', '7e'],
  ['autre', 'Couleurs'],
  ['power', 'Power chords'],
  ['barré', 'Barrés'],
]

export default function ChordLibrary({ params = {} }) {
  const [view, setView] = useState(params.view || 'accords')
  const [filter, setFilter] = useState('tous')
  const [active, setActive] = useState(params.focus || null)

  useEffect(() => {
    if (params.view) setView(params.view)
    if (params.focus) {
      setView('accords')
      setActive(params.focus)
      setTimeout(() => document.getElementById(`chord-${params.focus}`)?.scrollIntoView({ block: 'center', behavior: 'smooth' }), 50)
    }
  }, [params])

  const { tuning } = useSettings()
  const altChords = tuning && tuning !== 'standard' ? chordsForTuning(tuning) : []
  const list = filter === 'tous' ? CHORDS : CHORDS.filter((c) => c.type === filter)
  const keyOf = (c) => (c.tuning ? `${c.tuning}:${c.key || c.id}` : c.id)
  const activeChord = active ? (getChord(active) || altChords.find((c) => keyOf(c) === active)) : null

  const play = (c) => {
    setActive(keyOf(c))
    strum(c.frets, { open: c.open })
  }

  return (
    <div>
      <Tabs tabs={[['accords', 'Dictionnaire'], ['manche', 'Manche']]} value={view} onChange={setView} />
      {view === 'manche' ? (
        <Fretboard initialScale={params.scale || null} initialRoot={params.root ?? 9} key={params._k || 'fb'} />
      ) : (
        <>
          <p className="muted">Touchez un accord pour l’écouter, puis vérifiez-le au micro. Chiffres = doigts : 1 index, 2 majeur, 3 annulaire, 4 auriculaire. ○ corde à vide, × ne pas jouer.</p>
          {activeChord && (
            <div className="check-panel">
              <ChordDiagram chord={activeChord} size={110} />
              <div className="check-panel-body">
                <strong>{activeChord.fr}</strong>
                <ChordCheck chord={activeChord} key={keyOf(activeChord)} />
              </div>
            </div>
          )}
          {altChords.length > 0 && (
            <section className="alt-tuning">
              <h3 className="section-title">Accordage {TUNINGS[tuning].name}</h3>
              <p className="muted small">{TUNINGS[tuning].desc} Accordez la guitare dans l’onglet Outils.</p>
              <div className="chord-grid">
                {altChords.map((c) => (
                  <button key={keyOf(c)} className={`chord-card${active === keyOf(c) ? ' on' : ''}`} onClick={() => play(c)}>
                    <ChordDiagram chord={c} size={120} highlight={active === keyOf(c)} />
                    <span className="chord-card-fr">{c.fr}</span>
                  </button>
                ))}
              </div>
              <h3 className="section-title">Accordage standard</h3>
            </section>
          )}
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
        </>
      )}
    </div>
  )
}
