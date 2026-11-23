import { useMemo, useRef, useState } from 'react'
import ChordDiagram from './ChordDiagram.jsx'
import { getChord } from '../data/chords.js'
import { STRING_NAMES, strum } from '../lib/audio.js'
import { today, useProgress } from '../lib/progress.jsx'
import { useSettings } from '../lib/settings.jsx'
import { compareShape, cueFor, daysBetween, nextDueAfter, planRecall, practiceAnyway, recallStats, RECALL_TYPE, SESSION_MAX } from '../lib/recall.js'
import './recall.css'

// Pratique de récupération : on voit le NOM de l'accord, on reconstitue la forme de mémoire.
// Planification espacée (lib/recall.js), retour corde par corde, puis le vrai diagramme + le son + une phrase-repère.

const N_FRETS = 5
const MAX_RETRIES = 2
const EMPTY = [0, 0, 0, 0, 0, 0]
const stringName = (s) => `Corde de ${STRING_NAMES[s]}`

const safeLabel = (settings) => (id) => (settings ? settings.label(id) : id)

function play(frets) {
  try {
    strum(frets)
  } catch {
    /* audio indisponible */
  }
}

export function describeString(r) {
  switch (r.status) {
    case 'ok':
      return 'juste'
    case 'wrong-fret':
      return `mauvaise case (case ${r.given}, il fallait la case ${r.expected})`
    case 'missing':
      return `devrait être appuyée en case ${r.expected}`
    case 'should-open':
      return 'devrait être à vide'
    case 'should-mute':
      return 'devrait être étouffée'
    default:
      return ''
  }
}

