import { useCallback, useEffect, useRef, useState } from 'react'
import { getCtx } from './audio.js'
import { analyzeSpectrum } from './chordDetect.js'

const FFT = 16384

// Écoute le micro et fournit ~10 analyses par seconde : { analysis, rms }
export function useChordListener(onFrame) {
  const [listening, setListening] = useState(false)
  const [error, setError] = useState('')
  const cb = useRef(onFrame)
  cb.current = onFrame
  const res = useRef({})

  const stop = useCallback(() => {
    const r = res.current
    clearInterval(r.timer)
    r.stream?.getTracks().forEach((t) => t.stop())
    r.source?.disconnect()
    res.current = {}
    setListening(false)
  }, [])

  useEffect(() => stop, [stop])

  const start = useCallback(async () => {
    setError('')
    if (!navigator.mediaDevices?.getUserMedia) {
      setError("Ce navigateur ne donne pas accès au micro. Ouvrez l'appli en HTTPS dans Chrome, Safari ou Firefox.")
      return false
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
      })
      const c = getCtx()
      const source = c.createMediaStreamSource(stream)
      const analyser = c.createAnalyser()
      analyser.fftSize = FFT
      analyser.smoothingTimeConstant = 0.3
      source.connect(analyser)
      const db = new Float32Array(FFT / 2)
      const mags = new Float32Array(FFT / 2)
      const td = new Float32Array(2048)
      const timer = setInterval(() => {
        analyser.getFloatTimeDomainData(td)
        let rms = 0
        for (let i = 0; i < td.length; i++) rms += td[i] * td[i]
        rms = Math.sqrt(rms / td.length)
        analyser.getFloatFrequencyData(db)
        for (let i = 0; i < db.length; i++) mags[i] = Math.pow(10, db[i] / 20)
        cb.current?.({ analysis: analyzeSpectrum(mags, c.sampleRate, FFT), rms })
      }, 100)
      res.current = { stream, source, timer }
      setListening(true)
      return true
    } catch (e) {
      setError(
        e?.name === 'NotAllowedError'
          ? "Le micro est refusé ou indisponible ici. Autorisez-le pour ce site dans le navigateur (en HTTPS)."
          : "Impossible d'ouvrir le micro : " + (e?.message || e),
      )
      return false
    }
  }, [])

  return { listening, error, start, stop }
}

// Seuil de volume en dessous duquel on considère qu'on ne joue pas
export const PLAYING_RMS = 0.012
