import { useCallback, useEffect, useMemo, useState } from 'react'
import { getClient } from '../lib/cloud.js'
import { useAccess, SECTIONS } from '../lib/access.jsx'
import { useRemoteScores, imageToBase64 } from '../lib/scores.js'
import { readZipImages, parseName } from '../lib/scans.js'
import { LESSONS } from '../data/lessons.js'
import { TABS } from '../data/tabs.js'
import { SONGS } from '../data/songs.js'

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('fr-BE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'jamais')

// Panneau prof (classes, élèves, activations) et super admin (profs, partitions envoyées)
export default function ProfPanel() {
  const { role, user } = useAccess()
  const [tab, setTab] = useState('classes')
  if (!user || !role) {
    return <p className="muted">Ce panneau est réservé aux profs. Connectez-vous dans Réglages › Compte avec l’adresse e-mail enregistrée par le super admin.</p>
  }
  return (
    <div className="prof-panel">
      <p className="muted small">Connecté : <strong>{user.email}</strong> · {role === 'admin' ? 'super admin' : 'prof'}</p>
      {role === 'admin' && (
        <div className="segmented" role="radiogroup" aria-label="Panneau">
          {[['classes', 'Mes classes'], ['profs', 'Profs'], ['partitions', 'Partitions']].map(([id, name]) => (
            <button key={id} role="radio" aria-checked={tab === id} className={tab === id ? 'on' : ''} onClick={() => setTab(id)}>{name}</button>
          ))}
        </div>
      )}
      {tab === 'classes' && <Classes />}
      {role === 'admin' && tab === 'profs' && <Teachers />}
      {role === 'admin' && tab === 'partitions' && <PushScores />}
    </div>
  )
}

function useTable(build, deps) {
  const [rows, setRows] = useState(null)
  const [error, setError] = useState('')
  const reload = useCallback(async () => {
    const sb = await getClient()
    const { data, error: e } = await build(sb)
    if (e) setError(e.message)
    else {
      setError('')
      setRows(data || [])
    }
  }, deps) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    reload()
  }, [reload])
  return { rows, error, reload, setError }
}

function Classes() {
  const { user, role } = useAccess()
  const classes = useTable((sb) => sb.from('gratte_classes').select('*').order('created_at'), [])
  const [cur, setCur] = useState(null)
  const [name, setName] = useState('')
  const c = classes.rows?.find((x) => x.id === cur) || classes.rows?.[0]

  const create = async (e) => {
    e.preventDefault()
    const sb = await getClient()
    const { data, error } = await sb.from('gratte_classes').insert({ name: name.trim() }).select().single()
    if (error) return classes.setError(error.message)
    setName('')
    await classes.reload()
    setCur(data.id)
  }

  return (
    <div className="classes">
      <form className="row gap wrap" onSubmit={create}>
        <input id="class-name" className="input" placeholder="Nom de la nouvelle classe (ex. Guitare débutants)" value={name} maxLength={80} onChange={(e) => setName(e.target.value)} />
        <button className="btn btn-primary small" disabled={!name.trim()}>Créer la classe</button>
      </form>
      {classes.error && <p className="error small">{classes.error}</p>}
      {classes.rows && !classes.rows.length && <p className="muted">Créez votre première classe : vous obtiendrez un code à donner aux élèves.</p>}
      {classes.rows?.length > 0 && (
        <div className="chips">
          {classes.rows.map((x) => (
            <button key={x.id} className={`chip${x.id === c?.id ? ' on' : ''}`} onClick={() => setCur(x.id)}>
              {x.name}{role === 'admin' && x.owner !== user.id ? ' (autre prof)' : ''}
            </button>
          ))}
        </div>
      )}
      {c && <ClassDetail key={c.id} cls={c} onChange={classes.reload} />}
    </div>
  )
}

