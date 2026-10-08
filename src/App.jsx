import { useEffect, useState } from 'react'
import { ProgressProvider, useProgress } from './lib/progress.jsx'
import { SettingsProvider } from './lib/settings.jsx'
import { knownChords } from './lib/coach.js'
import Home from './components/Home.jsx'
import Lessons from './components/Lessons.jsx'
import ChordLibrary from './components/ChordLibrary.jsx'
import MinuteChallenge from './components/MinuteChallenge.jsx'
import ChordFlow from './components/ChordFlow.jsx'
import Strumming from './components/Strumming.jsx'
import Arpeggios from './components/Arpeggios.jsx'
import EarTraining from './components/EarTraining.jsx'
import TabPlayer from './components/TabPlayer.jsx'
import Songs from './components/Songs.jsx'
import Tuner from './components/Tuner.jsx'
import Metronome from './components/Metronome.jsx'
import Settings from './components/Settings.jsx'
import Tabs from './components/Tabs.jsx'
import SoundToggle from './components/SoundToggle.jsx'
import Progress from './components/Progress.jsx'
import Recorder from './components/Recorder.jsx'
import { decodeSong } from './lib/share.js'

const NAV = [
  ['accueil', 'Accueil', '⌂'],
  ['lecons', 'Leçons', '☰'],
  ['accords', 'Accords', '▦'],
  ['pratique', 'Pratique', '◎'],
  ['chansons', 'Chansons', '♫'],
  ['outils', 'Outils', '♩'],
]
const TAB_IDS = [...NAV.map((n) => n[0]), 'reglages', 'progres']

const readHash = () => {
  const t = window.location.hash.replace('#/', '').replace('#', '').split('/')[0]
  return TAB_IDS.includes(t) ? t : 'accueil'
}

// Lien de partage d'une grille (#g=…) : ouvre l'import dans Chansons
function sharedRoute() {
  const m = /^#g=([A-Za-z0-9_-]+)/.exec(window.location.hash)
  if (!m) return null
  const song = decodeSong(m[1])
  try {
    window.history.replaceState(null, '', window.location.pathname + '#chansons')
  } catch {
    /* sans historique : on garde l'adresse */
  }
  return song ? { tab: 'chansons', params: { importSong: song, _k: Date.now() } } : null
}

const PRACTICE = [
  ['minute', 'Défi minute'],
  ['enchainement', 'Enchaînement'],
  ['rythmes', 'Rythmes'],
  ['arpeges', 'Arpèges'],
  ['tabs', 'Tablatures'],
  ['oreille', 'Oreille'],
]

function Practice({ params }) {
  const [mode, setMode] = useState(params.mode || 'minute')
  const { lessonDone } = useProgress()
  useEffect(() => {
    if (params.mode) setMode(params.mode)
  }, [params])
  const own = params.mode === mode ? params : {}
  return (
    <>
      <Tabs tabs={PRACTICE} value={mode} onChange={setMode} scroll />
      {mode === 'minute' && <MinuteChallenge params={own} />}
      {mode === 'enchainement' && <ChordFlow params={own} />}
      {mode === 'rythmes' && <Strumming params={own} />}
      {mode === 'arpeges' && <Arpeggios params={own} />}
      {mode === 'tabs' && <TabPlayer params={own} />}
      {mode === 'oreille' && <EarTraining knownChords={knownChords(lessonDone)} />}
    </>
  )
}

function Tools({ params }) {
  const [tool, setTool] = useState(params.tool || 'accordeur')
  useEffect(() => {
    if (params.tool) setTool(params.tool)
  }, [params])
  return (
    <>
      <Tabs tabs={[['accordeur', 'Accordeur'], ['metronome', 'Métronome'], ['enregistrer', 'Enregistrer']]} value={tool} onChange={setTool} />
      {tool === 'accordeur' && <Tuner />}
      {tool === 'metronome' && <Metronome />}
      {tool === 'enregistrer' && <Recorder />}
    </>
  )
}

const TITLES = {
  accueil: null,
  lecons: 'Leçons',
  accords: 'Accords',
  pratique: 'Pratique',
  chansons: 'Chansons',
  outils: 'Outils',
  reglages: 'Réglages',
  progres: 'Mes progrès',
}

export default function App() {
  const [route, setRoute] = useState(() => sharedRoute() || { tab: readHash(), params: {} })

  useEffect(() => {
    const onHash = () => {
      const shared = sharedRoute()
      if (shared) setRoute(shared)
      else setRoute((r) => (r.tab === readHash() ? r : { tab: readHash(), params: {} }))
    }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  const navigate = (tab, params = {}) => {
    setRoute({ tab, params: { ...params, _k: Date.now() } })
    if (readHash() !== tab) window.location.hash = tab
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const { tab, params } = route

  return (
    <SettingsProvider>
      <ProgressProvider>
        <div className="app">
          <header className="topbar">
            <button className="brand" onClick={() => navigate('accueil')}>
              <span className="brand-mark">◐</span> Gratte
            </button>
            <nav className="nav-desktop">
              {NAV.map(([id, label]) => (
                <button key={id} className={tab === id ? 'on' : ''} onClick={() => navigate(id)}>{label}</button>
              ))}
            </nav>
            <div className="topbar-right">
              <SoundToggle />
              <button className={`icon-btn${tab === 'reglages' ? ' on' : ''}`} onClick={() => navigate('reglages')} aria-label="Réglages" title="Réglages">
                ⚙
              </button>
            </div>
          </header>

          <main className="content">
            {TITLES[tab] && <h2 className="page-title">{TITLES[tab]}</h2>}
            {tab === 'accueil' && <Home navigate={navigate} />}
            {tab === 'lecons' && <Lessons params={params} navigate={navigate} />}
            {tab === 'accords' && <ChordLibrary params={params} />}
            {tab === 'pratique' && <Practice params={params} />}
            {tab === 'chansons' && <Songs params={params} />}
            {tab === 'outils' && <Tools params={params} />}
            {tab === 'reglages' && <Settings />}
            {tab === 'progres' && <Progress />}
          </main>

          <nav className="nav-mobile">
            {NAV.map(([id, label, icon]) => (
              <button key={id} className={tab === id ? 'on' : ''} onClick={() => navigate(id)}>
                <span className="nav-icon">{icon}</span>
                <span>{label}</span>
              </button>
            ))}
          </nav>
        </div>
      </ProgressProvider>
    </SettingsProvider>
  )
}
