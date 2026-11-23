// Texte de leçon : {Em} est remplacé par le nom de l'accord dans la notation choisie (Em ou Mim)
export const chordText = (s, label = (c) => c) => String(s ?? '').replace(/\{([^}]+)\}/g, (_, c) => label(c))
