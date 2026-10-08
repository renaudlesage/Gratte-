export default function Tabs({ tabs, value, onChange, scroll = false }) {
  return (
    <div className={`subtabs${scroll ? ' scroll' : ''}`} role="tablist">
      {tabs.map(([id, label]) => (
        <button key={id} role="tab" aria-selected={value === id} className={value === id ? 'on' : ''} onClick={() => onChange(id)}>
          {label}
        </button>
      ))}
    </div>
  )
}
