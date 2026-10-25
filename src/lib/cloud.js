// Client Supabase partagé (projet « applis privées » : tables préfixées gratte_).
// Les variables VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY remplacent les valeurs par défaut.
// La clé publishable est publique par nature : la sécurité repose sur les règles RLS et les fonctions RPC.
const env = import.meta.env || {}
export const SB_URL = env.VITE_SUPABASE_URL || 'https://bmuqddnaqktjhdechguo.supabase.co'
export const SB_KEY = env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_BwByocDk7r-0A25oqUdh9Q_QGXdM_9n'
export const cloudConfigured = !!(SB_URL && SB_KEY)

let clientPromise = null
export function getClient() {
  if (!cloudConfigured) return Promise.resolve(null)
  if (!clientPromise) {
    clientPromise = import('@supabase/supabase-js').then(({ createClient }) =>
      createClient(SB_URL, SB_KEY, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'pkce', storageKey: 'gratte.auth' },
      }),
    ).catch(() => {
      // Bibliothèque non chargée (hors ligne au premier lancement…) : on réessaiera plus tard
      clientPromise = null
      return null
    })
  }
  return clientPromise
}

// Appel d'une fonction RPC ; renvoie les données ou lève une erreur lisible
export async function rpc(name, args) {
  const sb = await getClient()
  if (!sb) throw new Error('Connexion au serveur indisponible.')
  const { data, error } = await sb.rpc(name, args)
  if (error) throw new Error(error.message)
  if (data && data.error) throw new Error(data.error)
  return data
}
