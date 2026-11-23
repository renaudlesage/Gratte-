import { useEffect, useId, useRef, useState } from 'react'
import { SYMPTOM_MAP, TYPES, rankSymptoms, resolveAction } from '../data/troubleshoot.js'
import { chordText } from '../lib/chordText.js'
import { useSettings } from '../lib/settings.jsx'
import GlossaryText from './GlossaryText.jsx'
import './help.css'

const LEVELS = ['Une piste', 'La consigne', 'Exemple guidé']

// Bouton « Ça coince ? » + panneau de diagnostic : symptôme → questions → indices un à un
// → action dans l'appli → « Ça marche mieux ? ».
// Props : navigate(tab, params) ; context { chords?: string[], pattern?: string, symptom?: string, topics?: string[] }
export default function Stuck({ navigate, context = {} }) {
  const settings = useSettings()
  const T = (s) => chordText(s, settings?.label)
  const dlg = useRef(null)
  const opener = useRef(null)
  const focusRef = useRef(null)
  const titleId = useId()
  const [open, setOpen] = useState(false)
  const [st, setSt] = useState(null) // { phase, symptom, q, cause, level, tried, retry }

  const start = () => {
    const sym = context.symptom && SYMPTOM_MAP[context.symptom]
    setSt(sym ? { phase: 'q', symptom: sym.id, q: sym.questions[0].id, tried: [] } : { phase: 'pick', tried: [] })
    setOpen(true)
  }
  const close = () => {
    const d = dlg.current
    if (d?.open && typeof d.close === 'function') d.close()
    else {
      d?.removeAttribute('open')
      setOpen(false)
    }
  }

  // Boîte de dialogue native : focus piégé, Échap, arrière-plan inerte
  useEffect(() => {
    const d = dlg.current
    if (!d) return
    if (open && !d.open) {
      try {
        d.showModal()
      } catch {
        d.setAttribute('open', '')
      }
    }
  }, [open])
  useEffect(() => {
    const d = dlg.current
    if (!d) return
    const onClose = () => {
      setOpen(false)
      opener.current?.focus()
    }
    d.addEventListener('close', onClose)
    return () => d.removeEventListener('close', onClose)
  }, [])

  // À chaque nouvelle étape, le focus va au titre ou au nouvel indice (lu par les lecteurs d'écran)
  useEffect(() => {
    if (open) focusRef.current?.focus()
  }, [open, st?.phase, st?.q, st?.cause, st?.level])

  const sym = st?.symptom ? SYMPTOM_MAP[st.symptom] : null
  const cause = sym && st.cause ? sym.causes[st.cause] : null
  const act = (a) => resolveAction(a, context)
  const go = (a) => {
    close()
    navigate?.(a.tab, a.params)
  }

  const pick = (id) => setSt({ phase: 'q', symptom: id, q: SYMPTOM_MAP[id].questions[0].id, tried: [] })
  const answer = (o) =>
    o.next
      ? setSt({ ...st, q: o.next, history: [...(st.history || []), st.q] })
      : setSt({ ...st, phase: 'hints', cause: o.cause, level: 1, retry: false })
  const back = () => {
    const h = st.history || []
    if (h.length) setSt({ ...st, q: h[h.length - 1], history: h.slice(0, -1) })
    else setSt({ phase: 'pick', tried: [] })
  }
  const stillStuck = () => {
    const tried = [...st.tried, st.cause]
    const next = sym.order.find((c) => !tried.includes(c))
    setSt(next ? { ...st, tried, cause: next, level: 1, retry: true } : { ...st, tried, phase: 'fallback' })
  }

  const { forHere, others } = rankSymptoms(context)
  const symButton = (s) => (
    <li key={s.id}>
      <button type="button" className="stuck-opt stuck-sym" onClick={() => pick(s.id)}>
        <span className="stuck-icon" aria-hidden>{s.icon}</span>
        <span>
          <strong>{s.label}</strong>
          <small>{s.sub}</small>
        </span>
      </button>
    </li>
  )
  const actionBtn = (a, primary = true) => {
    const r = act(a)
    return r ? (
      <button type="button" className={`btn ${primary ? 'btn-primary' : ''} stuck-action`} onClick={() => go(r)}>
        {T(r.label)} →
      </button>
    ) : null
  }

  let body = null
  if (st?.phase === 'pick') {
    body = (
      <>
        <h3 className="stuck-h" tabIndex={-1} ref={focusRef}>Qu’est-ce qui vous arrive ?</h3>
        <p className="muted small">Se bloquer fait partie de l’apprentissage. On cherche la cause ensemble, puis je vous donne des indices, un par un.</p>
        {forHere.length > 0 && (
          <>
            <h4 className="stuck-group">Pour cet exercice</h4>
            <ul className="stuck-list">{forHere.map(symButton)}</ul>
            <h4 className="stuck-group">Autres soucis</h4>
          </>
        )}
        <ul className="stuck-list">{others.map(symButton)}</ul>
      </>
    )
  } else if (st?.phase === 'q' && sym) {
    const q = sym.questions.find((x) => x.id === st.q)
    const first = q.id === sym.questions[0].id
    body = (
      <>
        {first && <p className="stuck-intro">{sym.intro}</p>}
        {sym.safety && <p className="stuck-safety" role="note"><strong>Sécurité.</strong> {sym.safety}</p>}
        <h3 className="stuck-h" tabIndex={-1} ref={focusRef}>{q.text}</h3>
        <ul className="stuck-list">
          {q.options.map((o) => (
            <li key={o.label}>
              <button type="button" className="stuck-opt" onClick={() => answer(o)}>{o.label}</button>
            </li>
          ))}
        </ul>
        <button type="button" className="btn btn-ghost small" onClick={back}>← Retour</button>
      </>
    )
  } else if (st?.phase === 'hints' && cause) {
    const type = TYPES[cause.type]
    body = (
      <>
        {st.retry && <p className="stuck-intro">Pas encore ? C’est normal, essayons une autre piste.</p>}
        {cause.stop && (
          <p className="stuck-safety stop" role="alert">
            <strong>Arrêtez de jouer pour aujourd’hui.</strong> Une douleur au poignet ou à l’avant-bras ne se règle pas en insistant.
          </p>
        )}
        <p className="stuck-cause-kicker">Ce qui se passe sans doute</p>
        <h3 className="stuck-h" tabIndex={st.level === 1 ? -1 : undefined} ref={st.level === 1 ? focusRef : null}>{cause.title}</h3>
        <p className="stuck-type">
          <span className={`stuck-type-tag ty-${cause.type}`}>{type.label}</span> <span className="muted small">{type.help}</span>
        </p>
        <ol className="stuck-hints">
          {cause.hints.slice(0, st.level).map((h, i) => (
            <li key={i} className={i === st.level - 1 ? 'new' : ''} tabIndex={i === st.level - 1 && i > 0 ? -1 : undefined} ref={i === st.level - 1 && i > 0 ? focusRef : null}>
              <small>Indice {i + 1} · {LEVELS[i]}</small>
              <span><GlossaryText text={T(h)} /></span>
            </li>
          ))}
        </ol>
        {st.level < cause.hints.length ? (
          <>
            <p className="muted small">Essayez d’abord à la guitare. Besoin d’un coup de pouce de plus ?</p>
            <div className="stuck-row">
              <button type="button" className="btn btn-primary" onClick={() => setSt({ ...st, level: st.level + 1 })}>Un autre indice</button>
              <button type="button" className="btn" onClick={() => setSt({ ...st, phase: 'done' })}>C’est réglé !</button>
            </div>
          </>
        ) : (
          <>
            {cause.action && <div className="stuck-row">{actionBtn(cause.action)}</div>}
            <p className="stuck-ask">Ça marche mieux ?</p>
            <div className="stuck-row">
              <button type="button" className="btn btn-primary" onClick={() => setSt({ ...st, phase: 'done' })}>Oui</button>
              <button type="button" className="btn" onClick={stillStuck}>Toujours pas</button>
            </div>
          </>
        )}
      </>
    )
  } else if (st?.phase === 'done' && cause) {
    body = (
      <>
        <h3 className="stuck-h" tabIndex={-1} ref={focusRef}>Bien joué !</h3>
        <p>Vous avez trouvé d’où venait le souci : <strong>{cause.title.toLowerCase()}</strong>.</p>
        <div className="stuck-check">
          <small>Le réflexe pour la prochaine fois</small>
          <span><GlossaryText text={T(cause.check)} /></span>
        </div>
        <div className="stuck-row">
          {cause.action && actionBtn(cause.action)}
          <button type="button" className="btn" onClick={() => setSt({ phase: 'pick', tried: [] })}>Un autre souci</button>
          <button type="button" className="btn btn-ghost" onClick={close}>Fermer</button>
        </div>
      </>
    )
  } else if (st?.phase === 'fallback' && sym) {
    body = (
      <>
        <h3 className="stuck-h" tabIndex={-1} ref={focusRef}>Revenons à une étape plus simple</h3>
        <p>On a fait le tour des causes les plus fréquentes. Ce n’est pas un échec : certaines choses demandent juste plus de temps.</p>
        <p><GlossaryText text={T(sym.fallback.text)} /></p>
        <p className="muted small">Si vous le pouvez, montrez votre main à votre prof ou à quelqu’un qui joue : un regard extérieur trouve souvent la cause en quelques secondes.</p>
        <div className="stuck-row">
          {sym.fallback.action && actionBtn(sym.fallback.action)}
          <button type="button" className="btn btn-ghost" onClick={close}>Fermer</button>
        </div>
      </>
    )
  }

  return (
    <>
      <button type="button" ref={opener} className="btn stuck-btn" onClick={start} aria-haspopup="dialog">
        <span aria-hidden>🤔</span> Ça coince ?
      </button>
      <dialog
        ref={dlg}
        className="stuck-dialog"
        aria-labelledby={titleId}
        onClick={(e) => {
          if (e.target === dlg.current) close() // clic sur le fond
        }}
      >
        {open && (
          <div className="stuck-panel">
            <header className="stuck-head">
              <h2 id={titleId}>Ça coince ?{sym && <span className="stuck-sub"> · {sym.label}</span>}</h2>
              <button type="button" className="icon-btn" onClick={close} aria-label="Fermer">✕</button>
            </header>
            {body}
          </div>
        )}
      </dialog>
    </>
  )
}
