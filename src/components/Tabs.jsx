// Sélecteur de sous-section : boutons à bascule (aria-pressed), plus simple et robuste
// qu'une tablist complète puisque le contenu affiché n'est pas un panneau associé.
export default function Tabs({ tabs, value, onChange, scroll = false, label = 'Sous-sections' }) {
  return (
    <div className={`subtabs${scroll ? ' scroll' : ''}`} role="group" aria-label={label}>
      {tabs.map(([id, text]) => (
        <button key={id} type="button" aria-pressed={value === id} className={value === id ? 'on' : ''} onClick={() => onChange(id)}>
          {text}
        </button>
      ))}
    </div>
  )
}
