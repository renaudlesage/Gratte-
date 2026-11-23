import { useEffect, useMemo, useRef } from 'react'
import { useAccess } from '../lib/access.jsx'
import { useProgress } from '../lib/progress.jsx'
import { rpc } from '../lib/cloud.js'
import { buildSummary } from '../lib/studentReport.js'

// Mode élève : envoie au prof un résumé de la progression (5 s après un changement, au retour sur l'appli
// et au retour du réseau). Silencieux : hors ligne, ou si le serveur n'a pas encore la fonction, on réessaiera.
// À monter sous AccessProvider ET ProgressProvider ; ne rend rien.
const SENT_KEY = 'gratte.student.pushed'
const readSent = () => {
  try {
    return localStorage.getItem(SENT_KEY) || ''
  } catch {
    return ''
  }
}
const writeSent = (v) => {
  try {
    localStorage.setItem(SENT_KEY, v)
  } catch {
    /* stockage indisponible : on renverra simplement plus souvent */
  }
}

export default function StudentSync() {
  const { mode, student } = useAccess()
  const progress = useProgress()
  const token = mode === 'eleve' ? student?.token : null

  const summary = useMemo(
    () => (token ? buildSummary(progress) : null),
    // Seuls ces champs entrent dans le résumé
    [token, progress.tasks, progress.bests, progress.rhythm, progress.days, progress.activity], // eslint-disable-line react-hooks/exhaustive-deps
  )
  const json = summary ? JSON.stringify(summary) : ''

  const latest = useRef({ token, json, summary })
  latest.current = { token, json, summary }
  const busy = useRef(false)

  const push = useRef(async () => {
    const { token: tk, json: js, summary: sm } = latest.current
    if (!tk || !sm || busy.current) return
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return
    const mark = tk + ':' + js
    if (readSent() === mark) return
    busy.current = true
    try {
      const ok = await rpc('gratte_student_push', { p_token: tk, p_summary: sm })
      if (ok) writeSent(mark)
    } catch {
      /* hors ligne ou migration 003 pas encore appliquée : on réessaiera */
    } finally {
      busy.current = false
    }
  }).current

  // 5 s après le dernier changement
  useEffect(() => {
    if (!token) return undefined
    const t = setTimeout(push, 5000)
    return () => clearTimeout(t)
  }, [token, json, push])

  // Retour sur l'appli, retour du réseau ; départ de l'appli : on envoie ce qui attend
  useEffect(() => {
    if (!token) return undefined
    const onVis = () => push()
    window.addEventListener('online', onVis)
    document.addEventListener('visibilitychange', onVis)
    return () => {
      window.removeEventListener('online', onVis)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [token, push])

  return null
}
