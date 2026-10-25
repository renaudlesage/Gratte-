import { useState } from 'react'
import { useAccess, SECTIONS } from '../lib/access.jsx'
import { LESSONS } from '../data/lessons.js'
import { TABS } from '../data/tabs.js'
import { SONGS } from '../data/songs.js'

// Rejoindre une classe (élève) : code de classe + prénom + code secret à 4 chiffres
export function JoinClass({ compact }) {
  const { join } = useAccess()
  const [code, setCode] = useState('')
  const [prenom, setPrenom] = useState('')
  const [pin, setPin] = useState('')
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)
  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    setMsg('')
    try {
      await join(code, prenom, pin)
    } catch (err) {
      setMsg(err.message)
    } finally {
      setBusy(false)
    }
  }
  return (
    <form className={`join-form${compact ? ' compact' : ''}`} onSubmit={submit}>
      <label className="field">
        <span>Code de la classe</span>
        <input id="join-code" className="input code-input" value={code} maxLength={6} autoCapitalize="characters" autoComplete="off" onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))} placeholder="ABC123" />
      </label>
      <label className="field">
        <span>Ton prénom</span>
        <input id="join-prenom" className="input" value={prenom} maxLength={40} autoComplete="given-name" onChange={(e) => setPrenom(e.target.value)} />
      </label>
      <label className="field">
        <span>Ton code secret (4 chiffres, à retenir)</span>
        <input id="join-pin" className="input code-input" type="password" inputMode="numeric" maxLength={4} autoComplete="off" value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))} />
      </label>
      <button className="btn btn-primary" disabled={busy || code.length < 6 || !prenom.trim() || pin.length !== 4}>{busy ? 'Connexion…' : 'Rejoindre la classe'}</button>
      {msg && <p className="error small" role="alert">{msg}</p>}
      <p className="muted small">La première fois, tu choisis ton code secret. Sur un autre appareil, tape le même prénom et le même code.</p>
    </form>
  )
}

// Quitter le mode élève (code de sortie connu du prof)
export function LeaveClass() {
  const { leave } = useAccess()
  const [open, setOpen] = useState(false)
  const [pin, setPin] = useState('')
  const [msg, setMsg] = useState('')
  if (!open) return <button className="btn btn-ghost small" onClick={() => setOpen(true)}>Quitter le mode élève</button>
  return (
    <form className="lock-form" onSubmit={async (e) => { e.preventDefault(); try { await leave(pin) } catch (err) { setMsg(err.message); setPin('') } }}>
      <label htmlFor="leave-pin" className="small">Code de sortie (demande-le à ton prof)</label>
      <input id="leave-pin" className="input lock-input" type="password" inputMode="numeric" maxLength={4} autoFocus value={pin} onChange={(e) => { setPin(e.target.value.replace(/\D/g, '')); setMsg('') }} />
      <button className="btn small btn-primary" disabled={pin.length !== 4}>Quitter</button>
      <button type="button" className="btn btn-ghost small" onClick={() => setOpen(false)}>Annuler</button>
      {msg && <span className="error small" role="alert">{msg}</span>}
    </form>
  )
}

// Accueil de l'élève : ce que le prof a activé, avec un raccourci vers chaque contenu
export function StudentHome({ navigate }) {
  const { student, error, refresh } = useAccess()
  const items = new Set(student.items || [])
  const lessons = LESSONS.filter((l) => items.has('lecon:' + l.id))
  const tabs = TABS.filter((t) => items.has('tab:' + t.id))
  const songs = SONGS.filter((s) => items.has('chanson:' + s.id))
  const sections = SECTIONS.filter(([id]) => items.has(id))
  const scores = student.scores || []
  const go = (id) => {
    const [tab, sub] = id.split('.')
    if (tab === 'pratique') navigate('pratique', { mode: sub })
    else if (tab === 'outils') navigate('outils', { tool: sub })
    else navigate(tab)
  }
  const empty = !lessons.length && !tabs.length && !songs.length && !sections.length && !scores.length
  return (
    <div className="student-home">
      <section className="hero">
        <h1>Bonjour {student.prenom} !</h1>
        <p className="muted">Classe : <strong>{student.classe}</strong></p>
      </section>
      {error && <p className="error">{error}</p>}
      {empty && <p className="muted">Ton prof n’a encore rien activé. Les leçons et les morceaux apparaîtront ici au fur et à mesure.</p>}
      {lessons.length > 0 && (
        <>
          <h3 className="section-title">Mes leçons</h3>
          <div className="chips">{lessons.map((l) => <button key={l.id} className="chip" onClick={() => navigate('lecons', { id: l.id })}>{l.title}</button>)}</div>
        </>
      )}
      {(tabs.length > 0 || scores.length > 0) && (
        <>
          <h3 className="section-title">Mes partitions</h3>
          <div className="chips">
            {tabs.map((t) => <button key={t.id} className="chip" onClick={() => navigate('pratique', { mode: 'tabs', tab: t.id })}>{t.title}</button>)}
            {scores.map((s) => <button key={s.id} className="chip" onClick={() => navigate('pratique', { mode: 'tabs' })}>{s.title}</button>)}
          </div>
        </>
      )}
      {songs.length > 0 && (
        <>
          <h3 className="section-title">Mes chansons</h3>
          <div className="chips">{songs.map((s) => <button key={s.id} className="chip" onClick={() => navigate('chansons', { song: s.id })}>{s.title}</button>)}</div>
        </>
      )}
      {sections.length > 0 && (
        <>
          <h3 className="section-title">Exercices et outils</h3>
          <div className="chips">{sections.map(([id, name]) => <button key={id} className="chip" onClick={() => go(id)}>{name}</button>)}</div>
        </>
      )}
      <button className="btn btn-ghost small" onClick={refresh}>↻ Vérifier les nouveautés</button>
    </div>
  )
}
