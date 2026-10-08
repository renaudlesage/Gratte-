import { useState } from 'react'
import { OPEN_MIDI, STRING_NAMES, playNote } from '../lib/audio.js'
import { useSettings } from '../lib/settings.jsx'

const FRETS = 12
const MARKERS = { 3: '•', 5: '•', 7: '•', 9: '•', 12: '••' }
const NATURAL = new Set([0, 2, 4, 5, 7, 9, 11])

// Manche complet : nom de chaque note jusqu'à la 12e case, touche pour écouter
export default function Fretboard() {
  const { note, lefty } = useSettings()
  const [focus, setFocus] = useState(null) // classe de note mise en évidence
  const [naturals, setNaturals] = useState(true)

  // Corde 1 (Mi aigu) en haut, comme sur une tablature
  const strings = [5, 4, 3, 2, 1, 0]
  const frets = Array.from({ length: FRETS + 1 }, (_, f) => f)
  const order = lefty ? [...frets].reverse() : frets

  return (
    <div className="fretboard-wrap">
      <p className="muted">Touchez une case pour entendre la note. Choisissez une note pour voir toutes ses positions : c’est la clé pour se repérer sur le manche.</p>
      <div className="chips">
        <button className={`chip${focus === null ? ' on' : ''}`} onClick={() => setFocus(null)}>Toutes</button>
        {[0, 2, 4, 5, 7, 9, 11].map((pc) => (
          <button key={pc} className={`chip${focus === pc ? ' on' : ''}`} onClick={() => setFocus(pc)}>{note(pc)}</button>
        ))}
      </div>
      <label className="field-inline">
        <input id="fb-naturals" type="checkbox" checked={naturals} onChange={(e) => setNaturals(e.target.checked)} />
        Notes naturelles seulement (sans dièses)
      </label>
      <div className="fretboard-scroll">
        <div className="fretboard" style={{ gridTemplateColumns: `52px repeat(${FRETS + 1}, minmax(38px, 1fr))` }}>
          <span />
          {order.map((f) => (
            <span key={`h${f}`} className="fb-head">{f === 0 ? 'vide' : f}</span>
          ))}
          {strings.map((s) => (
            <div key={s} className="fb-row" style={{ display: 'contents' }}>
              <span className="fb-string-name">{6 - s} · {STRING_NAMES[s].replace(' grave', '').replace(' aigu', '')}</span>
              {order.map((f) => {
                const midi = OPEN_MIDI[s] + f
                const pc = midi % 12
                const hidden = naturals && !NATURAL.has(pc)
                const dim = focus !== null && pc !== focus
                return (
                  <button
                    key={f}
                    className={`fb-cell${f === 0 ? ' open' : ''}${focus === pc ? ' hit' : ''}${dim ? ' dim' : ''}`}
                    onClick={() => playNote(midi, s)}
                    aria-label={`${note(pc)}, corde ${6 - s}, case ${f}`}
                  >
                    {hidden ? '' : note(pc)}
                  </button>
                )
              })}
            </div>
          ))}
          <span />
          {order.map((f) => (
            <span key={`m${f}`} className="fb-marker">{MARKERS[f] || ''}</span>
          ))}
        </div>
      </div>
    </div>
  )
}
