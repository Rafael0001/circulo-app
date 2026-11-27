import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import App from './App.jsx'
import AppErrorBoundary from './components/AppErrorBoundary.jsx'

const RELOAD_KEY = 'circulo_chunk_reload_at'

function reloadOnceForStaleAssets() {
  try {
    const last = Number(sessionStorage.getItem(RELOAD_KEY) || 0)
    if (Date.now() - last < 12_000) return
    sessionStorage.setItem(RELOAD_KEY, String(Date.now()))
  } catch {
    // ignore storage failures
  }
  window.location.reload()
}

registerSW({
  immediate: true,
  onRegisteredSW(_swUrl, registration) {
    if (!registration) return
    // Procura atualização periodicamente para o app instalado não ficar em build velho.
    window.setInterval(() => {
      registration.update().catch(() => {})
    }, 60 * 60 * 1000)
  },
})

window.addEventListener('vite:preloadError', (event) => {
  event.preventDefault()
  reloadOnceForStaleAssets()
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  </StrictMode>,
)
