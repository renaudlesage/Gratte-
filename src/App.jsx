import { useEffect, useState } from 'react'
import { ProgressProvider } from './lib/progress.jsx'
import Home from './components/Home.jsx'
import Lessons from './components/Lessons.jsx'
import ChordLibrary from './components/ChordLibrary.jsx'
import MinuteChallenge from './components/MinuteChallenge.jsx'
import ChordFlow from './components/ChordFlow.jsx'
import Strumming from './components/Strumming.jsx'
import Tuner from './components/Tuner.jsx'
import Metronome from './components/Metronome.jsx'
import Tabs from './components/Tabs.jsx'

const NAV = [
  ['accueil', 'Accueil', '⌂'],
  ['lecons', 'Leçons', '☰'],
  ['accords', 'Accords', '▦'],
  ['pratique', 'Pratique', '◎'],
  ['outils', 'Outils', '♩'],
]
const TAB_IDS = NAV.map((n) => n[0])

const readHash = () => {
  const t = window.location.hash.replace('#/', '').split('/')[0]
  return TAB_IDS.includes(t) ? t : 'accueil'
}

function Practice({ params }) {
  const [mode, setMode] = useState(params.mode || 'minute')
  useEffect(() => {
    if (params.mode) setMode(params.mode)
  }, [params])
  return (
    <>
      <Tabs tabs={[['minute', 'Défi minute'], ['enchainement', 'Enchaînement'], ['rythmes', 'Rythmes']]} value={mode} onChange={setMode} />
      {mode === 'minute' && <MinuteChallenge params={params.mode === 'minute' ? params : {}} />}
      {mode === 'enchainement' && <ChordFlow params={params.mode === 'enchainement' ? params : {}} />}
      {mode === 'rythmes' && <Strumming params={params.mode === 'rythmes' ? params : {}} />}
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
      <Tabs tabs={[['accordeur', 'Accordeur'], ['metronome', 'Métronome']]} value={tool} onChange={setTool} />
      {tool === 'accordeur' ? <Tuner /> : <Metronome />}
    </>
  )
}

const TITLES = { accueil: null, lecons: 'Leçons', accords: 'Dictionnaire d’accords', pratique: 'Pratique', outils: 'Outils' }

export default function App() {
  const [route, setRoute] = useState({ tab: readHash(), params: {} })

  useEffect(() => {
    const onHash = () => setRoute((r) => (r.tab === readHash() ? r : { tab: readHash(), params: {} }))
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  const navigate = (tab, params = {}) => {
    setRoute({ tab, params: { ...params, _k: Date.now() } })
    if (readHash() !== tab) window.location.hash = `#/${tab}`
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const { tab, params } = route

  return (
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
        </header>

        <main className="content">
          {TITLES[tab] && <h2 className="page-title">{TITLES[tab]}</h2>}
          {tab === 'accueil' && <Home navigate={navigate} />}
          {tab === 'lecons' && <Lessons params={params} navigate={navigate} />}
          {tab === 'accords' && <ChordLibrary params={params} />}
          {tab === 'pratique' && <Practice params={params} />}
          {tab === 'outils' && <Tools params={params} />}
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
  )
}