function ClassDetail({ cls, onChange }) {
  const students = useTable((sb) => sb.from('gratte_students').select('id,prenom,created_at,last_seen').eq('class_id', cls.id).order('prenom'), [cls.id])
  const unlocks = useTable((sb) => sb.from('gratte_unlocks').select('id,student_id,item').eq('class_id', cls.id), [cls.id])
  const [target, setTarget] = useState(null) // null = toute la classe, sinon id élève
  const [pin, setPin] = useState(cls.exit_pin)
  const [confirmDel, setConfirmDel] = useState(false)
  const { list: scores } = useRemoteScores()

  const onFor = useMemo(() => {
    const m = new Map()
    for (const u of unlocks.rows || []) {
      if (u.student_id === target || (target && u.student_id === null)) {
        if (!m.has(u.item) || u.student_id === target) m.set(u.item, u)
      }
    }
    return m
  }, [unlocks.rows, target])

  const toggle = async (item) => {
    const sb = await getClient()
    const row = onFor.get(item)
    if (row && row.student_id === target) {
      const { error } = await sb.from('gratte_unlocks').delete().eq('id', row.id)
      if (error) return unlocks.setError(error.message)
    } else if (!row) {
      const { error } = await sb.from('gratte_unlocks').insert({ class_id: cls.id, student_id: target, item })
      if (error) return unlocks.setError(error.message)
    } else return // activé pour toute la classe : on le gère depuis « Toute la classe »
    unlocks.reload()
  }

  const savePin = async () => {
    const sb = await getClient()
    const { error } = await sb.from('gratte_classes').update({ exit_pin: pin }).eq('id', cls.id)
    if (error) unlocks.setError(error.message)
    else onChange()
  }
  const removeStudent = async (id) => {
    const sb = await getClient()
    await sb.from('gratte_students').delete().eq('id', id)
    if (target === id) setTarget(null)
    students.reload()
    unlocks.reload()
  }
  const removeClass = async () => {
    const sb = await getClient()
    await sb.from('gratte_classes').delete().eq('id', cls.id)
    onChange()
  }

  const Box = ({ item, label }) => {
    const row = onFor.get(item)
    const inherited = row && row.student_id !== target
    return (
      <label className={`unlock${row ? ' on' : ''}${inherited ? ' inherited' : ''}`} title={inherited ? 'Activé pour toute la classe' : ''}>
        <input type="checkbox" checked={!!row} disabled={inherited} onChange={() => toggle(item)} />
        <span>{label}</span>
      </label>
    )
  }
  const tabGroups = [['cours', 'Morceaux de cours'], ['arquebusiers', 'Arquebusiers'], ['technique', 'Techniques'], ['gamme', 'Gammes et phrases'], ['mélodie', 'Mélodies']]

  return (
    <div className="class-detail">
      <div className="class-codes">
        <div>
          <span className="muted small">Code à donner aux élèves</span>
          <strong className="class-code">{cls.code}</strong>
        </div>
        <div>
          <span className="muted small">Code de sortie du mode élève</span>
          <span className="row gap">
            <input id="exit-pin" className="input lock-input" inputMode="numeric" maxLength={4} value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))} />
            {pin !== cls.exit_pin && <button className="btn small" disabled={pin.length !== 4} onClick={savePin}>Enregistrer</button>}
          </span>
        </div>
      </div>

      <h3 className="section-title">Élèves ({students.rows?.length ?? '…'})</h3>
      {students.rows && !students.rows.length && <p className="muted small">Aucun élève pour l’instant. Ils rejoignent la classe depuis l’accueil de l’appli avec le code {cls.code}.</p>}
      <ul className="student-list">
        {students.rows?.map((s) => (
          <li key={s.id}>
            <strong>{s.prenom}</strong>
            <span className="muted small">vu {fmtDate(s.last_seen)}</span>
            <button className="btn btn-ghost small" onClick={() => removeStudent(s.id)} aria-label={`Retirer ${s.prenom}`}>Retirer</button>
          </li>
        ))}
      </ul>

      <h3 className="section-title">Activer pour</h3>
      <div className="chips">
        <button className={`chip${target === null ? ' on' : ''}`} onClick={() => setTarget(null)}>Toute la classe</button>
        {students.rows?.map((s) => <button key={s.id} className={`chip${target === s.id ? ' on' : ''}`} onClick={() => setTarget(s.id)}>{s.prenom}</button>)}
      </div>
      {target && <p className="muted small">Les éléments grisés sont déjà activés pour toute la classe.</p>}
      {unlocks.error && <p className="error small">{unlocks.error}</p>}

      <details open>
        <summary>Leçons</summary>
        <div className="unlock-grid">{LESSONS.map((l, i) => <Box key={l.id} item={'lecon:' + l.id} label={`${i + 1}. ${l.title}`} />)}</div>
      </details>
      <details open>
        <summary>Exercices et outils</summary>
        <div className="unlock-grid">{SECTIONS.map(([id, name]) => <Box key={id} item={id} label={name} />)}</div>
      </details>
      <details>
        <summary>Partitions de l’appli</summary>
        {tabGroups.map(([k, name]) => (
          <div key={k}>
            <span className="chip-group-label">{name}</span>
            <div className="unlock-grid">{TABS.filter((t) => t.kind === k).map((t) => <Box key={t.id} item={'tab:' + t.id} label={t.title} />)}</div>
          </div>
        ))}
      </details>
      <details>
        <summary>Partitions envoyées ({scores.length})</summary>
        {!scores.length && <p className="muted small">Aucune pour l’instant : le super admin les envoie depuis son panneau.</p>}
        <div className="unlock-grid">{scores.map((s) => <Box key={s.id} item={'score:' + s.id} label={`${s.folder} · ${s.num != null ? s.num + ' – ' : ''}${s.title}`} />)}</div>
      </details>
      <details>
        <summary>Chansons</summary>
        <div className="unlock-grid">{SONGS.map((s) => <Box key={s.id} item={'chanson:' + s.id} label={s.title} />)}</div>
      </details>

      <div className="danger-zone">
        {confirmDel ? (
          <>
            <span>Supprimer la classe « {cls.name} », ses élèves et ses activations ?</span>
            <button className="btn small btn-danger" onClick={removeClass}>Supprimer</button>
            <button className="btn btn-ghost small" onClick={() => setConfirmDel(false)}>Annuler</button>
          </>
        ) : (
          <button className="btn btn-ghost small" onClick={() => setConfirmDel(true)}>Supprimer la classe</button>
        )}
      </div>
    </div>
  )
}

