import { useState } from 'react'
import { useAccess } from '../lib/access.jsx'
import { fetchPage } from '../lib/scores.js'
import { ScanViewer } from './ScanFolder.jsx'

// Pages photographiées envoyées par le super admin, rangées par dossier
export default function RemoteScores({ scores }) {
  const { mode, student } = useAccess()
  const scans = scores.filter((s) => s.kind === 'scan' && s.page_count > 0)
  const [viewer, setViewer] = useState(null) // { pages, index }
  const [busy, setBusy] = useState('')
  const [err, setErr] = useState('')
  if (!scans.length) return null

  const folders = [...new Set(scans.map((s) => s.folder))]
  const open = async (folder, score) => {
    setBusy(score.id)
    setErr('')
    try {
      // On charge toutes les pages du dossier pour pouvoir tourner les pages dans le lecteur
      const inFolder = scans.filter((s) => s.folder === folder)
      const pages = []
      for (const s of inFolder) {
        for (let p = 1; p <= s.page_count; p++) {
          pages.push({ id: `${s.id}:${p}`, page: s.num ?? '', title: s.page_count > 1 ? `${s.title} (${p}/${s.page_count})` : s.title, blob: await fetchPage(mode, student?.token, s.id, p), sid: s.id })
        }
      }
      setViewer({ pages, index: pages.findIndex((p) => p.sid === score.id) })
    } catch (e) {
      setErr(e.message)
    } finally {
      setBusy('')
    }
  }

  return (
    <>
      {folders.map((f) => (
        <div key={f}>
          <span className="chip-group-label">{f} · pages</span>
          <div className="chips">
            {scans.filter((s) => s.folder === f).map((s) => (
              <button key={s.id} className="chip scan-chip" onClick={() => open(f, s)} disabled={!!busy}>
                {s.num != null && <b>{s.num}</b>} {busy === s.id ? 'Chargement…' : s.title}
              </button>
            ))}
          </div>
        </div>
      ))}
      {err && <p className="error small">{err}</p>}
      {viewer && <ScanViewer pages={viewer.pages} index={viewer.index} setIndex={(i) => setViewer((v) => ({ ...v, index: i }))} onClose={() => setViewer(null)} />}
    </>
  )
}
