import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { getVoice, setVoice as setAudioVoice } from './audio.js'
import { chordLabel, noteName } from './music.js'

const KEY = 'gratte.settings.v1'
const DEFAULTS = { notation: 'en', lefty: false, rhythmLatency: null, theme: 'sombre', tuning: 'standard', reminder: null }

function load() {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || '{}') }
  } catch {
    return DEFAULTS
  }
}

const SettingsContext = createContext(null)

export function SettingsProvider({ children }) {
  const [s, setS] = useState(() => ({ ...load(), voice: getVoice() }))

  const update = useCallback((patch) => {
    setS((prev) => {
      const next = { ...prev, ...patch }
      if (patch.voice) setAudioVoice(patch.voice)
      try {
        const { voice, ...rest } = next
        localStorage.setItem(KEY, JSON.stringify(rest))
      } catch {
        /* stockage indisponible */
      }
      return next
    })
  }, [])

  // Thème : sombre (défaut), clair ou automatique (suit le système)
  useEffect(() => {
    const root = document.documentElement
    if (s.theme === 'clair') root.dataset.theme = 'light'
    else if (s.theme === 'auto') delete root.dataset.theme
    else root.dataset.theme = 'dark'
  }, [s.theme])

  const value = useMemo(
    () => ({
      ...s,
      update,
      label: (name) => chordLabel(name, s.notation),
      note: (pc) => noteName(pc, s.notation),
    }),
    [s, update],
  )
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
}

export const useSettings = () => useContext(SettingsContext)
