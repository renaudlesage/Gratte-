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

function Note({ step, filled, stem, flags = 0, dot, sharp, up, stemTo }) {
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
          {flags > 0 && <span className={`st-flag ${up ? 'up' : 'down'}`} />}
          {flags > 1 && <span className={`st-flag ${up ? 'up' : 'down'} second`} />}
        </span>
      )}
    </>
  )
}

// Durée en doubles croches (16 = ronde), quelle que soit l'unité du morceau (res = subdivisions par temps)
export const sixteenths = (d, res = 2) => (d * 4) / res

// Silences : demi-pause et pause en rectangles, soupir et demi-soupir en glyphes
function Rest({ q }) {
  if (q >= 16) return <span className="st-rest-block whole" style={{ top: yOf(6) }} />
  if (q >= 8) return <span className="st-rest-block half" style={{ top: yOf(4) - 4 }} />
  return <span className="st-rest-glyph" style={{ top: yOf(4) - 12 }}>{q >= 4 ? '𝄽' : q >= 2 ? '𝄾' : '𝄿'}</span>
}

// Notes altérées : le dièse n'est pas répété quand il figure à l'armure
const notesOf = (ev, keyPcs) =>
  ev.n.map(([s, f]) => {
    const m = writtenMidi(s, f)
    const isSharp = SHARP.has(m % 12)
    return { m, step: staffStep(isSharp ? m - 1 : m), sharp: isSharp && !(keyPcs && keyPcs.has(m % 12)) }
  })

// Armure : Fa#, puis Do#, Sol#… (positions sur la portée en clé de sol)
const KEY_SHARPS = [
  { pc: 6, step: 8 },
  { pc: 1, step: 5 },
  { pc: 8, step: 9 },
]
export const keyPcsOf = (sharps = 0) => new Set(KEY_SHARPS.slice(0, sharps).map((k) => k.pc))
export function KeySignature({ sharps = 0 }) {
  return KEY_SHARPS.slice(0, sharps).map((k, i) => (
    <span key={k.pc} className="st-keysig" style={{ left: 30 + i * 7, top: yOf(k.step) - 8 }}>♯</span>
  ))
}

// Ligatures : croches et doubles croches consécutives, regroupées par temps (3/4, doubles croches)
// ou par demi-mesure (croches en 2/4 et 4/4). Les doubles croches ont une 2e barre (entière ou crochet).
export function computeBeams(events, beats, res = 2, keyPcs) {
  const q = (k) => sixteenths(events[k].d, res)
  const groupLen = res > 2 || beats === 3 ? 4 : 8 // en doubles croches
  const out = events.map(() => null)
  let t = 0
  const starts = events.map((ev) => {
    const s = t
    t += sixteenths(ev.d, res)
    return s
  })
  let i = 0
  while (i < events.length) {
    const isBeamable = (k) => events[k] && q(k) < 4 && events[k].n.length > 0
    if (!isBeamable(i)) {
      i++
      continue
    }
    const win = Math.floor(starts[i] / groupLen)
    let j = i
    while (isBeamable(j + 1) && Math.floor(starts[j + 1] / groupLen) === win) j++
    if (j > i) {
      const group = []
      for (let k = i; k <= j; k++) group.push(notesOf(events[k], keyPcs))
      const all = group.flat()
      const up = all.reduce((a, n) => a + n.step, 0) / all.length < 4
      const beamY = up
        ? Math.min(...group.map((g) => yOf(Math.max(...g.map((n) => n.step))))) - 26
        : Math.max(...group.map((g) => yOf(Math.min(...g.map((n) => n.step))))) + 26
      for (let k = i; k <= j; k++) {
        // 2e barre des doubles croches : jusqu'à la note suivante si elle est aussi double croche, sinon crochet
        let sec = null
        if (q(k) === 1) {
          if (k < j && q(k + 1) === 1) sec = 'full'
          else if (k > i && q(k - 1) === 1) sec = null // déjà relié par la précédente
          else sec = k === j ? 'left' : 'right'
        }
        out[k] = { up, beamY, last: k === j, sec }
      }
    }
    i = j + 1
  }
  return out
}

export function StaffCell({ ev, beam, res = 2, keyPcs, tieNext }) {
  const q = sixteenths(ev.d, res)
  if (!ev.n.length) {
    return (
      <span className="st-note">
        <Rest q={q} />
      </span>
    )
  }
  const notes = notesOf(ev, keyPcs)
  const filled = q < 8
  const stem = q < 16
  const dot = q === 3 || q === 6 || q === 12
  const avg = notes.reduce((s, n) => s + n.step, 0) / notes.length
  const up = beam ? beam.up : avg < 4 // sous la ligne du milieu : hampe vers le haut
  const flags = beam ? 0 : q === 1 ? 2 : q < 4 ? 1 : 0
  // Accord : une seule hampe, attachée à la note la plus éloignée de la ligature
  const anchor = notes.reduce((a, n) => (up ? (n.step < a.step ? n : a) : n.step > a.step ? n : a), notes[0])
  const stemTo = beam ? beam.beamY : notes.length > 1 ? (up ? yOf(Math.max(...notes.map((n) => n.step))) - 28 : yOf(Math.min(...notes.map((n) => n.step))) + 28) : undefined
  return (
    <>
      <span className="st-note">
        {notes.map((n, k) => (
          <Note key={k} step={n.step} filled={filled} dot={dot} sharp={n.sharp} up={up} stem={stem && n === anchor} flags={flags} stemTo={stemTo} />
        ))}
      </span>
      {beam && !beam.last && <span className={`st-beam ${beam.up ? 'up' : 'down'}`} style={{ top: beam.beamY - (beam.up ? 0 : 4) }} />}
      {beam && beam.sec && (
        <span className={`st-beam ${beam.up ? 'up' : 'down'} sec-${beam.sec}`} style={{ top: beam.beamY + (beam.up ? 6 : -10) }} />
      )}
      {tieNext && <span className={`st-tie ${up ? 'below' : 'above'}`} style={{ top: up ? yOf(notes[0].step) + 4 : yOf(notes[0].step) - 10 }} />}
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
