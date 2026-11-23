// Messages d'erreur du micro, en français, sans texte technique du navigateur

// Le navigateur n'offre pas getUserMedia (souvent : page servie sans HTTPS)
export function micUnavailableMessage() {
  if (typeof window !== 'undefined' && window.isSecureContext === false) {
    return 'Le micro demande une connexion sécurisée (HTTPS). Ouvrez l’appli à son adresse en https://.'
  }
  return 'Ce navigateur ne donne pas accès au micro. Essayez une version récente de Chrome, Safari ou Firefox.'
}

// Traduit l'erreur levée par getUserMedia (ou par l'ouverture du flux audio)
export function micErrorMessage(e) {
  const name = e?.name || ''
  if (typeof window !== 'undefined' && window.isSecureContext === false) return micUnavailableMessage()
  switch (name) {
    case 'NotAllowedError':
    case 'PermissionDeniedError':
      return 'L’accès au micro a été refusé. Autorisez le micro pour ce site dans les réglages du navigateur, puis réessayez.'
    case 'NotFoundError':
    case 'DevicesNotFoundError':
      return 'Aucun micro détecté sur cet appareil.'
    case 'NotReadableError':
    case 'TrackStartError':
      return 'Le micro est utilisé par une autre application. Fermez-la, puis réessayez.'
    case 'SecurityError':
      return 'Le micro demande une connexion sécurisée (HTTPS).'
    case 'OverconstrainedError':
    case 'ConstraintNotSatisfiedError':
      return 'Le micro de cet appareil ne prend pas en charge les réglages demandés. Essayez avec un autre micro.'
    case 'AbortError':
      return 'L’ouverture du micro a été interrompue. Réessayez.'
    default:
      return 'Impossible d’ouvrir le micro. Vérifiez qu’il est branché et autorisé, puis réessayez.'
  }
}
