import { useMemo, useState } from 'react'
import { GLOSSARY, TIERS } from '../data/glossary.js'
import { chordText } from '../lib/chordText.js'
import { useSettings } from '../lib/settings.jsx'
import './help.css'

const fold = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

// Page « Les mots de la guitare » : liste alphabétique filtrable (texte + niveau de vocabulaire)
export default function Glossary({ initialQuery = '' }) {
  const settings = useSettings()
  const T = (s) => chordText(s, settings?.label)
  const [q, setQ] = useState(initialQuery)
  const [tier, setTier] = useState(0)

  const sorted = useMemo(() => [...GLOSSARY].sort((a, b) => a.term.localeCompare(b.term, 'fr', { sensitivity: 'base' })), [])
  const shown = useMemo(() => {
    const k = fold(q.trim())
    return sorted.filter(
      (g) => (!tier || g.tier === tier) && (!k || fold(g.term).includes(k) || g.forms.some((f) => fold(f).includes(k)) || fold(g.def).includes(k)),
    )
  }, [sorted, q, tier])

  const groups = []
  for (const g of shown) {
    const letter = fold(g.term)[0].toUpperCase()
    if (!groups.length || groups[groups.length - 1].letter !== letter) groups.push({ letter, items: [] })
    groups[groups.length - 1].items.push(g)
  }

  return (
    <div className="glossary">
      <h2 className="page-title">Les mots de la guitare</h2>
      <label className="field gl-search">
        Chercher un mot
        <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="barré, tempo, case…" autoComplete="off" />
      </label>
      <div className="chips" role="group" aria-label="Type de mot">
        <button type="button" className={`chip${tier === 0 ? ' on' : ''}`} aria-pressed={tier === 0} onClick={() => setTier(0)}>Tous</button>
        {Object.entries(TIERS).map(([n, t]) => (
          <button key={n} type="button" className={`chip${tier === +n ? ' on' : ''}`} aria-pressed={tier === +n} onClick={() => setTier(+n)}>
            {t.label}
          </button>
        ))}
      </div>
      <p className="muted small" aria-live="polite">
        {shown.length ? `${shown.length} mot${shown.length > 1 ? 's' : ''}` : 'Aucun mot ne correspond. Essayez un autre mot ou « Tous ».'}
      </p>
      {groups.map((grp) => (
        <section key={grp.letter} className="gl-group" aria-labelledby={`gl-l-${grp.letter}`}>
          <h3 id={`gl-l-${grp.letter}`} className="gl-letter">{grp.letter}</h3>
          <dl className="gl-list">
            {grp.items.map((g) => (
              <div key={g.id} className="gl-item">
                <dt>
                  {g.term} <span className={`gl-tier t${g.tier}`}>{TIERS[g.tier].short}</span>
                </dt>
                <dd>
                  {T(g.def)}
                  {g.ex && <span className="gl-ex">{T(g.ex)}</span>}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      ))}
    </div>
  )
}
