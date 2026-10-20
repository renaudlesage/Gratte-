import { useEffect, useMemo, useRef, useState } from 'react'
import { listScans, importFiles, deleteScan, saveScan } from '../lib/scans.js'

// Pages de recueil photographiées : import, liste, lecture en plein écran (pupitre), zoom et rotation
export default function ScanFolder({ folder }) {
  const [pages, setPages] = useState([])
  const [open, setOpen] = useState(-1)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const input = useRef(null)

  const refresh = async () => setPages(await listScans(folder))
  useEffect(() => {
    refresh()
  }, [folder])

  const onFiles = async (e) => {
    const files = [...(e.target.files || [])]
    e.target.value = ''
    if (!files.length) return
    setBusy(true)
    setMsg('')
    try {
      const n = await importFiles(folder, files, pages)
      setMsg(n ? `${n} page${n > 1 ? 's' : ''} ajoutée${n > 1 ? 's' : ''}.` : 'Aucune image trouvée dans ces fichiers.')
      await refresh()
    } catch (err) {
      setMsg(err?.message || 'Import impossible.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="scan-folder">
      <div className="row wrap gap scan-head">
        <strong>Recueil (pages photographiées)</strong>
        <button className="btn small" onClick={() => input.current?.click()} disabled={busy}>
          {busy ? 'Import…' : '＋ Ajouter des pages'}
        </button>
        <input ref={input} id={`scan-input-${folder}`} type="file" accept="image/*,.zip,application/zip" multiple hidden onChange={onFiles} />
      </div>
      {msg && <p className="small">{msg}</p>}
      {pages.length ? (
        <div className="chips">
          {pages.map((p, i) => (
            <button key={p.id} className="chip scan-chip" onClick={() => setOpen(i)}>
              <b>{p.page}</b> {p.title}
            </button>
          ))}
        </div>
      ) : (
        <p className="muted small">
          Ajoutez les photos des pages du recueil, ou l’archive .zip des pages. Un nom comme « 12 - Le Chant du Départ.jpg » donne directement le numéro et le titre. Les pages restent sur cet appareil.
        </p>
      )}
      {open >= 0 && pages[open] && (
        <ScanViewer
          pages={pages}
          index={open}
          setIndex={setOpen}
          onClose={() => setOpen(-1)}
          onChange={async (p) => {
            await saveScan(p)
            await refresh()
          }}
          onDelete={async (p) => {
            await deleteScan(p.id)
            setOpen(-1)
            await refresh()
          }}
        />
      )}
    </div>
  )
}

const ZOOMS = [1, 1.25, 1.5, 2, 2.5, 3]

// Tourne réellement l'image d'un quart de tour (l'image enregistrée est remplacée)
async function rotateBlob(blob) {
  const bmp = await createImageBitmap(blob)
  const c = document.createElement('canvas')
  c.width = bmp.height
  c.height = bmp.width
  const g = c.getContext('2d')
  g.translate(c.width, 0)
  g.rotate(Math.PI / 2)
  g.drawImage(bmp, 0, 0)
  return new Promise((res) => c.toBlob(res, 'image/jpeg', 0.85))
}

function ScanViewer({ pages, index, setIndex, onClose, onChange, onDelete }) {
  const page = pages[index]
  const url = useMemo(() => URL.createObjectURL(page.blob), [page])
  useEffect(() => () => URL.revokeObjectURL(url), [url])
  const [zoom, setZoom] = useState(1)
  const [confirm, setConfirm] = useState(false)
  const box = useRef(null)
  const go = (d) => {
    const i = index + d
    if (i >= 0 && i < pages.length) {
      setIndex(i)
      setConfirm(false)
      box.current?.scrollTo({ top: 0, left: 0 })
    }
  }
  const goRef = useRef(go)
  goRef.current = go

  useEffect(() => {
    document.documentElement.requestFullscreen?.().catch(() => {})
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight' || e.key === 'PageDown') goRef.current(1)
      if (e.key === 'ArrowLeft' || e.key === 'PageUp') goRef.current(-1)
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
      if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {})
    }
  }, [])

  // Balayage gauche/droite pour tourner les pages (sans zoom)
  const touch = useRef(null)
  const onTouchStart = (e) => (touch.current = e.touches.length === 1 ? { x: e.touches[0].clientX, y: e.touches[0].clientY } : null)
  const onTouchEnd = (e) => {
    if (!touch.current || zoom > 1) return
    const dx = e.changedTouches[0].clientX - touch.current.x
    const dy = e.changedTouches[0].clientY - touch.current.y
    if (Math.abs(dx) > 70 && Math.abs(dx) > 2 * Math.abs(dy)) go(dx < 0 ? 1 : -1)
    touch.current = null
  }

  const zi = ZOOMS.indexOf(zoom)

  return (
    <div className="scan-viewer" role="dialog" aria-label={page.title}>
      <div className="stage-bar">
        <button className="btn btn-ghost small" onClick={onClose} aria-label="Fermer">✕</button>
        <strong className="stage-title">{page.page} · {page.title}</strong>
        <button className="btn btn-round small" onClick={() => go(-1)} disabled={index === 0} aria-label="Page précédente">‹</button>
        <span className="size-val">{index + 1} / {pages.length}</span>
        <button className="btn btn-round small" onClick={() => go(1)} disabled={index === pages.length - 1} aria-label="Page suivante">›</button>
        <div className="size-ctl">
          <button className="btn btn-round small" onClick={() => setZoom(ZOOMS[Math.max(0, zi - 1)])} disabled={zi <= 0} aria-label="Plus petit">A−</button>
          <span className="size-val">{Math.round(zoom * 100)} %</span>
          <button className="btn btn-round small" onClick={() => setZoom(ZOOMS[Math.min(ZOOMS.length - 1, zi + 1)])} disabled={zi >= ZOOMS.length - 1} aria-label="Plus grand">A+</button>
        </div>
        <button className="btn small" onClick={async () => onChange({ ...page, blob: await rotateBlob(page.blob) })} title="Tourner la page">⟳ Tourner</button>
        {confirm ? (
          <>
            <button className="btn small btn-danger" onClick={() => onDelete(page)}>Supprimer la page</button>
            <button className="btn btn-ghost small" onClick={() => setConfirm(false)}>Annuler</button>
          </>
        ) : (
          <button className="btn btn-ghost small" onClick={() => setConfirm(true)} aria-label="Supprimer">🗑</button>
        )}
      </div>
      <div className="scan-box" ref={box} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        <div className="scan-wrap" style={{ width: `${zoom * 100}%` }}>
          <img
            src={url}
            alt={page.title}
            className="scan-img"
            draggable={false}
          />
        </div>
      </div>
    </div>
  )
}
