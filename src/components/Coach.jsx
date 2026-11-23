import { useState } from 'react'
import { useProgress, today } from '../lib/progress.jsx'
import { useSettings } from '../lib/settings.jsx'
import { useAccess } from '../lib/access.jsx'
import { useAddress } from '../lib/address.js'
import { buildPlan, goalOptions, snagOptions, nextStepText } from '../lib/coach.js'
import { intentionText } from '../lib/reminder.js'
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
  const progress = useProgress()
  const { label, reminder } = useSettings()
  const t = useAddress()
  const title = useItemTitle()
  const [phase, setPhase] = useState(null) // null | 'goal' | 'bilan'
  if (!plan.length) return null
  const d = today()
  const entry = progress.journal.find((e) => e.date === d) || null
  const doneItems = plan.filter((i) => i.done).length
  const minutes = plan.reduce((s, i) => s + i.minutes, 0)
  const next = plan.find((i) => !i.done)
  const goals = goalOptions(plan, progress.journal, d)
  const bilanDone = !!entry?.feel
  const plan1 = intentionText(reminder)

  const go = (item) => {
    setSession(true)
    setPhase(null)
    if (item) navigate(...item.nav)
  }
  // Avant : un point du jour en un toucher (seulement au premier départ de la journée)
  const start = () => {
    if (!entry?.goal && !entry?.goalSkipped && goals.length) setPhase('goal')
    else go(next)
  }
  const pickGoal = (o) => {
    progress.saveJournal({ goal: o.key, goalText: o.text })
    const tune = plan.find((i) => i.id === 'tune')
    go(tune && !tune.done ? tune : plan.find((i) => i.key === o.key))
  }
  const skipGoal = () => {
    progress.saveJournal({ goalSkipped: true })
    go(next)
  }

  // Le bilan s'ouvre tout seul quand tout est fait (la leçon, qui peut prendre plusieurs jours, ne compte pas)
  const practiceDone = plan.filter((i) => i.id !== 'lesson').every((i) => i.done)
  const showBilan = phase === 'bilan' || (practiceDone && !bilanDone)

  // Bilan : à la place du bouton « Terminer » en bas, ou en haut quand toutes les étapes sont faites
  const closing = (showBilan ? (
        <Bilan plan={plan} entry={entry} onClose={() => setPhase(null)} allDone={!next} />
      ) : bilanDone ? (
        <div className="srl-card" aria-live="polite">
          <p className="good-text small">✓ Bilan noté. {nextStepText(entry, label, t)}</p>
          {!next && <p className="small muted">{t('Revenez demain : la régularité fait tout.', 'Reviens demain : la régularité fait tout.')}</p>}
          <button type="button" className="btn btn-ghost small" onClick={() => setPhase('bilan')}>Modifier le bilan</button>
        </div>
      ) : (
        doneItems > 0 && next && (
          <button type="button" className="btn small coach-end" onClick={() => setPhase('bilan')}>
            ⏹ Terminer la séance et faire le bilan
          </button>
        )
      ))

  return (
    <section className="coach" aria-labelledby="coach-title">
      <div className="coach-head">
        <h2 className="section-title" id="coach-title">{t('Votre séance du jour', 'Ta séance du jour')}</h2>
        <span className="coach-meta">{doneItems}/{plan.length} · {minutes} min</span>
      </div>
      {plan1 && next && <p className="coach-plan small">📌 {t('Votre plan', 'Ton plan')} : {plan1}</p>}

      {phase === 'goal' ? (
        <div className="srl-card" role="group" aria-labelledby="goal-q">
          <p className="srl-q" id="goal-q"><strong>{t('Votre point du jour ?', 'Ton point du jour ?')}</strong> <span className="muted small">Un seul, celui qui compte le plus aujourd’hui.</span></p>
          <div className="srl-options">
            {goals.map((o) => (
              <button key={o.key} type="button" className="srl-opt" onClick={() => pickGoal(o)}>
                🎯 {chordText(o.text, label)}
                {o.again && <small>pas encore atteint la dernière fois</small>}
              </button>
            ))}
          </div>
          <button type="button" className="btn btn-ghost small" onClick={skipGoal}>Passer et commencer</button>
        </div>
      ) : (
        next && (
          <button className="btn btn-primary btn-big coach-start" onClick={start}>
            ▶ {doneItems ? 'Reprendre ma séance' : 'Commencer ma séance'} ({minutes} min)
          </button>
        )
      )}

      {!next && closing}

      {entry?.goal && entry.goalText && (
        <p className="coach-goal small">🎯 Point du jour : <strong>{chordText(entry.goalText, label)}</strong></p>
      )}

      <ol className="coach-list">
        {plan.map((item) => (
          <li key={item.id}>
            <button className={`coach-item${item.done ? ' done' : ''}${item.goal ? ' goal' : ''}`} onClick={() => { setSession(true); navigate(...item.nav) }}>
              <span className="coach-check" aria-hidden="true">{item.done ? '✓' : item.goal ? '🎯' : ''}</span>
              <span className="coach-body">
                <strong>
                  <span className="visually-hidden">{item.done ? 'Fait : ' : 'À faire : '}{item.goal ? 'point du jour, ' : ''}</span>
                  {title(item)}
                </strong>
                <small>{chordText(item.detail, label)}</small>
              </span>
              <span className="coach-min">{item.minutes} min</span>
            </button>
          </li>
        ))}
      </ol>

      {next && closing}
    </section>
  )
}

