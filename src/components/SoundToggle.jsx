import { VOICES, strum } from '../lib/audio.js'
import { useSettings } from '../lib/settings.jsx'

// Choix rapide du timbre ; joue un accord de Sol pour entendre la différence
export default function SoundToggle() {
  const { voice, update } = useSettings()
  const choose = (id) => {
    update({ voice: id })
    strum([3, 2, 0, 0, 0, 3])
  }
  return (
    <div className="sound-toggle" role="group" aria-label="Son de guitare">
      {VOICES.map(([id, label]) => (
        <button key={id} type="button" aria-pressed={voice === id} className={voice === id ? 'on' : ''} onClick={() => choose(id)}>
          {label}
        </button>
      ))}
    </div>
  )
}
