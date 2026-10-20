import { useEffect, useRef, useState } from 'react'

// Commandes vocales (Web Speech API). Chrome sur Android, ordinateur et DeX : la reconnaissance
// passe par le service vocal de Google (connexion nécessaire). Non disponible sur Firefox.
const Recognition = typeof window !== 'undefined' ? window.SpeechRecognition || window.webkitSpeechRecognition : null
export const voiceSupported = () => !!Recognition

const NUMBERS = {
  un: 1, une: 1, deux: 2, trois: 3, quatre: 4, cinq: 5, six: 6, sept: 7, huit: 8, neuf: 9, dix: 10,
  onze: 11, douze: 12, treize: 13, quatorze: 14, quinze: 15, seize: 16, 'dix-sept': 17, 'dix-huit': 18,
  'dix-neuf': 19, vingt: 20, trente: 30, quarante: 40, cinquante: 50, soixante: 60, septante: 70,
  'soixante-dix': 70, octante: 80, huitante: 80, 'quatre-vingt': 80, 'quatre-vingts': 80, nonante: 90,
  'quatre-vingt-dix': 90, cent: 100,
}
const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[’']/g, ' ').replace(/\s+/g, ' ').trim()

// Lit un nombre écrit en chiffres ou en toutes lettres (jusqu'à 199, belgicismes compris)
export function readNumber(text) {
  const d = text.match(/\d+/)
  if (d) return Number(d[0])
  const words = text.split(/\s+/)
  let total = 0
  let found = false
  for (let w of words) {
    w = w.replace(/^et$/, '')
    if (!w) continue
    const parts = NUMBERS[w] !== undefined ? [w] : w.split('-')
    for (const p of parts) {
      if (NUMBERS[p] !== undefined) {
        total += NUMBERS[p]
        found = true
      }
    }
  }
  return found ? total : null
}

// Reconnaît une commande dans une phrase. Ordre : les formulations les plus précises d'abord.
export function parseCommand(raw) {
  const t = norm(raw)
  if (!t) return null
  const num = () => readNumber(t.replace(/.*?(tempo|vitesse|bpm)\s/, ''))
  if (/\b(au debut|du debut|depuis le debut|recommence|on recommence|reprends? (tout|depuis)|retour au debut|debut)\b/.test(t)) return { type: 'restart' }
  if (/\bmesure\b/.test(t)) {
    const n = readNumber(t.split(/mesure/).pop())
    if (n) return { type: 'bar', n }
    if (/\b(encore|repete|refais|reprends?|meme)\b/.test(t)) return { type: 'bar-again' }
  }
  if (/\b(tempo|bpm|vitesse)\b/.test(t)) {
    const n = num()
    if (n && n >= 20 && n <= 240) return { type: 'bpm', n }
  }
  if (/\b(stop|stoppe|arrete|arretez|pause|halte|silence|attends)\b/.test(t)) return { type: 'stop' }
  if (/\b(continue|reprends|reprise|on reprend)\b/.test(t)) return { type: 'resume' }
  if (/\b(encore|repete|refais)\b/.test(t)) return { type: 'bar-again' }
  if (/\b(beaucoup plus vite|bien plus vite)\b/.test(t)) return { type: 'faster', step: 10 }
  if (/\b(beaucoup moins vite|bien moins vite|beaucoup plus lent)\b/.test(t)) return { type: 'slower', step: 10 }
  if (/\b(plus vite|accelere|plus rapide)\b/.test(t)) return { type: 'faster', step: 5 }
  if (/\b(moins vite|ralentis|ralenti|plus lent|plus lentement|doucement)\b/.test(t)) return { type: 'slower', step: 5 }
  if (/\b(joue|jouer|lecture|lis|lire|commence|vas[ -]y|va[ -]y|allez|go|play|demarre|partez)\b/.test(t)) return { type: 'play' }
  if (/\b(plus grand|agrandis|zoom avant|plus gros)\b/.test(t)) return { type: 'zoom', dir: 1 }
  if (/\b(plus petit|reduis|zoom arriere)\b/.test(t)) return { type: 'zoom', dir: -1 }
  if (/\b(sans boucle|pas en boucle|une seule fois|arrete la boucle)\b/.test(t)) return { type: 'loop', on: false }
  if (/\b(en boucle|boucle)\b/.test(t)) return { type: 'loop', on: true }
  if (/\b(sans accords?|enleve les accords|coupe les accords)\b/.test(t)) return { type: 'chords', on: false }
  if (/\b(avec (les )?accords?|accords?|accompagnement)\b/.test(t)) return { type: 'chords', on: true }
  if (/\b(les deux)\b/.test(t)) return { type: 'view', view: 'both' }
  if (/\b(tablature|tab)\b/.test(t)) return { type: 'view', view: 'tab' }
  if (/\b(partition|portee)\b/.test(t)) return { type: 'view', view: 'staff' }
  if (/\b(morceau suivant|suivant|chanson suivante)\b/.test(t)) return { type: 'next' }
  if (/\b(morceau precedent|precedent|chanson precedente)\b/.test(t)) return { type: 'prev' }
  if (/\b(quitte|quitter|sortir|ferme|fermer)\b/.test(t)) return { type: 'stage', on: false }
  if (/\b(pupitre|plein ecran)\b/.test(t)) return { type: 'stage', on: true }
  return null
}

export const VOICE_HELP = [
  ['« Joue », « Vas-y »', 'lance la lecture'],
  ['« Stop », « Pause »', 'arrête'],
  ['« Reprends », « Continue »', 'repart au début de la mesure où l’on s’était arrêté'],
  ['« Au début », « Recommence »', 'reprend tout depuis le début'],
  ['« Mesure 5 »', 'joue à partir de la mesure 5'],
  ['« Encore »', 'rejoue la mesure en cours'],
  ['« Plus vite », « Moins vite »', '± 5 BPM (« beaucoup plus vite » : ± 10)'],
  ['« Tempo 80 »', 'règle le tempo'],
  ['« Plus grand », « Plus petit »', 'taille de la partition'],
  ['« Partition », « Tablature », « Les deux »', 'affichage'],
  ['« En boucle », « Une seule fois », « Accords »', 'options de lecture'],
  ['« Suivant », « Précédent »', 'change de morceau'],
  ['« Pupitre », « Quitter »', 'mode plein écran'],
]

// Écoute en continu tant que `enabled` : relance automatique (Chrome coupe après un silence),
// réaction dès le résultat provisoire pour plus de réactivité, sans déclencher deux fois la même phrase.
export function useVoiceCommands(enabled, onCommand) {
  const [state, setState] = useState({ listening: false, heard: '', error: '' })
  const cb = useRef(onCommand)
  cb.current = onCommand

  useEffect(() => {
    if (!enabled || !Recognition) {
      setState((s) => ({ ...s, listening: false }))
      return undefined
    }
    let stopped = false
    let rec = null
    let lastCmd = { key: '', at: 0 }
    const handled = new Set()
    let restartTimer = null

    const start = () => {
      if (stopped) return
      rec = new Recognition()
      rec.lang = 'fr-FR'
      rec.continuous = true
      rec.interimResults = true
      rec.maxAlternatives = 3
      rec.onstart = () => setState((s) => ({ ...s, listening: true, error: '' }))
      rec.onresult = (e) => {
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const r = e.results[i]
          const text = r[0].transcript
          setState((s) => ({ ...s, heard: text.trim() }))
          if (handled.has(i)) continue
          let cmd = null
          for (let a = 0; a < r.length && !cmd; a++) cmd = parseCommand(r[a].transcript)
          if (!cmd) continue
          // Une phrase provisoire peut encore s'allonger (« mesure » → « mesure 12 ») : on attend la fin pour ces cas
          if (!r.isFinal && (cmd.type === 'bar-again' || /mesure|tempo|bpm/.test(norm(text)))) continue
          handled.add(i)
          const key = JSON.stringify(cmd)
          const now = Date.now()
          if (key === lastCmd.key && now - lastCmd.at < 1500) continue
          lastCmd = { key, at: now }
          cb.current(cmd, text.trim())
        }
      }
      rec.onerror = (e) => {
        if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
          stopped = true
          setState({ listening: false, heard: '', error: 'Micro refusé : autorisez-le pour ce site dans le navigateur.' })
        } else if (e.error === 'network') {
          setState((s) => ({ ...s, error: 'La reconnaissance vocale demande une connexion internet.' }))
        }
      }
      rec.onend = () => {
        handled.clear()
        setState((s) => ({ ...s, listening: false }))
        if (!stopped) restartTimer = setTimeout(start, 250)
      }
      try {
        rec.start()
      } catch {
        restartTimer = setTimeout(start, 1000)
      }
    }
    start()
    return () => {
      stopped = true
      clearTimeout(restartTimer)
      try {
        rec?.abort()
      } catch {
        /* déjà arrêtée */
      }
    }
  }, [enabled])

  return state
}