const MET = [['oui', 'Atteint'], ['partiel', 'En partie'], ['non', 'Pas encore']]
const FEEL = [['facile', 'Facile'], ['juste', 'Juste bien'], ['dur', 'Difficile']]

// Après : bilan en 2 ou 3 touchers (point du jour atteint ? ce qui a accroché, ressenti). Chaque réponse est
// enregistrée tout de suite ; la séance de demain s'en sert (coach.js, buildPlan).
function Bilan({ plan, entry, onClose, allDone }) {
  const { saveJournal } = useProgress()
  const { label } = useSettings()
  const t = useAddress()
  const opts = snagOptions(plan)
  const askMet = !!entry?.goal
  const [step, setStep] = useState(askMet ? 'met' : 'snag')
  const [ans, setAns] = useState({ met: entry?.met, snag: entry?.snag, feel: entry?.feel })
  const answer = (k, v, nextStep) => {
    setAns((a) => ({ ...a, [k]: v }))
    saveJournal({ [k]: v })
    setStep(nextStep)
  }
  const pair = (k) => k.split('|').map(label).join(' ↔ ')
  const total = askMet ? 3 : 2
  const n = step === 'met' ? 1 : step === 'snag' ? (askMet ? 2 : 1) : step === 'feel' ? total : total

  if (step === 'done') {
    const e = { ...entry, ...ans }
    return (
      <div className="srl-card" aria-live="polite">
        <p className="good-text"><strong>✓ Bilan noté</strong></p>
        <p className="small">{nextStepText(e, label, t)}</p>
        {allDone && <p className="small muted">{t('Séance terminée. Revenez demain : la régularité fait tout.', 'Séance terminée. Reviens demain : la régularité fait tout.')}</p>}
      </div>
    )
  }

  return (
    <div className="srl-card" aria-live="polite">
      <div className="srl-head">
        <strong>{allDone ? `Séance terminée : bilan en ${total} touchers` : 'Bilan de la séance'}</strong>
        <span className="coach-meta">{n}/{total}</span>
      </div>

      {step === 'met' && (
        <div role="group" aria-labelledby="bilan-met">
          <p className="srl-q" id="bilan-met">{t('Votre point du jour', 'Ton point du jour')} : <strong>{chordText(entry.goalText || '', label)}</strong></p>
          <div className="srl-row">
            {MET.map(([v, l]) => (
              <button key={v} type="button" className="srl-opt" aria-pressed={ans.met === v} onClick={() => answer('met', v, 'snag')}>{l}</button>
            ))}
          </div>
        </div>
      )}

      {step === 'snag' && (
        <div role="group" aria-labelledby="bilan-snag">
          <p className="srl-q" id="bilan-snag">Qu’est-ce qui a le plus accroché ?</p>
          <div className="srl-row">
            {opts.pairs.map((p) => (
              <button key={p.value} type="button" className="srl-opt" aria-pressed={ans.snag === p.value} onClick={() => answer('snag', p.value, 'feel')}>
                Le changement {pair(p.value.slice(5))}
              </button>
            ))}
            {opts.rhythm && (
              <button type="button" className="srl-opt" aria-pressed={ans.snag === opts.rhythm.value} onClick={() => answer('snag', opts.rhythm.value, 'feel')}>
                Le rythme « {opts.rhythm.name} »
              </button>
            )}
          </div>
          {opts.chords.length > 0 && (
            <div className="srl-chords" role="group" aria-label="Un accord précis">
              <span className="small muted">Un accord :</span>
              {opts.chords.map((c) => (
                <button key={c} type="button" className="chip" aria-pressed={ans.snag === `chord:${c}`} onClick={() => answer('snag', `chord:${c}`, 'feel')}>{label(c)}</button>
              ))}
            </div>
          )}
          <div className="srl-row">
            <button type="button" className="srl-opt" aria-pressed={ans.snag === 'none'} onClick={() => answer('snag', 'none', 'feel')}>Rien de spécial</button>
          </div>
        </div>
      )}

      {step === 'feel' && (
        <div role="group" aria-labelledby="bilan-feel">
          <p className="srl-q" id="bilan-feel">Et cette séance, c’était…</p>
          <div className="srl-row">
            {FEEL.map(([v, l]) => (
              <button key={v} type="button" className="srl-opt" aria-pressed={ans.feel === v} onClick={() => answer('feel', v, 'done')}>{l}</button>
            ))}
          </div>
        </div>
      )}

      {!allDone && (
        <button type="button" className="btn btn-ghost small" onClick={onClose}>Plus tard</button>
      )}
    </div>
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
          {next.goal ? '🎯 ' : ''}Suivant : {title(next)} →
        </button>
      ) : (
        <button className="session-next" onClick={() => { close(); navigate('accueil') }}>Séance terminée : le bilan →</button>
      )}
      <button className="session-close" onClick={close} aria-label="Masquer le bandeau de séance">✕</button>
    </div>
  )
}
