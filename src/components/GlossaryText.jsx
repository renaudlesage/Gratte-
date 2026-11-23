import { Fragment, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { GLOSSARY_MAP, TIERS, glossarySegments } from '../data/glossary.js'
import { chordText } from '../lib/chordText.js'
import { useSettings } from '../lib/settings.jsx'
import './help.css'

// Texte (déjà passé par chordText) dont la 1re occurrence de chaque mot du glossaire devient
// un bouton discret qui ouvre sa définition dans une bulle (toggletip).
// Props : text (chaîne), exclude (ids à ne pas repérer, voir glossaryExcludes).
export default function GlossaryText({ text, exclude }) {
  const key = exclude ? exclude.join(',') : ''
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const parts = useMemo(() => glossarySegments(text, { exclude: exclude || [] }), [text, key])
  const [open, setOpen] = useState(null) // index du segment ouvert
  const base = useId()
  return (
    <>
      {parts.map((p, i) =>
        p.id ? (
          <Term key={i} part={p} id={`${base}-${i}`} open={open === i} onToggle={(v) => setOpen(v ? i : null)} />
        ) : (
          <Fragment key={i}>{p.text}</Fragment>
        ),
      )}
    </>
  )
}

function Term({ part, id, open, onToggle }) {
  const settings = useSettings()
  const T = (s) => chordText(s, settings?.label)
  const g = GLOSSARY_MAP[part.id]
  const wrap = useRef(null)
  const btn = useRef(null)
  const tip = useRef(null)

  // Échap ferme (sans fermer une boîte de dialogue parente), clic ailleurs ferme
  useEffect(() => {
    if (!open) return
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        onToggle(false)
        btn.current?.focus()
      }
    }
    const onDown = (e) => {
      if (wrap.current && !wrap.current.contains(e.target)) onToggle(false)
    }
    document.addEventListener('keydown', onKey, true)
    document.addEventListener('pointerdown', onDown, true)
    return () => {
      document.removeEventListener('keydown', onKey, true)
      document.removeEventListener('pointerdown', onDown, true)
    }
  }, [open, onToggle])

  // La bulle reste dans l'écran (390 px compris) : décalage horizontal mesuré à l'ouverture
  useLayoutEffect(() => {
    const el = tip.current
    if (!open || !el) return
    el.style.setProperty('--gl-shift', '0px')
    const r = el.getBoundingClientRect()
    const vw = document.documentElement.clientWidth
    const margin = 8
    let dx = 0
    if (r.right > vw - margin) dx = vw - margin - r.right
    if (r.left + dx < margin) dx = margin - r.left
    el.style.setProperty('--gl-shift', `${Math.round(dx)}px`)
  }, [open])

  return (
    <span className="gl-wrap" ref={wrap}>
      <button
        ref={btn}
        type="button"
        className={`gl-term${open ? ' on' : ''}`}
        aria-expanded={open}
        aria-controls={id}
        onClick={() => onToggle(!open)}
      >
        {part.text}
      </button>
      <span id={id} className="gl-live" role="status">
        {open && (
          <span className="gl-tip" ref={tip}>
            <span className="gl-tip-head">
              <strong>{g.term}</strong>
              <span className={`gl-tier t${g.tier}`}>{TIERS[g.tier].short}</span>
            </span>
            <span className="gl-def">{T(g.def)}</span>
            {g.ex && <span className="gl-ex">{T(g.ex)}</span>}
          </span>
        )}
      </span>
    </span>
  )
}