function Teachers() {
  const t = useTable((sb) => sb.from('gratte_teachers').select('*').order('added_at'), [])
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const add = async (e) => {
    e.preventDefault()
    const sb = await getClient()
    const { error } = await sb.from('gratte_teachers').insert({ email: email.trim().toLowerCase(), name: name.trim() || null })
    if (error) return t.setError(error.message)
    setEmail('')
    setName('')
    t.reload()
  }
  const remove = async (em) => {
    const sb = await getClient()
    await sb.from('gratte_teachers').delete().eq('email', em)
    t.reload()
  }
  return (
    <div>
      <p className="muted small">Un prof se connecte dans Réglages › Compte avec l’adresse indiquée ici ; le panneau « Mes classes » apparaît alors.</p>
      <form className="row gap wrap" onSubmit={add}>
        <input id="teacher-email" className="input" type="email" placeholder="adresse e-mail du prof" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input id="teacher-name" className="input" placeholder="Nom (facultatif)" value={name} onChange={(e) => setName(e.target.value)} />
        <button className="btn btn-primary small" disabled={!/.+@.+\..+/.test(email)}>Ajouter le prof</button>
      </form>
      {t.error && <p className="error small">{t.error}</p>}
      <ul className="student-list">
        {t.rows?.map((x) => (
          <li key={x.email}>
            <strong>{x.name || x.email}</strong>
            {x.name && <span className="muted small">{x.email}</span>}
            <button className="btn btn-ghost small" onClick={() => remove(x.email)}>Retirer</button>
          </li>
        ))}
      </ul>
    </div>
  )
}

