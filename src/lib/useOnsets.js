import { useCallback, useEffect, useRef, useState } from 'react'
import { getCtx } from './audio.js'
import { createOnsetDetector } from './onset.js'

// Code du processeur audio : le détecteur est injecté comme expression (résiste à la minification)
const WORKLET = `
const makeDetector = (${createOnsetDetector.toString()});
class GratteOnsets extends AudioWorkletProcessor {
  constructor() { super(); this.d = makeDetector(sampleRate); }
  process(inputs) {
    const ch = inputs[0] && inputs[0][0];
    if (ch) { const on = this.d.process(ch, currentTime); if (on.length) this.port.postMessage(on); }
    return true;
  }
}
registerProcessor('gratte-onsets', GratteOnsets);
`

let workletReady = null

// Écoute le micro et signale chaque coup (heure sur l'horloge audio, non corrigée de la latence)
export function useOnsets(onOnsets) {
  const [listening, setListening] = useState(false)
  const [error, setError] = useState('')
  const cb = useRef(onOnsets)
  cb.current = onOnsets
  const res = useRef({})

  const stop = useCallback(() => {
    const r = res.current
    r.stream?.getTracks().forEach((t) => t.stop())
    try {
      r.source?.disconnect()
      r.node?.disconnect()
    } catch {
      /* déjà déconnecté */
    }
    res.current = {}
    setListening(false)
  }, [])

  useEffect(() => stop, [stop])

  const start = useCallback(async () => {
    setError('')
    if (!navigator.mediaDevices?.getUserMedia) {
      setError("Ce navigateur ne donne pas accès au micro. Ouvrez l'appli en HTTPS.")
      return false
    }
    try {
      // L'annulation d'écho retire le son du téléphone (clic) de ce que capte le micro
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: false, autoGainControl: false },
      })
      const c = getCtx()
      const source = c.createMediaStreamSource(stream)
      const sink = c.createGain()
      sink.gain.value = 0
      sink.connect(c.destination)
      let node
      if (c.audioWorklet && window.AudioWorkletNode) {
        if (!workletReady) {
          const url = URL.createObjectURL(new Blob([WORKLET], { type: 'application/javascript' }))
          workletReady = c.audioWorklet.addModule(url)
        }
        await workletReady
        node = new AudioWorkletNode(c, 'gratte-onsets')
        node.port.onmessage = (e) => cb.current?.(e.data)
      } else {
        // Repli pour les anciens navigateurs
        const det = createOnsetDetector(c.sampleRate)
        node = c.createScriptProcessor(1024, 1, 1)
        node.onaudioprocess = (e) => {
          const data = e.inputBuffer.getChannelData(0)
          const on = det.process(data, c.currentTime - data.length / c.sampleRate)
          if (on.length) cb.current?.(on)
        }
      }
      source.connect(node)
      node.connect(sink)
      res.current = { stream, source, node }
      setListening(true)
      return true
    } catch (e) {
      setError(
        e?.name === 'NotAllowedError'
          ? 'Le micro est refusé ou indisponible ici. Autorisez-le pour ce site (en HTTPS).'
          : "Impossible d'ouvrir le micro : " + (e?.message || e),
      )
      return false
    }
  }, [])

  return { listening, error, start, stop }
}