// Manche vide interactif : rangée du haut = à vide ○ / étouffée ×, puis N_FRETS cases.
export function RecallBoard({ value, onChange, result = null, disabled = false }) {
  const settings = useSettings()
  const lefty = !!settings?.lefty
  const order = lefty ? [5, 4, 3, 2, 1, 0] : [0, 1, 2, 3, 4, 5]
  const byString = result ? Object.fromEntries(result.strings.map((r) => [r.string, r])) : {}

  const setString = (s, v) => {
    const next = [...value]
    next[s] = v
    onChange(next)
  }
  const tapTop = (s) => setString(s, value[s] === 0 ? -1 : value[s] === -1 ? 0 : -1)
  const tapFret = (s, f) => setString(s, value[s] === f ? 0 : f)

  return (
    <div className={`rc-board${result ? ' is-checked' : ''}${lefty ? ' is-lefty' : ''}`} role="group" aria-label="Manche : placez les doigts">
      <div className="rc-grid" style={{ '--rc-rows': N_FRETS }}>
        {/* Rangée du haut : à vide / étouffée */}
        <span className="rc-fretnum" aria-hidden="true" />
        {order.map((s) => {
          const v = value[s]
          const r = byString[s]
          const muted = v === -1
          return (
            <button
              key={`t${s}`}
              type="button"
              className={`rc-top${r ? ` st-${r.status}` : ''}`}
              aria-label={`${stringName(s)}, étouffée`}
              aria-pressed={muted}
              disabled={disabled}
              onClick={() => tapTop(s)}
            >
              <span aria-hidden="true">{v === 0 ? '○' : v === -1 ? '×' : ''}</span>
              {r && r.status !== 'ok' && r.expected <= 0 && (
                <span className="rc-expect" aria-hidden="true">{r.expected === 0 ? '○' : '×'}</span>
              )}
            </button>
          )
        })}
        {/* Cases */}
        {Array.from({ length: N_FRETS }, (_, i) => i + 1).flatMap((f) => [
          <span key={`n${f}`} className="rc-fretnum" aria-hidden="true">
            {f}
          </span>,
          ...order.map((s) => {
            const on = value[s] === f
            const r = byString[s]
            const ghost = r && r.status !== 'ok' && r.expected === f
            const cls = ['rc-cell', f === 1 && 'is-first', on && 'is-on', r && on && `st-${r.status}`, ghost && 'is-ghost']
              .filter(Boolean)
              .join(' ')
            return (
              <button
                key={`c${s}-${f}`}
                type="button"
                className={cls}
                aria-label={`${stringName(s)}, case ${f}`}
                aria-pressed={on}
                disabled={disabled}
                onClick={() => tapFret(s, f)}
              >
                <span className="rc-string" aria-hidden="true" style={{ '--w': `${2.4 - s * 0.28}px` }} />
                {on && <span className="rc-dot" aria-hidden="true" />}
                {ghost && <span className="rc-ghost" aria-hidden="true" />}
              </button>
            )
          }),
        ])}
      </div>
      {result && (
        <div className="rc-marks" aria-hidden="true">
          <span />
          {order.map((s) => (
            <span key={`m${s}`} className={`rc-mark st-${byString[s].status}`}>
              {byString[s].status === 'ok' ? '✓' : '✗'}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

// Un accord à reconstituer : tentative d'abord, indice si besoin, puis correction + diagramme + son + phrase-repère.
// onFinish({ id, ok, logged }) est appelé par le bouton « Suivant ».
export function RecallItem({ chordId, onFinish, nextLabel = 'Suivant', retryNote = false }) {
  const settings = useSettings()
  const progress = useProgress()
  const label = safeLabel(settings)
  const chord = getChord(chordId)
  const [answer, setAnswer] = useState(EMPTY)
  const [hinted, setHinted] = useState(false)
  const [phase, setPhase] = useState('answer') // answer | checked | revealed
  const [result, setResult] = useState(null)
  const statsRef = useRef(null)
  if (!statsRef.current) statsRef.current = recallStats(progress?.activity)[chordId] || null

  if (!chord) return null
  const name = label(chordId)
  const cue = cueFor(chordId, label)

  const log = (ok) => {
    const value = ok && !hinted ? 1 : 0
    progress?.logActivity(RECALL_TYPE, chordId, value)
    return value
  }

  const verify = () => {
    const r = compareShape(chord.frets, answer)
    setResult(r)
    setPhase('checked')
    log(r.ok)
  }
  const reveal = () => {
    setPhase('revealed')
    log(false)
  }

  const done = phase !== 'answer'
  const success = phase === 'checked' && result?.ok
  const logged = success && !hinted ? 1 : 0
  const next = nextDueAfter(statsRef.current, logged === 1, today())

  let summary = ''
  if (phase === 'checked') {
    if (result.ok) summary = hinted ? `Juste, avec l’indice : ${name}. On le reverra sans indice.` : `Bravo, c’est juste : ${name}.`
    else {
      const wrong = result.strings.filter((r) => r.status !== 'ok').map((r) => `${stringName(r.string)} : ${describeString(r)}.`)
      summary = `${result.okCount} cordes justes sur 6. ${wrong.join(' ')}`
    }
  } else if (phase === 'revealed') summary = `Voici ${name}. Regarde la forme, écoute-la, puis on le redemandera.`

  return (
    <div className="rc-item">
      <p className="rc-prompt">
        <span className="rc-prompt-lead">Reconstitue de mémoire</span>
        <span className="rc-name">{name}</span>
        {retryNote && <span className="rc-retry">deuxième chance</span>}
      </p>

      <RecallBoard value={answer} onChange={setAnswer} result={phase === 'checked' ? result : null} disabled={done} />

      {!done && (
        <>
          <p className="rc-help muted">Touchez une case pour poser un doigt, la rangée du haut pour ○ à vide ou × étouffée.</p>
          {hinted && cue && <p className="rc-hint">Indice : {cue.replace(/^[^=]+= /, '')}</p>}
          <div className="rc-actions">
            <button type="button" className="btn btn-primary" onClick={verify}>
              Vérifier
            </button>
            {!hinted && cue ? (
              <button type="button" className="btn btn-ghost" onClick={() => setHinted(true)}>
                Un indice
              </button>
            ) : (
              <button type="button" className="btn btn-ghost" onClick={reveal}>
                Je ne sais plus
              </button>
            )}
          </div>
        </>
      )}

      <p className={`rc-feedback${success ? ' is-ok' : done ? ' is-ko' : ''}`} aria-live="polite" role="status">
        {summary}
      </p>

      {done && (
        <div className="rc-reveal">
          <ChordDiagram chord={chord} size={112} />
          <div className="rc-reveal-text">
            {cue && <p className="rc-cue">{cue}</p>}
            <div className="rc-listen">
              <button type="button" className="btn small" onClick={() => play(chord.frets)}>
                ▶ Écouter {name}
              </button>
              {phase === 'checked' && !result.ok && (
                <button type="button" className="btn small btn-ghost" onClick={() => play(answer)}>
                  ▶ Ta version
                </button>
              )}
            </div>
            <p className="rc-next muted">
              {next.inDays === 0 ? 'À revoir dès la prochaine série.' : `Prochaine révision dans ${next.inDays} jour${next.inDays > 1 ? 's' : ''}.`}
            </p>
          </div>
        </div>
      )}

      {done && (
        <div className="rc-actions">
          <button type="button" className="btn btn-primary" onClick={() => onFinish?.({ id: chordId, ok: logged === 1, logged })}>
            {nextLabel}
          </button>
        </div>
      )}
    </div>
  )
}

// Série de rappel : 5 accords au plus, choisis par la planification espacée ; les ratés reviennent en fin de série.
export default function ChordRecall({ knownChords: knownProp = [] }) {
  const settings = useSettings()
  const progress = useProgress()
  const label = safeLabel(settings)
  const activity = progress?.activity || []
  const [session, setSession] = useState(null) // { queue, pos, tries: {id: [0|1…]}, retry: {id: n} }
  const [round, setRound] = useState(0)

  const knownKey = knownProp.join('|')
  const knownChords = useMemo(() => knownProp.filter((id) => getChord(id)), [knownKey]) // eslint-disable-line react-hooks/exhaustive-deps
  const plan = useMemo(() => planRecall(knownChords, activity, today()), [knownChords, activity])

  const start = (ids) => {
    setSession({ queue: ids, pos: 0, tries: {}, retry: {} })
    setRound((r) => r + 1)
  }

  const finishItem = ({ id, ok }) => {
    setSession((s) => {
      const tries = { ...s.tries, [id]: [...(s.tries[id] || []), ok ? 1 : 0] }
      const retry = { ...s.retry }
      let queue = s.queue
      if (!ok && (retry[id] || 0) < MAX_RETRIES) {
        retry[id] = (retry[id] || 0) + 1
        // Réinsérer plus loin dans la série (après au moins un autre accord s'il en reste)
        const rest = queue.length - (s.pos + 1)
        const at = Math.min(queue.length, s.pos + 1 + Math.max(1, Math.min(2, rest)))
        queue = [...queue.slice(0, at), id, ...queue.slice(at)]
      }
      return { queue, pos: s.pos + 1, tries, retry }
    })
  }

  if (!knownChords.length) {
    return (
      <section className="rc card">
        <h2 className="rc-title">Rappel des accords</h2>
        <p className="muted">Apprenez un premier accord dans le parcours : il viendra ici pour être retrouvé de mémoire.</p>
      </section>
    )
  }

  // Écran d'accueil
  if (!session) {
    const n = plan.due.length
    const soon = plan.upcoming[0]
    return (
      <section className="rc card">
        <h2 className="rc-title">Rappel des accords</h2>
        <p>On vous donne le nom, vous posez les doigts de mémoire. C’est plus dur que de regarder un diagramme : c’est justement ce qui fait retenir.</p>
        {n > 0 ? (
          <>
            <p className="muted">
              {n} accord{n > 1 ? 's' : ''} à retrouver aujourd’hui (série de {SESSION_MAX} au plus).
            </p>
            <div className="rc-actions">
              <button type="button" className="btn btn-primary" onClick={() => start(plan.due)}>
                Commencer
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="muted">
              Tout est à jour.
              {soon && ` Prochaine révision : ${label(soon.id)} dans ${soon.inDays} jour${soon.inDays > 1 ? 's' : ''}.`} Revenir trop tôt apporte moins que d’attendre un peu d’oubli.
            </p>
            {plan.upcoming.length > 0 && (
              <div className="rc-actions">
                <button type="button" className="btn" onClick={() => start(practiceAnyway(plan))}>
                  S’entraîner quand même
                </button>
              </div>
            )}
          </>
        )}
      </section>
    )
  }

  // Bilan de fin de série
  if (session.pos >= session.queue.length) {
    const stats = recallStats(activity)
    const ids = [...new Set(session.queue)]
    const first = ids.filter((id) => session.tries[id]?.[0] === 1).length
    return (
      <section className="rc card">
        <h2 className="rc-title">Série terminée</h2>
        <p>
          {first} sur {ids.length} retrouvé{first > 1 ? 's' : ''} du premier coup.
        </p>
        <ul className="rc-summary">
          {ids.map((id) => {
            const t = session.tries[id] || []
            const last = t[t.length - 1]
            const st = stats[id]
            const inDays = st?.due ? Math.max(0, daysBetween(today(), st.due)) : 0
            return (
              <li key={id} className={last ? 'is-ok' : 'is-ko'}>
                <span className="rc-sum-icon" aria-hidden="true">
                  {last ? '✓' : '✗'}
                </span>
                <strong>{label(id)}</strong>
                <span className="muted">
                  {last ? (t.length === 1 ? 'du premier coup' : `après ${t.length} essais`) : 'à retravailler'}
                  {' · '}
                  {inDays === 0 ? 'revient à la prochaine série' : `revu dans ${inDays} j`}
                </span>
              </li>
            )
          })}
        </ul>
        <div className="rc-actions">
          <button type="button" className="btn" onClick={() => setSession(null)}>
            Retour
          </button>
        </div>
      </section>
    )
  }

  const id = session.queue[session.pos]
  const distinct = new Set(session.queue).size
  const isRetry = (session.tries[id] || []).length > 0
  const k = [...new Set(session.queue)].indexOf(id) + 1
  return (
    <section className="rc card">
      <div className="rc-head">
        <h2 className="rc-title">Rappel des accords</h2>
        <span className="rc-count muted" aria-label={`Accord ${k} sur ${distinct}`}>
          {k} / {distinct}
        </span>
      </div>
      <RecallItem
        key={`${round}-${session.pos}`}
        chordId={id}
        retryNote={isRetry}
        onFinish={finishItem}
      />
    </section>
  )
}
