import { useState } from 'react'
import { VOICES, getVoice, setVoice, strum } from '../lib/audio.js'

// Choix du timbre de guitare ; joue un accord de Sol pour entendre la différence
export default function SoundToggle() {
  const [v, setV] = useState(getVoice)
  const choose = (id) => {
    setVoice(id)
    setV(id)
    strum([3, 2, 0, 0, 0, 3])
  }
  return (
    <div className="sound-toggle" role="radiogroup" aria-label="Son de guitare">
      {VOICES.map(([id, label]) => (
        <button key={id} role="radio" aria-checked={v === id} className={v === id ? 'on' : ''} onClick={() => choose(id)}>
          {label}
        </button>
      ))}
    </div>
  )
}
