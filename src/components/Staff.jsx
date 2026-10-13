// Portée musicale (clé de sol), alignée case par case sur la tablature.
// La guitare s'écrit une octave au-dessus du son réel : Mi grave à vide = Mi3 écrit.
const OPEN_WRITTEN = [76, 71, 67, 62, 57, 52] // cordes 1 → 6, en MIDI écrit
const LETTER_OF_PC = [0, 0, 1, 1, 2, 3, 3, 4, 4, 5, 5, 6] // Do Do# Ré Ré# Mi Fa Fa# Sol Sol# La La# Si
const SHARP = new Set([1, 3, 6, 8, 10])

const GAP = 8 // écart entre deux lignes
const BOTTOM = 72 // ordonnée de la 1re ligne (Mi4)
export const STAFF_HEIGHT = 112

export const writtenMidi = (str, fret) => OPEN_WRITTEN[str - 1] + fret

// Position sur la portée : 0 = 1re ligne (Mi4), 1 = 1er interligne (Fa4)…
export function staffStep(midi) {
  const pc = midi % 12
  const oct = Math.floor(midi / 12) - 1
  return LETTER_OF_PC[pc] + 7 * oct - (2 + 7 * 4)
}
const yOf = (step) => BOTTOM - (step * GAP) / 2

function Note({ step, filled, stem, flag, dot, sharp, up, stemTo }) {
  const y = yOf(step)
  const ledgers = []
  for (let s = -2; s >= step; s -= 2) ledgers.push(s)
  for (let s = 10; s <= step; s += 2) ledgers.push(s)
  // Hampe : longueur standard, ou jusqu'à la ligne de ligature (stemTo)
  const top = stemTo !== undefined ? (up ? stemTo : y) : up ? y - 28 : y
  const height = stemTo !== undefined ? Math.abs(stemTo - y) : 28
  return (
    <>
      {ledgers.map((s) => <span key={s} className="st-ledger" style={{ top: yOf(s) }} />)}
      {sharp && <span className="st-sharp" style={{ top: y }}>♯</span>}
      <span className={`st-head${filled ? '' : ' hollow'}`} style={{ top: y }} />
      {dot && <span className="st-dot" style={{ top: y - (step % 2 === 0 ? GAP / 2 : 0) }} />}
      {stem && (
        <span className={`st-stem ${up ? 'up' : 'down'}`} style={{ top, height }}>
          {flag && <span className={`st-flag ${up ? 'up' : 'down'}`} />}
        </span>
      )}
    </>
  )
}

// Silences : demi-pause et pause en rectangles, soupir et demi-soupir en glyphes
function Rest({ d }) {
  if (d >= 8) return <span className="st-rest-block whole" style={{ top: yOf(6) }} />
  if (d >= 4) return <span className="st-rest-block half" style={{ top: yOf(4) - 4 }} />
  return <span className="st-rest-glyph" style={{ top: yOf(4) - 12 }}>{d >= 2 ? '𝄽' : '𝄾'}</span>
}

const notesOf = (ev) =>
  ev.n.map(([s, f]) => {
    const m = writtenMidi(s, f)
    return { m, step: staffStep(SHARP.has(m % 12) ? m - 1 : m), sharp: SHARP.has(m % 12) }
  })

// Ligatures : croches consécutives regroupées par temps (3/4) ou par demi-mesure (2/4, 4/4)
export function computeBeams(events, beats) {
  const groupLen = beats === 3 ? 2 : 4
  const out = events.map(() => null)
  let t = 0
  const starts = events.map((ev) => {
    const s = t
    t += ev.d
    return s
  })
  let i = 0
  while (i < events.length) {
    const isEighth = (k) => events[k] && events[k].d === 1 && events[k].n.length > 0
    if (!isEighth(i)) {
      i++
      continue
    }
    const win = Math.floor(starts[i] / groupLen)
    let j = i
    while (isEighth(j + 1) && Math.floor(starts[j + 1] / groupLen) === win) j++
    if (j > i) {
      const group = []
      for (let k = i; k <= j; k++) group.push(notesOf(events[k]))
      const all = group.flat()
      const up = all.reduce((a, n) => a + n.step, 0) / all.length < 4
      const beamY = up
        ? Math.min(...group.map((g) => yOf(Math.max(...g.map((n) => n.step))))) - 26
        : Math.max(...group.map((g) => yOf(Math.min(...g.map((n) => n.step))))) + 26
      for (let k = i; k <= j; k++) out[k] = { up, beamY, last: k === j }
    }
    i = j + 1
  }
  return out
}

export function StaffCell({ ev, beam }) {
  if (!ev.n.length) {
    return (
      <span className="st-note">
        <Rest d={ev.d} />
      </span>
    )
  }
  const notes = notesOf(ev)
  const d = ev.d
  const filled = d < 4
  const stem = d < 8
  const dot = d === 3 || d === 6
  const avg = notes.reduce((s, n) => s + n.step, 0) / notes.length
  const up = beam ? beam.up : avg < 4 // sous la ligne du milieu : hampe vers le haut
  const flag = d === 1 && !beam
  // Accord : une seule hampe, attachée à la note la plus éloignée de la ligature
  const anchor = notes.reduce((a, n) => (up ? (n.step < a.step ? n : a) : n.step > a.step ? n : a), notes[0])
  const stemTo = beam ? beam.beamY : notes.length > 1 ? (up ? yOf(Math.max(...notes.map((n) => n.step))) - 28 : yOf(Math.min(...notes.map((n) => n.step))) + 28) : undefined
  return (
    <>
      <span className="st-note">
        {notes.map((n, k) => (
          <Note key={k} step={n.step} filled={filled} dot={dot} sharp={n.sharp} up={up} stem={stem && n === anchor} flag={flag} stemTo={stemTo} />
        ))}
      </span>
      {beam && !beam.last && <span className={`st-beam ${beam.up ? 'up' : 'down'}`} style={{ top: beam.beamY - (beam.up ? 0 : 4) }} />}
    </>
  )
}

// Nom de la note jouée (la plus grave si plusieurs)
export function noteNameOf(ev, note) {
  if (!ev.n.length) return ''
  const names = ev.n.map(([s, f]) => note(writtenMidi(s, f) % 12))
  return names.length > 2 ? names[names.length - 1] + '…' : names.join('+')
}

// Clé de sol simplifiée, dessinée à la main (pas de police musicale nécessaire)
export function TrebleClef() {
  const g = BOTTOM - GAP // ligne du Sol
  return (
    <svg className="st-clef" viewBox={`0 0 30 ${STAFF_HEIGHT}`} width="30" height={STAFF_HEIGHT} aria-label="Clé de sol">
      {[0, 1, 2, 3, 4].map((k) => (
        <line key={k} x1="0" x2="30" y1={BOTTOM - k * GAP} y2={BOTTOM - k * GAP} className="st-clef-line" />
      ))}
      <path
        className="st-clef-path"
        d={`M16 ${BOTTOM + 22} C 10 ${BOTTOM + 24}, 8 ${BOTTOM + 15}, 14 ${BOTTOM + 14}
            M16 ${BOTTOM + 22} L 16 ${BOTTOM - 44} C 16 ${BOTTOM - 54}, 25 ${BOTTOM - 52}, 23 ${BOTTOM - 42}
            C 21 ${BOTTOM - 31}, 6 ${BOTTOM - 24}, 6 ${g - 2} C 6 ${g + 12}, 24 ${g + 12}, 24 ${g + 1}
            C 24 ${g - 8}, 13 ${g - 9}, 12 ${g}`}
      />
    </svg>
  )
}
