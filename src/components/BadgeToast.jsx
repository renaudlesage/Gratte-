import { useEffect, useRef, useState } from 'react'
import { useProgress } from '../lib/progress.jsx'
import { computeBadges } from '../lib/badges.js'

const KEY = 'gratte.badges.seen'
const read = () => {
  try {
    const v = JSON.parse(localStorage.getItem(KEY))
    return Array.isArray(v) ? v : null
  } catch {
    return null
  }
}
const save = (ids) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(ids))
  } catch {
    /* stockage indisponible */
  }
}

// Annonce un badge au moment où il est obtenu (au premier lancement, les badges déjà acquis sont notés sans bruit)
export default function BadgeToast({ navigate }) {
  const progress = useProgress()
  const [shown, setShown] = useState(null)
  const timer = useRef(null)
  const earned = computeBadges(progress).filter((b) => b.earned)
  const key = earned.map((b) => b.id).join(',')

  useEffect(() => {
    const seen = read()
    const ids = earned.map((b) => b.id)
    if (!seen) {
      save(ids)
      return
    }
    const fresh = earned.filter((b) => !seen.includes(b.id))
    if (!fresh.length) return
    save([...new Set([...seen, ...ids])])
    setShown(fresh[0])
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setShown(null), 6000)
  }, [key]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => () => clearTimeout(timer.current), [])

  return (
    <div className="toast-zone" role="status" aria-live="polite">
      {shown && (
        <button className="toast" onClick={() => { setShown(null); navigate('progres') }}>
          <span className="toast-icon" aria-hidden="true">{shown.icon}</span>
          <span>
            <strong>Badge obtenu : {shown.title}</strong>
            <small>{shown.desc} · voir mes progrès →</small>
          </span>
        </button>
      )}
    </div>
  )
}
