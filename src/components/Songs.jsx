import { useEffect, useMemo, useRef, useState } from 'react'
import { SONGS, SONG_TEMPLATE, parseSong } from '../data/songs.js'
import { Clock, strum } from '../lib/audio.js'
import { resolveChord, shapeFor, suggestCapo, withCapo, transposeChord } from '../lib/music.js'
import { useProgress } from '../lib/progress.jsx'
import { useSettings } from '../lib/settings.jsx'
import ChordDiagram from './ChordDiagram.jsx'
import { STYLES, scheduleBar } from '../lib/band.js'
import { shareLink } from '../lib/share.js'

export default function Songs({ params = {} }) {
  const { userSongs } = useProgress()
  const [view, setView] = useState({ mode: 'list' }) // list | play | edit

  useEffect(() => {
    if (params.song) setView({ mode: 'play', id: params.song })
  }, [params.song])
  const [incoming, setIncoming] = useState(params.importSong || null)
  useEffect(() => {
    if (params.importSong) setIncoming(params.importSong)
  }, [params.importSong])
  const { saveSong } = useProgress()

  const all = [...SONGS, ...userSongs]
  const song = view.id ? all.find((s) => s.id === view.id) : null

  if (view.mode === 'edit') return <SongEditor song={song} onDone={(id) => setView(id ? { mode: 'play', id } : { mode: 'list' })} />
  if (view.mode === 'play' && song) return <SongPlayer song={song} onBack={() => setView({ mode: 'list' })} onEdit={() => setView({ mode: 'edit', id: song.id })} />

  return (
    <div className="songs">
      {incoming && (
        <div className="import-card">
          <strong>Grille reçue : « {incoming.title} »</strong>
          <small>{parseSong(incoming.text).bars.length} mesures · {incoming.bpm} BPM</small>
          <div className="row gap">
            <button className="btn btn-primary small" onClick={() => { const id = `u${Date.now()}`; saveSong({ ...incoming, id, by: 'Ma grille' }); setIncoming(null); setView({ mode: 'play', id }) }}>Ajouter à mes grilles</button>
            <button className="btn btn-ghost small" onClick={() => setIncoming(null)}>Ignorer</button>
          </div>
        </div>
      )}
      <p className="muted">Suivez la grille au tempo : l’accord en cours s’allume. Capodastre et transposition sont dans chaque chanson.</p>
      <h3 className="section-title">Airs traditionnels</h3>
      <div className="song-list">
        {SONGS.map((s) => <SongRow key={s.id} song={s} onOpen={() => setView({ mode: 'play', id: s.id })} />)}
      </div>
      <h3 className="section-title">Mes grilles</h3>
      <div className="song-list">
        {userSongs.length === 0 && <p className="muted small">Ajoutez la grille d’une chanson que vous aimez : vous tapez les accords, l’appli vous les fait défiler en rythme.</p>}
        {userSongs.map((s) => <SongRow key={s.id} song={s} onOpen={() => setView({ mode: 'play', id: s.id })} />)}
      </div>
      <button className="btn btn-primary btn-big" onClick={() => setView({ mode: 'edit' })}>+ Nouvelle grille</button>
    </div>
  )
}

function SongRow({ song, onOpen }) {
  const { label } = useSettings()
  const chords = [...new Set(parseSong(song.text).bars)]
  return (
    <button className="song-row" onClick={onOpen}>
      <span className="song-row-main">
        <strong>{song.title}</strong>
        <small>{song.by} · {song.bpm} BPM · {song.beats}/4</small>
      </span>
      <span className="song-row-chords">{chords.slice(0, 6).map(label).join(' ')}{chords.length > 6 ? '…' : ''}</span>
    </button>
  )
}

