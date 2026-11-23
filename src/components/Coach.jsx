import { useState } from 'react'
import { useProgress, today } from '../lib/progress.jsx'
import { useSettings } from '../lib/settings.jsx'
import { useAccess } from '../lib/access.jsx'
import { buildPlan } from '../lib/coach.js'
import { targetAllowed } from '../lib/navAccess.js'
import { chordText } from '../lib/chordText.js'

const SESSION_KEY = 'gratte.session'
const CHORD_RE = /([A-G][#b]?(?:maj7|add9|sus2|sus4|m7|m|7|5)?)(?= ↔| –|$| \()/g

// Séance du jour, filtrée selon ce qui est activé (mode élève)
export function usePlan() {
  const progress = useProgress()
  const access = useAccess()
  return buildPlan(progress, today()).filter((i) => targetAllowed(access, i.nav[0], i.nav[1]))
}

const sessionOn = () => {
  try {
    return sessionStorage.getItem(SESSION_KEY) === today()
  } catch {
    return false
  }
}
const setSession = (on) => {
  try {
    if (on) sessionStorage.setItem(SESSION_KEY, today())
    else sessionStorage.removeItem(SESSION_KEY)
  } catch {
    /* stockage indisponible */
  }
}

function useItemTitle() {
  const { label } = useSettings()
  return (item) => item.title.replace(CHORD_RE, (m) => label(m))
}

export default function Coach({ navigate }) {
  const plan = usePlan()
  const { label } = useSettings()
  const title = useItemTitle()
  if (!plan.length) return null
  const doneItems = plan.filter((i) => i.done).length
  const minutes = plan.reduce((s, i) => s + i.minutes, 0)
  const next = plan.find((i) => !i.done)

  const start = () => {
    setSession(true)
    if (next) navigate(...next.nav)
  }

  return (
    <section className="coach" aria-labelledby="coach-title">
      <div className="coach-head">
        <h2 className="section-title" id="coach-title">Votre séance du jour</h2>
        <span className="coach-meta">{doneItems}/{plan.length} · {minutes} min</span>
      </div>
      {next && (
        <button className="btn btn-primary btn-big coach-start" onClick={start}>
          ▶ {doneItems ? 'Reprendre ma séance' : 'Commencer ma séance'} ({minutes} min)
        </button>
      )}
      <ol className="coach-list">
        {plan.map((item) => (
          <li key={item.id}>
            <button className={`coach-item${item.done ? ' done' : ''}`} onClick={() => { setSession(true); navigate(...item.nav) }}>
              <span className="coach-check" aria-hidden="true">{item.done ? '✓' : ''}</span>
              <span className="coach-body">
                <strong>
                  <span className="visually-hidden">{item.done ? 'Fait : ' : 'À faire : '}</span>
                  {title(item)}
                </strong>
                <small>{chordText(item.detail, label)}</small>
              </span>
              <span className="coach-min">{item.minutes} min</span>
            </button>
          </li>
        ))}
      </ol>
      {!next && <p className="good-text center">Séance terminée, bravo ! Revenez demain : la régularité fait tout.</p>}
    </section>
  )
}

// Bandeau affiché pendant la séance, sur les autres écrans : où j'en suis, et l'étape suivante
export function SessionBar({ tab, navigate }) {
  const plan = usePlan()
  const title = useItemTitle()
  const [, force] = useState(0)
  if (tab === 'accueil' || !sessionOn() || !plan.length) return null
  const doneItems = plan.filter((i) => i.done).length
  const next = plan.find((i) => !i.done)
  const close = () => {
    setSession(false)
    force((n) => n + 1)
  }
  return (
    <div className="session-bar" role="region" aria-label="Séance du jour">
      <span className="session-step">Séance {doneItems}/{plan.length}</span>
      {next ? (
        <button className="session-next" onClick={() => navigate(...next.nav)}>
          Suivant : {title(next)} →
        </button>
      ) : (
        <button className="session-next" onClick={() => { close(); navigate('accueil') }}>Séance terminée 🎉</button>
      )}
      <button className="session-close" onClick={close} aria-label="Masquer le bandeau de séance">✕</button>
    </div>
  )
}
