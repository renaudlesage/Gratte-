import { useState } from 'react'
import { playNote } from '../lib/audio.js'
import { useSettings } from '../lib/settings.jsx'
import { TUNINGS } from '../data/tunings.js'

const FRETS = 15
const MARKERS = { 3: '•', 5: '•', 7: '•', 9: '•', 12: '••', 15: '•' }
const NATURAL = new Set([0, 2, 4, 5, 7, 9, 11])

export const SCALES = {
  'penta-min': { name: 'Pentatonique mineure', iv: [0, 3, 5, 7, 10], tip: 'La gamme reine du rock et du blues : 5 notes, aucune ne sonne faux sur une grille de blues.' },
  blues: { name: 'Gamme blues', iv: [0, 3, 5, 6, 7, 10], tip: 'La pentatonique mineure + la « blue note » (quarte augmentée) : la touche de tension typique du blues.' },
  'penta-maj': { name: 'Pentatonique majeure', iv: [0, 2, 4, 7, 9], tip: 'Plus lumineuse : country, folk, pop.' },
  majeure: { name: 'Gamme majeure', iv: [0, 2, 4, 5, 7, 9, 11], tip: 'Do ré mi fa sol la si : la base de la musique occidentale.' },
}

// Manche complet : notes, positions d'une note, gammes
export default function Fretboard({ initialScale = null, initialRoot = 9 }) {
  const { note, lefty, tuning } = useSettings()
  const open = (TUNINGS[tuning] || TUNINGS.standard).notes
  const [mode, setMode] = useState(initialScale ? 'gamme' : 'notes')
  const [focus, setFocus] = useState(null)
  const [naturals, setNaturals] = useState(true)
  const [scale, setScale] = useState(initialScale || 'penta-min')
  const [root, setRoot] = useState(initialRoot)

  const strings = [5, 4, 3, 2, 1, 0] // corde 1 en haut, comme une tablature
  const frets = Array.from({ length: FRETS + 1 }, (_, f) => f)
  const order = lefty ? [...frets].reverse() : frets
  const sc = SCALES[scale]
  const inScale = (pc) => sc.iv.includes((pc - root + 12) % 12)
  // Position 1 : boîte de 4 cases à partir de la fondamentale sur la 6e corde
  const box = (() => {
    const f = (root - open[0] + 120) % 12
    const start = f === 0 ? 0 : f
    return [start, start + 3]
  })()

  return (
    <div className="fretboard-wrap">
      <div className="chips">
        <button className={`chip${mode === 'notes' ? ' on' : ''}`} onClick={() => setMode('notes')}>Notes</button>
        <button className={`chip${mode === 'gamme' ? ' on' : ''}`} onClick={() => setMode('gamme')}>Gammes</button>
      </div>

      {mode === 'notes' ? (
        <>
          <p className="muted">Touchez une case pour entendre la note. Choisissez une note pour voir toutes ses positions.</p>
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
        </>
      ) : (
        <>
          <div className="chips">
            {Object.entries(SCALES).map(([id, s]) => (
              <button key={id} className={`chip${scale === id ? ' on' : ''}`} onClick={() => setScale(id)}>{s.name}</button>
            ))}
          </div>
          <div className="row wrap gap">
            <label className="field-inline">
              Tonalité
              <select id="fb-root" value={root} onChange={(e) => setRoot(Number(e.target.value))}>
                {Array.from({ length: 12 }, (_, pc) => <option key={pc} value={pc}>{note(pc)}</option>)}
              </select>
            </label>
          </div>
          <p className="muted small">
            {sc.tip} Fondamentale ({note(root)}) en couleur pleine. Position 1 encadrée : cases {box[0]} à {box[1]}.
          </p>
        </>
      )}

      <div className="fretboard-scroll">
        <div className="fretboard" style={{ gridTemplateColumns: `44px repeat(${FRETS + 1}, minmax(36px, 1fr))` }}>
          <span />
          {order.map((f) => (
            <span key={`h${f}`} className="fb-head">{f === 0 ? 'vide' : f}</span>
          ))}
          {strings.map((s) => (
            <div key={s} style={{ display: 'contents' }}>
              <span className="fb-string-name">{6 - s} · {note(open[s] % 12)}</span>
              {order.map((f) => {
                const midi = open[s] + f
                const pc = midi % 12
                let label = note(pc)
                let cls = f === 0 ? ' open' : ''
                if (mode === 'notes') {
                  if (naturals && !NATURAL.has(pc)) label = ''
                  if (focus !== null) cls += pc === focus ? ' hit' : ' dim'
                } else if (inScale(pc)) {
                  cls += pc === root ? ' hit' : ' scale'
                  if (f >= box[0] && f <= box[1]) cls += ' box'
                } else {
                  label = ''
                  cls += ' dim'
                }
                return (
                  <button key={f} className={`fb-cell${cls}`} onClick={() => playNote(midi, s)} aria-label={`${note(pc)}, corde ${6 - s}, case ${f}`}>
                    {label}
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
