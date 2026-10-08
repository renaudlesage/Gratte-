import { useEffect, useRef, useState } from 'react'
import { Clock } from '../lib/audio.js'
import { listRecordings, saveRecording, deleteRecording, pickMime } from '../lib/recordings.js'
import { useProgress } from '../lib/progress.jsx'

const fmtDur = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`

// S'enregistrer pour réécouter ses progrès dans quelques semaines
export default function Recorder() {
  const [recs, setRecs] = useState([])
  const [state, setState] = useState('idle') // idle | recording
  const [elapsed, setElapsed] = useState(0)
  const [title, setTitle] = useState('')
  const [withClick, setWithClick] = useState(false)
  const [bpm, setBpm] = useState(80)
  const [error, setError] = useState('')
  const [confirmDel, setConfirmDel] = useState(null)
  const r = useRef({})
  const { logActivity, markPracticed } = useProgress()

  const refresh = () => listRecordings().then(setRecs)
  useEffect(() => {
    refresh()
    return () => stopAll()
  }, [])

  function stopAll() {
    clearInterval(r.current.timer)
    r.current.clock?.stop()
    r.current.stream?.getTracks().forEach((t) => t.stop())
  }

  const start = async () => {
    setError('')
    if (!window.MediaRecorder || !navigator.mediaDevices?.getUserMedia) {
      setError("L'enregistrement n'est pas disponible dans ce navigateur.")
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: true } })
      const mime = pickMime()
      const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined)
      const chunks = []
      rec.ondataavailable = (e) => e.data.size && chunks.push(e.data)
      rec.onstop = async () => {
        const blob = new Blob(chunks, { type: rec.mimeType || mime || 'audio/webm' })
        const duration = (Date.now() - r.current.t0) / 1000
        const name = title.trim() || `Enregistrement du ${new Date().toLocaleDateString('fr-BE', { day: 'numeric', month: 'long' })}`
        try {
          await saveRecording({ id: `r${Date.now()}`, title: name, createdAt: Date.now(), duration, blob, type: blob.type })
        } catch {
          setError("Impossible d'enregistrer sur cet appareil (stockage plein ou navigation privée).")
        }
        setTitle('')
        refresh()
        logActivity('record', '', Math.round(duration))
      }
      if (withClick) {
        const clock = new Clock({ bpm, beatsPerBar: 4 })
        clock.start()
        r.current.clock = clock
      }
      rec.start(1000)
      r.current = { ...r.current, rec, stream, t0: Date.now(), timer: setInterval(() => setElapsed((Date.now() - r.current.t0) / 1000), 250) }
      setElapsed(0)
      setState('recording')
      markPracticed()
    } catch (e) {
      setError(e?.name === 'NotAllowedError' ? 'Le micro est refusé ou indisponible ici. Autorisez-le pour ce site (en HTTPS).' : "Impossible d'ouvrir le micro : " + (e?.message || e))
    }
  }

  const stop = () => {
    r.current.rec?.state === 'recording' && r.current.rec.stop()
    stopAll()
    setState('idle')
  }

  return (
    <div className="recorder">
      <p className="muted">Enregistrez un morceau aujourd’hui, réécoutez-le dans un mois : c’est la meilleure preuve de vos progrès. Les enregistrements restent sur cet appareil.</p>
      {state === 'idle' ? (
        <>
          <label className="field">
            <span>Titre (facultatif)</span>
            <input id="rec-title" className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex. : Blues en Mi, semaine 2" />
          </label>
          <div className="row wrap gap">
            <label className="field-inline">
              <input id="rec-click" type="checkbox" checked={withClick} onChange={(e) => setWithClick(e.target.checked)} />
              Avec métronome
            </label>
            {withClick && (
              <label className="field-inline">
                <input id="rec-bpm" className="input small-input" type="number" min="40" max="200" value={bpm} onChange={(e) => setBpm(Math.max(40, Math.min(200, Number(e.target.value) || 80)))} />
                BPM
              </label>
            )}
          </div>
          <button className="btn btn-primary btn-big" onClick={start}>● Enregistrer</button>
        </>
      ) : (
        <div className="center-col rec-live">
          <span className="rec-dot" aria-hidden />
          <div className="timer">{fmtDur(elapsed)}</div>
          <button className="btn btn-big" onClick={stop}>■ Arrêter</button>
        </div>
      )}
      {error && <p className="error small">{error}</p>}

      <h3 className="section-title">Mes enregistrements</h3>
      {recs.length === 0 && <p className="muted small">Aucun enregistrement pour l’instant.</p>}
      <div className="rec-list">
        {recs.map((rec) => (
          <RecRow key={rec.id} rec={rec} confirming={confirmDel === rec.id} onAskDelete={() => setConfirmDel(rec.id)} onCancel={() => setConfirmDel(null)} onDelete={async () => { await deleteRecording(rec.id); setConfirmDel(null); refresh() }} />
        ))}
      </div>
    </div>
  )
}

function RecRow({ rec, confirming, onAskDelete, onCancel, onDelete }) {
  const [url, setUrl] = useState(null)
  useEffect(() => {
    const u = URL.createObjectURL(rec.blob)
    setUrl(u)
    return () => URL.revokeObjectURL(u)
  }, [rec.blob])
  const ext = (rec.type || '').includes('mp4') ? 'm4a' : (rec.type || '').includes('ogg') ? 'ogg' : 'webm'
  const ago = Math.round((Date.now() - rec.createdAt) / 86400000)
  return (
    <div className="rec-row">
      <div className="rec-head">
        <strong>{rec.title}</strong>
        <small>
          {new Date(rec.createdAt).toLocaleDateString('fr-BE', { day: 'numeric', month: 'short', year: 'numeric' })} · {fmtDur(rec.duration || 0)}
          {ago >= 7 ? ` · il y a ${ago} jours` : ''}
        </small>
      </div>
      {url && <audio controls preload="metadata" src={url} />}
      <div className="row gap wrap">
        {url && <a className="btn btn-ghost small" href={url} download={`${rec.title}.${ext}`}>Télécharger</a>}
        {confirming ? (
          <>
            <button className="btn small" onClick={onCancel}>Annuler</button>
            <button className="btn small btn-danger" onClick={onDelete}>Supprimer</button>
          </>
        ) : (
          <button className="btn btn-ghost small" onClick={onAskDelete}>Supprimer</button>
        )}
      </div>
    </div>
  )
}
