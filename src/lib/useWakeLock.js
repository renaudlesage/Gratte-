import { useEffect, useState } from 'react'

export const wakeLockSupported = () => typeof navigator !== 'undefined' && 'wakeLock' in navigator

// Garde l'écran allumé tant que l'appli est affichée.
// Le navigateur libère le verrou dès que l'appli passe en arrière-plan : on le reprend au retour.
export function useWakeLock(enabled) {
  const [active, setActive] = useState(false)

  useEffect(() => {
    if (!enabled || !wakeLockSupported()) {
      setActive(false)
      return undefined
    }
    let lock = null
    let cancelled = false

    const acquire = async () => {
      if (cancelled || document.visibilityState !== 'visible' || (lock && !lock.released)) return
      try {
        lock = await navigator.wakeLock.request('screen')
        setActive(true)
        lock.addEventListener('release', () => setActive(false))
      } catch {
        // Refus (économie d'énergie, cadre restreint…) : on réessaiera au prochain geste
        setActive(false)
      }
    }

    const onVisible = () => document.visibilityState === 'visible' && acquire()
    // Certains navigateurs n'acceptent la demande qu'après une interaction : on retente au toucher
    const onGesture = () => acquire()

    acquire()
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('pointerdown', onGesture, { passive: true })
    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('pointerdown', onGesture)
      lock?.release().catch(() => {})
      setActive(false)
    }
  }, [enabled])

  return active
}
