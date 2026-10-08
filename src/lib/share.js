// Partage d'une grille par lien : la grille est encodée dans l'adresse (#g=…), sans serveur.
const toB64Url = (bytes) => {
  let bin = ''
  bytes.forEach((b) => (bin += String.fromCharCode(b)))
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
const fromB64Url = (s) => {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4)
  const bin = atob(b64)
  return Uint8Array.from(bin, (c) => c.charCodeAt(0))
}

export function encodeSong(song) {
  const data = { t: song.title, b: song.bpm, m: song.beats, x: song.text, ...(song.band && song.band !== 'aucun' ? { g: song.band } : {}) }
  return toB64Url(new TextEncoder().encode(JSON.stringify(data)))
}

export function decodeSong(code) {
  try {
    const d = JSON.parse(new TextDecoder().decode(fromB64Url(code)))
    if (typeof d.x !== 'string' || !d.x.trim()) return null
    return {
      title: String(d.t || 'Grille partagée').slice(0, 120),
      bpm: Math.max(40, Math.min(200, Number(d.b) || 90)),
      beats: d.m === 3 ? 3 : 4,
      text: d.x.slice(0, 8000),
      band: typeof d.g === 'string' ? d.g : undefined,
    }
  } catch {
    return null
  }
}

export const shareLink = (song) => `${window.location.origin}${window.location.pathname}#g=${encodeSong(song)}`
