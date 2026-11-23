import { useAccess } from './access.jsx'

// Vouvoiement par défaut, tutoiement en mode élève (classe) : t('Votre séance', 'Ta séance')
export function useAddress() {
  const access = useAccess()
  const tu = access?.mode === 'eleve'
  return (vous, tuText) => (tu ? tuText : vous)
}