function SongPlayer({ song, onBack, onEdit }) {
  const { label } = useSettings()
  const { logActivity, markPracticed } = useProgress()
  const parsed = useMemo(() => parseSong(song.text), [song.text])
  const sounding = useMemo(() => [...new Set(parsed.bars)], [parsed])
  const [transpose, setTranspose] = useState(0)
  const [capo, setCapo] = useState(() => suggestCapo(sounding, 0))
  const [bpm, setBpm] = useState(song.bpm)
  const [accomp, setAccomp] = useState('mesure') // aucun | mesure | temps
  const [band, setBand] = useState(song.band || 'aucun')
  const [running, setRunning] = useState(false)
  const [pos, setPos] = useState({ bar: -1, beat: -1 })
  const startedAt = useRef(0)

  const shape = (ch) => shapeFor(ch, transpose, capo)
  const ref = useRef({})
  ref.current = { parsed, transpose, capo, accomp, band, beats: song.beats }

  const clockRef = useRef(null)
  if (!clockRef.current) {
    clockRef.current = new Clock({
      onSchedule: (e) => {
        const { parsed: p, transpose: t, capo: k, accomp: a, band: bd, beats } = ref.current
        const bar = Math.floor(e.beat / clockRef.current.beatsPerBar) - 1 // 1 mesure de décompte
        if (bar >= 0 && e.beatInBar === 0 && p.bars.length) {
          const cur = transposeChord(p.bars[bar % p.bars.length], t)
          const nxt = transposeChord(p.bars[(bar + 1) % p.bars.length], t)
          scheduleBar(bd, cur, nxt, e.time, 60 / clockRef.current.bpm, beats)
        }
        if (bar < 0 || a === 'aucun' || !p.bars.length) return
        if (a === 'mesure' && e.beatInBar !== 0) return
        const c = resolveChord(shapeFor(p.bars[bar % p.bars.length], t, k))
        if (c) strum(withCapo(c.frets, k), { when: e.time, gain: e.beatInBar === 0 ? 0.17 : 0.11, direction: 'down' })
      },
      onTick: (e) => {
        const bar = Math.floor(e.beat / clockRef.current.beatsPerBar) - 1
        const n = ref.current.parsed.bars.length
        setPos({ bar: bar < 0 ? -1 : bar % n, beat: e.beatInBar, countIn: bar < 0 })
      },
    })
  }
  const clock = clockRef.current
  clock.bpm = bpm
  clock.beatsPerBar = song.beats

  useEffect(() => () => clock.stop(), [clock])

  // Fait défiler la ligne en cours
  useEffect(() => {
    if (pos.bar < 0) return
    document.querySelector(`[data-bar="${pos.bar}"]`)?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }, [pos.bar])

  const toggle = () => {
    if (clock.running) {
      clock.stop()
      setRunning(false)
      setPos({ bar: -1, beat: -1 })
      if (Date.now() - startedAt.current > 30000) logActivity('song', song.id)
    } else {
      clock.start()
      startedAt.current = Date.now()
      setRunning(true)
      markPracticed()
    }
  }

  const shapes = [...new Set(sounding.map(shape))]
  const keyName = (n) => (n > 0 ? `+${n}` : String(n))

  return (
    <div className="player">
      <div className="player-head">
        <button className="btn btn-ghost small" onClick={() => { clock.stop(); onBack() }}>← Chansons</button>
        <div className="row gap">
          <ShareButton song={{ ...song, band }} />
          {song.by === 'Ma grille' && <button className="btn btn-ghost small" onClick={() => { clock.stop(); onEdit() }}>Modifier</button>}
        </div>
      </div>
      <h3 className="player-title">{song.title}</h3>
      <p className="muted small">{song.by}</p>

      <div className="shape-strip">
        {shapes.map((id) => {
          const c = resolveChord(id)
          return c ? (
            <button key={id} className="chord-mini" onClick={() => strum(withCapo(c.frets, capo))} title="Écouter">
              <ChordDiagram chord={c} size={78} />
            </button>
          ) : (
            <span key={id} className="chord-mini unknown">{label(id)}<small>forme inconnue</small></span>
          )
        })}
      </div>

      <div className="player-controls">
        <div className="stepper">
          <span>Tonalité</span>
          <button className="btn btn-round small" onClick={() => setTranspose(transpose - 1)} aria-label="Descendre d’un demi-ton">−</button>
          <strong>{keyName(transpose)}</strong>
          <button className="btn btn-round small" onClick={() => setTranspose(transpose + 1)} aria-label="Monter d’un demi-ton">+</button>
        </div>
        <div className="stepper">
          <span>Capo</span>
          <button className="btn btn-round small" onClick={() => setCapo(Math.max(0, capo - 1))} aria-label="Capo plus bas">−</button>
          <strong>{capo || '—'}</strong>
          <button className="btn btn-round small" onClick={() => setCapo(Math.min(9, capo + 1))} aria-label="Capo plus haut">+</button>
        </div>
        <button className="btn btn-ghost small" onClick={() => setCapo(suggestCapo(sounding, transpose))}>Capo conseillé</button>
        <label className="field-inline">
          Accompagnement
          <select id="accomp" value={accomp} onChange={(e) => setAccomp(e.target.value)}>
            <option value="mesure">1 coup par mesure</option>
            <option value="temps">Chaque temps</option>
            <option value="aucun">Pas de guitare</option>
          </select>
        </label>
        <label className="field-inline">
          Groupe
          <select id="song-band" value={band} onChange={(e) => setBand(e.target.value)}>
            {STYLES.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
          </select>
        </label>
      </div>
      {capo > 0 && (
        <p className="capo-note">
          Capo case {capo} : vous jouez <strong>{label(shape(sounding[0]))}</strong>, ça sonne <strong>{label(transposeChord(sounding[0], transpose))}</strong>.
        </p>
      )}

      <div className="lyrics">
        {parsed.lines.map((ln, i) => {
          if (ln.type === 'blank') return <div key={i} className="ly-blank" />
          if (ln.type === 'section') return <div key={i} className="ly-section">{ln.text}</div>
          return (
            <div key={i} className="ly-line">
              {ln.parts.map((pt, j) => (
                <span key={j} className={`ly-part${pt.bar !== null && pt.bar === pos.bar ? ' now' : ''}`} data-bar={pt.bar ?? undefined}>
                  <span className="ly-chord">{pt.chord ? label(shape(pt.chord)) : ' '}</span>
                  <span className="ly-text">{pt.text || ' '}</span>
                </span>
              ))}
            </div>
          )
        })}
      </div>

      <div className="player-dock">
        <div className="beat-dots small" aria-hidden>
          {Array.from({ length: song.beats }, (_, i) => (
            <span key={i} className={`beat-dot${i === pos.beat ? ' on' : ''}${pos.countIn ? ' accent' : ''}`} />
          ))}
          {pos.countIn && <span className="muted small">décompte…</span>}
        </div>
        <div className="dock-row">
          <div className="dock-bpm">
            <button className="btn btn-round small" onClick={() => setBpm(Math.max(40, bpm - 5))} aria-label="Moins vite">−</button>
            <span><strong>{bpm}</strong> BPM</span>
            <button className="btn btn-round small" onClick={() => setBpm(Math.min(180, bpm + 5))} aria-label="Plus vite">+</button>
          </div>
          <button className={`btn dock-play ${running ? '' : 'btn-primary'}`} onClick={toggle}>{running ? '■ Stop' : '▶ Jouer'}</button>
        </div>
      </div>
    </div>
  )
}

function ShareButton({ song }) {
  const [msg, setMsg] = useState('')
  const [link, setLink] = useState('')
  const share = async () => {
    const url = shareLink(song)
    setLink(url)
    try {
      if (navigator.share) {
        await navigator.share({ title: `Gratte : ${song.title}`, text: `Ma grille « ${song.title} » à jouer dans Gratte`, url })
        return
      }
    } catch {
      /* partage annulé : on propose la copie */
    }
    try {
      await navigator.clipboard.writeText(url)
      setMsg('Lien copié')
    } catch {
      setMsg('Copiez le lien ci-dessous')
    }
  }
  return (
    <span className="share">
      <button className="btn btn-ghost small" onClick={share}>Partager</button>
      {msg && (
        <span className="share-pop">
          <small>{msg}</small>
          <input className="input" readOnly value={link} onFocus={(e) => e.target.select()} aria-label="Lien de partage" />
        </span>
      )}
    </span>
  )
}

function SongEditor({ song, onDone }) {
  const { saveSong, deleteSong } = useProgress()
  const { label } = useSettings()
  const [title, setTitle] = useState(song?.title || '')
  const [bpm, setBpm] = useState(song?.bpm || 90)
  const [beats, setBeats] = useState(song?.beats || 4)
  const [text, setText] = useState(song?.text || SONG_TEMPLATE)
  const [confirmDel, setConfirmDel] = useState(false)
  const parsed = parseSong(text)
  const unknown = [...new Set(parsed.bars)].filter((c) => !resolveChord(c))
  const isNew = !song || song.by !== 'Ma grille'

  const save = () => {
    const id = !isNew ? song.id : `u${Date.now()}`
    saveSong({ id, title: title.trim() || 'Sans titre', by: 'Ma grille', bpm, beats, text, ...(song?.band ? { band: song.band } : {}) })
    onDone(id)
  }

  return (
    <div className="editor">
      <button className="btn btn-ghost small" onClick={() => onDone(null)}>← Annuler</button>
      <h3 className="player-title">{isNew ? 'Nouvelle grille' : 'Modifier la grille'}</h3>
      <label className="field">
        <span>Titre</span>
        <input id="song-title" className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex. : Ma chanson préférée" />
      </label>
      <div className="row gap">
        <label className="field">
          <span>Tempo (BPM)</span>
          <input id="song-bpm" className="input" type="number" min="40" max="200" value={bpm} onChange={(e) => setBpm(Math.max(40, Math.min(200, Number(e.target.value) || 90)))} />
        </label>
        <label className="field">
          <span>Temps par mesure</span>
          <select id="song-beats" value={beats} onChange={(e) => setBeats(Number(e.target.value))}>
            <option value={3}>3 (valse)</option>
            <option value={4}>4</option>
          </select>
        </label>
      </div>
      <label className="field">
        <span>Grille</span>
        <textarea id="song-text" className="input mono" rows={12} value={text} onChange={(e) => setText(e.target.value)} spellCheck={false} />
      </label>
      <p className="muted small">
        Mettez chaque accord entre crochets, au début de sa mesure : <code>[G]paroles [D]suite</code>. Une ligne commençant par <code>#</code> devient un titre (Couplet, Refrain). Les accords hors dictionnaire (A#, Gm, B7…) sont générés en barré quand c’est possible.
      </p>
      <p className="small">
        {parsed.bars.length} mesures · accords : {[...new Set(parsed.bars)].map(label).join(', ') || '—'}
      </p>
      {unknown.length > 0 && <p className="error small">Accords non reconnus : {unknown.join(', ')}. Vérifiez l’orthographe (ex. : Am, F#m, Bb7).</p>}
      <button className="btn btn-primary btn-big" onClick={save} disabled={!parsed.bars.length}>Enregistrer</button>
      {!isNew && (confirmDel ? (
        <div className="reset-confirm">
          <span>Supprimer cette grille ?</span>
          <div className="row gap center">
            <button className="btn small" onClick={() => setConfirmDel(false)}>Annuler</button>
            <button className="btn small btn-danger" onClick={() => { deleteSong(song.id); onDone(null) }}>Supprimer</button>
          </div>
        </div>
      ) : (
        <button className="btn btn-ghost small reset" onClick={() => setConfirmDel(true)}>Supprimer la grille</button>
      ))}
    </div>
  )
}
