import { CHORDS } from '../data/chords.js'
import { useSettings } from '../lib/settings.jsx'

export default function ChordSelect({ value, onChange, label, id }) {
  const { label: name } = useSettings()
  return (
    <label className="field">
      {label && <span>{label}</span>}
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)}>
        {CHORDS.map((c) => (
          <option key={c.id} value={c.id}>
            {name(c.id)} — {c.fr}
          </option>
        ))}
      </select>
    </label>
  )
}
