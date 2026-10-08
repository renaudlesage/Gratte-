// Synchronisation optionnelle de la progression entre appareils via Supabase.
// Inactive tant que VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY ne sont pas définies :
// l'appli reste alors 100 % locale. La librairie n'est chargée que si la synchro est configurée.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { mergeStates, normalizeState } from './merge.js'

const env = import.meta.env || {}
const URL = env.VITE_SUPABASE_URL
const KEY = env.VITE_SUPABASE_ANON_KEY
export const syncConfigured = !!(URL && KEY)

const TABLE = 'gratte_progress'
let clientPromise = null

function getClient() {
  if (!syncConfigured) return Promise.resolve(null)
  if (!clientPromise) {
    clientPromise = import('@supabase/supabase-js').then(({ createClient }) =>
      createClient(URL, KEY, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'pkce', storageKey: 'gratte.auth' },
      }),
    )
  }
  return clientPromise
}

export function useSync(state, setState) {
  const [user, setUser] = useState(null)
  const [status, setStatus] = useState(syncConfigured ? 'idle' : 'off') // off | idle | syncing | ok | error
  const [error, setError] = useState('')
  const [lastSync, setLastSync] = useState(null)
  const stateRef = useRef(state)
  stateRef.current = state
  const lastPushed = useRef('')
  const busy = useRef(false)

  useEffect(() => {
    if (!syncConfigured) return undefined
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

  const syncNow = useCallback(async () => {
    if (!user || busy.current) return
    busy.current = true
    setStatus('syncing')
    try {
      const sb = await getClient()
      const { data, error: e1 } = await sb.from(TABLE).select('data').eq('user_id', user.id).maybeSingle()
      if (e1) throw e1
      const merged = mergeStates(stateRef.current, data?.data)
      const json = JSON.stringify(normalizeState(merged))
      if (json !== JSON.stringify(normalizeState(stateRef.current))) setState((cur) => mergeStates(cur, data?.data))
      if (json !== JSON.stringify(normalizeState(data?.data))) {
        const { error: e2 } = await sb.from(TABLE).upsert({ user_id: user.id, data: merged, updated_at: new Date().toISOString() })
        if (e2) throw e2
      }
      lastPushed.current = json
      setError('')
      setStatus('ok')
      setLastSync(new Date())
    } catch (e) {
      setError(e?.message || String(e))
      setStatus('error')
    } finally {
      busy.current = false
    }
  }, [user, setState])

  // À la connexion et au retour sur l'appli
  useEffect(() => {
    if (!user) return undefined
    syncNow()
    const onFocus = () => document.visibilityState === 'visible' && syncNow()
    document.addEventListener('visibilitychange', onFocus)
    return () => document.removeEventListener('visibilitychange', onFocus)
  }, [user, syncNow])

  // Après une modification locale (regroupée sur 3 s)
  useEffect(() => {
    if (!user) return undefined
    const json = JSON.stringify(normalizeState(state))
    if (json === lastPushed.current) return undefined
    const t = setTimeout(syncNow, 3000)
    return () => clearTimeout(t)
  }, [state, user, syncNow])

  const sendLink = useCallback(async (email) => {
    const sb = await getClient()
    const { error: e } = await sb.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin + window.location.pathname },
    })
    if (e) throw e
  }, [])

  const verifyCode = useCallback(async (email, token) => {
    const sb = await getClient()
    const { error: e } = await sb.auth.verifyOtp({ email, token, type: 'email' })
    if (e) throw e
  }, [])

  const signOut = useCallback(async () => {
    const sb = await getClient()
    await sb.auth.signOut()
    setStatus('idle')
    lastPushed.current = ''
  }, [])

  return useMemo(
    () => ({ configured: syncConfigured, user, status, error, lastSync, syncNow, sendLink, verifyCode, signOut }),
    [user, status, error, lastSync, syncNow, sendLink, verifyCode, signOut],
  )
}
