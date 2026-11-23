import { useCallback, useEffect, useMemo, useState } from 'react'
import { getClient } from '../lib/cloud.js'
import { useSettings } from '../lib/settings.jsx'
import { chordText } from '../lib/chordText.js'
import { lessonCounts } from '../lib/studentReport.js'
import { PROOF_LABEL } from '../lib/evidence.js'
import { LESSONS } from '../data/lessons.js'
import { PATTERNS } from '../data/patterns.js'

const PATTERN_NAME = Object.fromEntries(PATTERNS.map((p) => [p.id, p.name]))
const fmtWhen = (d) => (d ? new Date(d).toLocaleDateString('fr-BE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'jamais')
const fmtDay = (d) => (d ? new Date(d + 'T12:00:00').toLocaleDateString('fr-BE', { weekday: 'short', day: 'numeric', month: 'short' }) : '—')

// Progrès des élèves d'une classe : résumé envoyé par l'appli de chaque élève (gratte_students.progress).
// ✓ = objectif validé par l'appli (micro, défi minute, activité) ; ☐✓ = coché à la main par l'élève.
export default function ClassProgress({ cls, students, unlocks }) {
  const { label } = useSettings()
  const [data, setData] = useState(null) // Map id → { progress, progress_at }
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    const sb = await getClient()
    if (!sb) return setError('Connexion au serveur indisponible.')
    const { data: rows, error: e } = await sb.from('gratte_students').select('id,progress,progress_at').eq('class_id', cls.id)
    if (e) {
      setError(/progress/.test(e.message) ? 'Le suivi des progrès n’est pas encore installé sur le serveur (migration 003 à appliquer).' : e.message)
      setData(new Map())
      return
    }
    setError('')
    setData(new Map((rows || []).map((r) => [r.id, r])))
  }, [cls.id])
  useEffect(() => {
    load()
  }, [load])

  // Leçons activées : pour toute la classe + pour l'élève
  const lessonsFor = useMemo(() => {
    const classWide = new Set()
    const perStudent = new Map()
    for (const u of unlocks || []) {
      if (!u.item.startsWith('lecon:')) continue
      const id = u.item.slice(6)
      if (u.student_id === null) classWide.add(id)
      else {
        if (!perStudent.has(u.student_id)) perStudent.set(u.student_id, new Set())
        perStudent.get(u.student_id).add(id)
      }
    }
    return (sid) => LESSONS.filter((l) => classWide.has(l.id) || perStudent.get(sid)?.has(l.id))
  }, [unlocks])

  const ct = (s) => chordText(s, label)

  return (
    <div className="pp">
      <div className="pp-legend small" aria-label="Légende">
        <span><span className="pp-mark pp-proof" aria-hidden="true">✓</span> validé par l’appli</span>
        <span><span className="pp-mark pp-self" aria-hidden="true">☐✓</span> coché par l’élève</span>
        <span><span className="pp-mark pp-todo" aria-hidden="true">○</span> pas encore</span>
        <button className="btn btn-ghost small" onClick={load}>↻ Actualiser</button>
      </div>
      <p className="muted small">L’appli de chaque élève envoie un résumé quelques secondes après chaque progrès et à chaque ouverture (s’il est en ligne).</p>
      {error && <p className="error small">{error}</p>}
      {(!students || !data) && <p className="muted small">Chargement…</p>}
      {students && !students.length && <p className="muted small">Aucun élève dans cette classe.</p>}

      {students && data && (
        <ul className="pp-list">
          {students.map((st) => {
            const row = data.get(st.id)
            const sum = row?.progress
            const lessons = lessonsFor(st.id)
            const counts = lessons.map((l) => ({ l, ...lessonCounts(sum, l) }))
            const tot = counts.reduce((a, c) => ({ preuve: a.preuve + c.preuve, coche: a.coche + c.coche, total: a.total + c.total }), { preuve: 0, coche: 0, total: 0 })
            return (
              <li key={st.id}>
                <details className="pp-student">
                  <summary>
                    <span className="pp-name">{st.prenom}</span>
                    {sum ? (
                      <span className="pp-sum">
                        <span className="pp-proof">✓ {tot.preuve}</span>
                        <span className="pp-self">☐✓ {tot.coche}</span>
                        <span className="muted">/ {tot.total}</span>
                      </span>
                    ) : (
                      <span className="muted small">pas de données</span>
                    )}
                    <Bar {...tot} />
                    <span className="pp-meta muted small">
                      {sum ? `${sum.days || 0} j de pratique · ` : ''}vu {fmtWhen(st.last_seen)}
                    </span>
                  </summary>
                  <StudentDetail sum={sum} at={row?.progress_at} counts={counts} ct={ct} label={label} />
                </details>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

function Bar({ preuve, coche, total }) {
  if (!total) return null
  return (
    <span className="pp-bar" role="img" aria-label={`${preuve} validés par l’appli, ${coche} cochés par l’élève, sur ${total}`}>
      <span className="pp-bar-proof" style={{ width: `${(100 * preuve) / total}%` }} />
      <span className="pp-bar-self" style={{ width: `${(100 * coche) / total}%` }} />
    </span>
  )
}

function StudentDetail({ sum, at, counts, ct, label }) {
  if (!sum) {
    return <p className="muted small pp-body">Aucun résumé reçu : l’élève doit ouvrir l’appli (connecté à Internet) après la mise à jour.</p>
  }
  const pairs = Object.entries(sum.pairs || {}).sort((a, b) => b[1] - a[1]).slice(0, 6)
  const rythme = Object.entries(sum.rythme || {}).sort((a, b) => b[1] - a[1])
  const tempo = Object.entries(sum.tempo || {}).sort((a, b) => b[1] - a[1])
  return (
    <div className="pp-body">
      <p className="small pp-practice">
        <strong>{sum.days || 0}</strong> jour{sum.days > 1 ? 's' : ''} de pratique · <strong>{sum.week || 0}</strong> sur les 7 derniers jours
        {sum.streak > 0 && <> · série de <strong>{sum.streak}</strong> j</>}
        <br />
        <span className="muted">Dernier jour joué : {fmtDay(sum.last)} · résumé reçu {fmtWhen(at)}</span>
      </p>

      {!counts.length && <p className="muted small">Aucune leçon activée pour cet élève.</p>}
      {counts.map(({ l, preuve, coche, total }) => {
        const met = sum.lessons?.[l.id] || {}
        return (
          <details key={l.id} className="pp-lesson">
            <summary>
              <span className="pp-lesson-title">{LESSONS.indexOf(l) + 1}. {ct(l.title)}</span>
              <span className="pp-sum small">
                {preuve > 0 && <span className="pp-proof">✓ {preuve}</span>}
                {coche > 0 && <span className="pp-self">☐✓ {coche}</span>}
                <span className="muted">{preuve + coche}/{total}</span>
              </span>
            </summary>
            <ul className="pp-tasks">
              {l.tasks.map((t) => {
                const s = met[t.id]
                const cls = s === 'preuve' ? 'pp-proof' : s === 'coche' ? 'pp-self' : 'pp-todo'
                const title = s === 'preuve' ? PROOF_LABEL[t.auto?.type] || 'validé par l’appli' : s === 'coche' ? (t.auto ? 'coché par l’élève (sans preuve de l’appli)' : 'coché par l’élève') : 'pas encore'
                return (
                  <li key={t.id} title={title}>
                    <span className={`pp-mark ${cls}`} aria-label={title}>{s === 'preuve' ? '✓' : s === 'coche' ? '☐✓' : '○'}</span>
                    <span className={s ? '' : 'muted'}>{ct(t.label)}</span>
                  </li>
                )
              })}
            </ul>
          </details>
        )
      })}

      {(pairs.length > 0 || rythme.length > 0 || tempo.length > 0) && (
        <div className="pp-records small">
          {pairs.length > 0 && (
            <p><span className="muted">Défi minute :</span> {pairs.map(([k, v]) => `${k.split('|').map(label).join(' ↔ ')} ${v}`).join(' · ')}</p>
          )}
          {rythme.length > 0 && (
            <p><span className="muted">Rythme au micro :</span> {rythme.map(([k, v]) => `${PATTERN_NAME[k] || k} ${v} %`).join(' · ')}</p>
          )}
          {tempo.length > 0 && (
            <p><span className="muted">Tempo réussi :</span> {tempo.map(([k, v]) => `${PATTERN_NAME[k] || k} ${v} BPM`).join(' · ')}</p>
          )}
        </div>
      )}
    </div>
  )
}