function PushScores() {
  const { list, reload } = useRemoteScores()
  const [folder, setFolder] = useState('Arquebusiers')
  const [busy, setBusy] = useState('')
  const [msg, setMsg] = useState('')

  const onFiles = async (e) => {
    const files = [...(e.target.files || [])]
    e.target.value = ''
    if (!files.length) return
    setMsg('')
    const sb = await getClient()
    try {
      // Pages : photos ou archive .zip ; « 12 - Titre.jpg » donne le numéro et le titre
      const items = []
      for (const f of files) {
        if (/\.zip$/i.test(f.name)) items.push(...(await readZipImages(f)))
        else if (f.type.startsWith('image/')) items.push({ name: f.name, blob: f })
      }
      let n = 0
      for (const it of items.sort((a, b) => a.name.localeCompare(b.name, 'fr', { numeric: true }))) {
        const { page, title } = parseName(it.name, null)
        setBusy(`Envoi ${n + 1}/${items.length} : ${title}`)
        const data = await imageToBase64(it.blob)
        const { data: sc, error } = await sb.from('gratte_scores').insert({ title, folder: folder.trim() || 'Partitions', num: page, kind: 'scan', page_count: 1 }).select('id').single()
        if (error) throw error
        const { error: e2 } = await sb.from('gratte_score_pages').insert({ score_id: sc.id, page: 1, data })
        if (e2) throw e2
        n++
      }
      setMsg(`${n} partition${n > 1 ? 's' : ''} envoyée${n > 1 ? 's' : ''}. Les profs peuvent maintenant les activer pour leurs classes.`)
    } catch (err) {
      setMsg('Erreur : ' + (err.message || err))
    } finally {
      setBusy('')
      reload()
    }
  }

  // Tablature au format de l'appli (fichier .json : { title, beats, bpm, notes: [...] })
  const onJson = async (e) => {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    try {
      const tab = JSON.parse(await f.text())
      if (!Array.isArray(tab.notes)) throw new Error('fichier sans liste de notes')
      const sb = await getClient()
      const { error } = await sb.from('gratte_scores').insert({ title: tab.title || f.name.replace(/\.json$/i, ''), folder: folder.trim() || 'Partitions', kind: 'tab', tab })
      if (error) throw error
      setMsg('Tablature envoyée.')
      reload()
    } catch (err) {
      setMsg('Erreur : ' + (err.message || err))
    }
  }

  const remove = async (id) => {
    const sb = await getClient()
    await sb.from('gratte_scores').delete().eq('id', id)
    reload()
  }

  return (
    <div>
      <p className="muted small">Les partitions envoyées sont stockées sur le serveur, visibles des profs, et des élèves seulement si leur prof les active.</p>
      <label className="field">
        <span>Dossier</span>
        <input id="push-folder" className="input" value={folder} maxLength={60} onChange={(e) => setFolder(e.target.value)} />
      </label>
      <div className="row gap wrap">
        <label className="btn btn-primary small">
          ＋ Pages (photos ou .zip)
          <input id="push-files" type="file" accept="image/*,.zip,application/zip" multiple hidden onChange={onFiles} disabled={!!busy} />
        </label>
        <label className="btn small">
          ＋ Tablature (.json)
          <input id="push-json" type="file" accept=".json,application/json" hidden onChange={onJson} />
        </label>
      </div>
      {busy && <p className="small">{busy}</p>}
      {msg && <p className="small">{msg}</p>}
      <ul className="student-list">
        {list.map((s) => (
          <li key={s.id}>
            <strong>{s.num != null ? s.num + ' – ' : ''}{s.title}</strong>
            <span className="muted small">{s.folder} · {s.kind === 'tab' ? 'tablature' : `${s.page_count} page${s.page_count > 1 ? 's' : ''}`}</span>
            <button className="btn btn-ghost small" onClick={() => remove(s.id)}>Supprimer</button>
          </li>
        ))}
      </ul>
    </div>
  )
}
