import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './styles.css'

// Proposition d'installation (Chrome, Edge, Android) : gardée pour le bouton des réglages
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault()
  window.__gratteInstall = e
  window.dispatchEvent(new Event('gratte-install-ready'))
})

// Hors connexion : service worker en production uniquement
if ((import.meta.env || {}).PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {})
  })
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
