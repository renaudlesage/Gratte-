// Ce qu'un écran de destination demande comme activation (mode élève). Partagé par App, Lessons et le coach.
export const PRACTICE_IDS = ['minute', 'enchainement', 'rythmes', 'arpeges', 'tabs', 'oreille', 'rappel']
export const TOOL_IDS = ['accordeur', 'metronome', 'enregistrer']

export const practiceAllowed = (a, id) => (id === 'tabs' ? a.canAny('tab') || a.canAny('score') : a.can('pratique.' + id))

export function navAllowed(a, id) {
  if (id === 'lecons') return a.canAny('lecon')
  if (id === 'accords') return a.can('accords')
  if (id === 'pratique') return PRACTICE_IDS.some((p) => practiceAllowed(a, p))
  if (id === 'chansons') return a.canAny('chanson')
  if (id === 'outils') return TOOL_IDS.some((t) => a.can('outils.' + t))
  if (id === 'prof') return a.mode === 'prof' || a.mode === 'admin'
  return true
}

// La destination précise (onglet + paramètres) est-elle ouverte ? Ex. : pratique/minute, outils/accordeur, une leçon, une chanson
export function targetAllowed(a, tab, params = {}) {
  if (!a || a.mode !== 'eleve') return true
  if (tab === 'pratique') {
    if (params.mode === 'tabs') return params.tab ? a.can('tab:' + params.tab) : practiceAllowed(a, 'tabs')
    return params.mode ? practiceAllowed(a, params.mode) : navAllowed(a, 'pratique')
  }
  if (tab === 'outils') return params.tool ? a.can('outils.' + params.tool) : navAllowed(a, 'outils')
  if (tab === 'lecons') return params.id ? a.can('lecon:' + params.id) : navAllowed(a, 'lecons')
  if (tab === 'chansons') return params.song ? a.can('chanson:' + params.song) : navAllowed(a, 'chansons')
  return navAllowed(a, tab)
}
