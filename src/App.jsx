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
import Progress from './components/Progress.jsx'
import Recorder from './components/Recorder.jsx'
import ChordRecall from './components/ChordRecall.jsx'
import { decodeSong } from './lib/share.js'
import { AccessProvider, useAccess } from './lib/access.jsx'
import { StudentHome } from './components/Account.jsx'
import ProfPanel from './components/ProfPanel.jsx'
import { SessionBar } from './components/Coach.jsx'
import BadgeToast from './components/BadgeToast.jsx'
import StudentSync from './components/StudentSync.jsx'
import { navAllowed, practiceAllowed } from './lib/navAccess.js'

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
  ['rappel', 'Rappel'],
]

// Onglets visibles selon les activations (mode élève) : voir lib/navAccess.js
const TOOLS = [['accordeur', 'Accordeur'], ['metronome', 'Métronome'], ['enregistrer', 'Enregistrer']]

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
      {mode === 'rappel' && <ChordRecall knownChords={knownChords(lessonDone)} />}
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
        <StudentSync />
        <div className="app">
          <header className="topbar">
            <button className="brand" onClick={() => navigate('accueil')}>
              <span className="brand-mark" aria-hidden="true">◐</span> Gratte
            </button>
            <nav className="nav-desktop" aria-label="Navigation principale">
              {nav.map(([id, label]) => (
                <button key={id} className={tab === id ? 'on' : ''} aria-current={tab === id ? 'page' : undefined} onClick={() => navigate(id)}>{label}</button>
              ))}
            </nav>
            <div className="topbar-right">
              {access.mode === 'eleve' && <span className="role-chip" title={access.student.classe}>🎒 {access.student.prenom}</span>}
              {(access.mode === 'prof' || access.mode === 'admin') && (
                <button className={`icon-btn${tab === 'prof' ? ' on' : ''}`} onClick={() => navigate('prof')} aria-label="Espace prof" title="Espace prof" aria-current={tab === 'prof' ? 'page' : undefined}>🎓</button>
              )}
              <button className={`head-btn${tab === 'progres' ? ' on' : ''}`} onClick={() => navigate('progres')} title="Mes progrès" aria-current={tab === 'progres' ? 'page' : undefined}>
                <span className="head-btn-icon" aria-hidden="true">📈</span> Progrès
              </button>
              <button className={`icon-btn${tab === 'reglages' ? ' on' : ''}`} onClick={() => navigate('reglages')} aria-label="Réglages" title="Réglages" aria-current={tab === 'reglages' ? 'page' : undefined}>
                ⚙
              </button>
            </div>
          </header>

          <main className="content">
            <SessionBar tab={tab} navigate={navigate} />
            {TITLES[tab] && <h1 className="page-title">{TITLES[tab]}</h1>}
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

          <BadgeToast navigate={navigate} />

          <nav className="nav-mobile" aria-label="Navigation principale">
            {nav.map(([id, label, icon]) => (
              <button key={id} className={tab === id ? 'on' : ''} aria-current={tab === id ? 'page' : undefined} onClick={() => navigate(id)}>
                <span className="nav-icon" aria-hidden="true">{icon}</span>
                <span>{label}</span>
              </button>
            ))}
          </nav>
        </div>
      </ProgressProvider>
    </SettingsProvider>
  )
}
