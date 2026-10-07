import { CHORDS } from '../data/chords.js'

export default function ChordSelect({ value, onChange, label }) {
  return (
    <label className="field">
      {label && <span>{label}</span>}
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        {CHORDS.map((c) => (
          <option key={c.id} value={c.id}>
            {c.id} — {c.fr}
          </option>
        ))}
      </select>
    </label>
  )
}
