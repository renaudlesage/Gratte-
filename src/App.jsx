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
import { AccessProvider, useAccess } from './lib/access.jsx'
import { StudentHome } from './components/Account.jsx'
import ProfPanel from './components/ProfPanel.jsx'

const NAV = [
  ['accueil', 'Accueil', '⌂'],
  ['lecons', 'Leçons', '☰'],
  ['accords', 'Accords', '▦'],
  ['pratique', 'Pratique', '◎'],
  ['chansons', 'Chansons', '♫'],
  ['outils', 'Outils', '♩'],
]
const TAB_IDS = [...NAV.map((n) => n[0]), 'reglages', 'progres', 'prof']

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
  ['tabs', 'Partitions'],
  ['oreille', 'Oreille'],
]

// Onglets visibles selon les activations (mode élève) ; partitions : dès qu'une tablature ou une page est activée
const practiceAllowed = (a, id) => (id === 'tabs' ? a.canAny('tab') || a.canAny('score') : a.can('pratique.' + id))
const PRACTICE_IDS = PRACTICE.map((p) => p[0])
const TOOLS = [['accordeur', 'Accordeur'], ['metronome', 'Métronome'], ['enregistrer', 'Enregistrer']]
function navAllowed(a, id) {
  if (id === 'lecons') return a.canAny('lecon')
  if (id === 'accords') return a.can('accords')
  if (id === 'pratique') return PRACTICE_IDS.some((p) => practiceAllowed(a, p))
  if (id === 'chansons') return a.canAny('chanson')
  if (id === 'outils') return TOOLS.some(([t]) => a.can('outils.' + t))
  if (id === 'prof') return a.mode === 'prof' || a.mode === 'admin'
  return true
}

function Practice({ params }) {
  const a = useAccess()
  const tabs = PRACTICE.filter(([id]) => practiceAllowed(a, id))
  const [chosen, setMode] = useState(params.mode || 'minute')
  const mode = tabs.some(([id]) => id === chosen) ? chosen : tabs[0]?.[0]
  const { lessonDone } = useProgress()
  useEffect(() => {
    if (params.mode) setMode(params.mode)
  }, [params])
  const own = params.mode === mode ? params : {}
  return (
    <>
      <Tabs tabs={tabs} value={mode} onChange={setMode} scroll />
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
  const a = useAccess()
  const tools = TOOLS.filter(([id]) => a.can('outils.' + id))
  const [chosen, setTool] = useState(params.tool || 'accordeur')
  const tool = tools.some(([id]) => id === chosen) ? chosen : tools[0]?.[0]
  useEffect(() => {
    if (params.tool) setTool(params.tool)
  }, [params])
  return (
    <>
      <Tabs tabs={tools} value={tool} onChange={setTool} />
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
  prof: 'Espace prof',
}

export default function App() {
  return (
    <AccessProvider>
      <Shell />
    </AccessProvider>
  )
}

function Shell() {
  const access = useAccess()
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

  const nav = NAV.filter(([id]) => navAllowed(access, id))
  // Onglet non autorisé (élève) : retour à l'accueil
  const tab = navAllowed(access, route.tab) ? route.tab : 'accueil'
  const { params } = route

  return (
    <SettingsProvider>
      <ProgressProvider>
        <div className="app">
          <header className="topbar">
            <button className="brand" onClick={() => navigate('accueil')}>
              <span className="brand-mark">◐</span> Gratte
            </button>
            <nav className="nav-desktop">
              {nav.map(([id, label]) => (
                <button key={id} className={tab === id ? 'on' : ''} onClick={() => navigate(id)}>{label}</button>
              ))}
            </nav>
            <div className="topbar-right">
              {access.mode === 'eleve' && <span className="role-chip" title={access.student.classe}>🎒 {access.student.prenom}</span>}
              {(access.mode === 'prof' || access.mode === 'admin') && (
                <button className={`icon-btn${tab === 'prof' ? ' on' : ''}`} onClick={() => navigate('prof')} aria-label="Espace prof" title="Espace prof">🎓</button>
              )}
              <SoundToggle />
              <button className={`icon-btn${tab === 'reglages' ? ' on' : ''}`} onClick={() => navigate('reglages')} aria-label="Réglages" title="Réglages">
                ⚙
              </button>
            </div>
          </header>

          <main className="content">
            {TITLES[tab] && <h2 className="page-title">{TITLES[tab]}</h2>}
            {tab === 'accueil' && (access.mode === 'eleve' ? <StudentHome navigate={navigate} /> : <Home navigate={navigate} />)}
            {tab === 'prof' && <ProfPanel />}
            {tab === 'lecons' && <Lessons params={params} navigate={navigate} />}
            {tab === 'accords' && <ChordLibrary params={params} />}
            {tab === 'pratique' && <Practice params={params} />}
            {tab === 'chansons' && <Songs params={params} />}
            {tab === 'outils' && <Tools params={params} />}
            {tab === 'reglages' && <Settings />}
            {tab === 'progres' && <Progress />}
          </main>

          <nav className="nav-mobile">
            {nav.map(([id, label, icon]) => (
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
