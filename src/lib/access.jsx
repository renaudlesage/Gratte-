import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { getClient, rpc } from './cloud.js'

// Accès selon le rôle :
// - libre  : personne n'est connecté, tout est accessible (usage personnel) ;
// - eleve  : seulement ce que le prof a activé (sections, leçons, partitions, chansons) ;
// - prof   : tout, plus le panneau de ses classes ;
// - admin  : tout, plus la gestion des profs et l'envoi de partitions.
const STUDENT_KEY = 'gratte.student'
const readStudent = () => {
  try {
    return JSON.parse(localStorage.getItem(STUDENT_KEY)) || null
  } catch {
    return null
  }
}
const saveStudent = (s) => {
  try {
    if (s) localStorage.setItem(STUDENT_KEY, JSON.stringify(s))
    else localStorage.removeItem(STUDENT_KEY)
  } catch {
    /* stockage indisponible */
  }
}

// Exercices et outils que le prof peut activer. Les leçons (lecon:id), partitions (tab:id, score:uuid) et
// chansons (chanson:id) s'activent une par une ; leur onglet apparaît dès qu'une est activée.
export const SECTIONS = [
  ['accords', 'Dictionnaire d’accords'],
  ['pratique.minute', 'Défi minute'],
  ['pratique.enchainement', 'Enchaînements'],
  ['pratique.rythmes', 'Rythmes'],
  ['pratique.arpeges', 'Arpèges'],
  ['pratique.oreille', 'Oreille'],
  ['outils.accordeur', 'Accordeur'],
  ['outils.metronome', 'Métronome'],
  ['outils.enregistrer', 'Enregistreur'],
]

const AccessContext = createContext(null)

export function AccessProvider({ children }) {
  const [student, setStudent] = useState(readStudent) // { token, prenom, classe, items[], scores[] }
  const [user, setUser] = useState(null)
  const [role, setRole] = useState(null) // 'admin' | 'prof' | null
  const [error, setError] = useState('')

  // Compte prof / super admin (connexion par e-mail, la même que la synchronisation)
  useEffect(() => {
    let unsub = () => {}
    let alive = true
    getClient().then((sb) => {
      if (!sb || !alive) return
      sb.auth.getSession().then(({ data }) => alive && setUser(data.session?.user ?? null))
      const { data } = sb.auth.onAuthStateChange((_e, session) => setUser(session?.user ?? null))
      unsub = () => data.subscription.unsubscribe()
    })
    return () => {
      alive = false
      unsub()
    }
  }, [])
  useEffect(() => {
    if (!user) {
      setRole(null)
      return
    }
    rpc('gratte_role').then(setRole).catch(() => setRole(null))
  }, [user])

  // Élève : ce qui est activé, rafraîchi au retour sur l'appli et toutes les 60 s
  const refresh = useCallback(async () => {
    const cur = readStudent()
    if (!cur?.token) return
    try {
      const st = await rpc('gratte_student_state', { p_token: cur.token })
      if (!st) {
        // Élève supprimé par le prof
        saveStudent(null)
        setStudent(null)
        setError('Ton accès à la classe a été retiré par ton prof.')
        return
      }
      const next = { ...cur, prenom: st.prenom, classe: st.classe, items: st.items, scores: st.scores, at: Date.now() }
      saveStudent(next)
      setStudent(next)
      setError('')
    } catch {
      /* hors ligne : on garde la dernière liste connue */
    }
  }, [])
  useEffect(() => {
    if (!student?.token) return undefined
    refresh()
    const onVis = () => document.visibilityState === 'visible' && refresh()
    document.addEventListener('visibilitychange', onVis)
    const t = setInterval(refresh, 60000)
    return () => {
      document.removeEventListener('visibilitychange', onVis)
      clearInterval(t)
    }
  }, [student?.token, refresh])

  const join = useCallback(async (code, prenom, pin) => {
    const r = await rpc('gratte_student_join', { p_code: code, p_prenom: prenom, p_pin: pin })
    const s = { token: r.token, prenom: r.prenom, classe: r.classe, items: [], scores: [] }
    saveStudent(s)
    setStudent(s)
    setError('')
    return s
  }, [])

  // Quitter le mode élève demande le code de sortie donné par le prof
  const leave = useCallback(async (exitPin) => {
    const cur = readStudent()
    if (cur?.token) {
      const ok = await rpc('gratte_student_leave', { p_token: cur.token, p_exit_pin: exitPin })
      if (!ok) throw new Error('Code de sortie incorrect : demande-le à ton prof.')
    }
    saveStudent(null)
    setStudent(null)
  }, [])

  const mode = student ? 'eleve' : role === 'admin' ? 'admin' : role === 'prof' ? 'prof' : 'libre'
  const items = useMemo(() => new Set(student?.items || []), [student])

  const value = useMemo(
    () => ({
      mode,
      student,
      user,
      role,
      error,
      join,
      leave,
      refresh,
      // Le contenu est-il accessible ? (en mode élève : seulement s'il a été activé)
      can: (item) => mode !== 'eleve' || items.has(item),
      // Une section contient-elle quelque chose d'activé ?
      canAny: (prefix) => mode !== 'eleve' || [...items].some((i) => i === prefix || i.startsWith(prefix + '.') || i.startsWith(prefix + ':')),
    }),
    [mode, student, user, role, error, join, leave, refresh, items],
  )
  return <AccessContext.Provider value={value}>{children}</AccessContext.Provider>
}

export const useAccess = () => useContext(AccessContext)
