import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Download, Share, X } from 'lucide-react'
import { isIosDevice, isStandaloneDisplay } from '../lib/pwa'

const DISMISS_KEY = 'circulo_pwa_install_dismissed'

export default function PwaInstallBanner() {
  const location = useLocation()
  const [deferred, setDeferred] = useState(null)
  const [visible, setVisible] = useState(false)
  const [iosHint, setIosHint] = useState(false)
  const hideOnRoute =
    location.pathname.startsWith('/auth/callback') || location.pathname === '/onboarding'

  useEffect(() => {
    if (typeof window === 'undefined') return undefined
    if (isStandaloneDisplay()) return undefined

    try {
      if (localStorage.getItem(DISMISS_KEY) === '1') return undefined
    } catch {
      // ignore
    }

    if (isIosDevice()) {
      setIosHint(true)
      setVisible(true)
      return undefined
    }

    const onPrompt = (event) => {
      event.preventDefault()
      setDeferred(event)
      setVisible(true)
    }

    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', () => {
      setVisible(false)
      setDeferred(null)
    })

    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
    }
  }, [])

  const dismiss = () => {
    setVisible(false)
    try {
      localStorage.setItem(DISMISS_KEY, '1')
    } catch {
      // ignore
    }
  }

  const install = async () => {
    if (!deferred) return
    deferred.prompt()
    try {
      await deferred.userChoice
    } catch {
      // ignore
    }
    setDeferred(null)
    setVisible(false)
  }

  if (!visible || hideOnRoute) return null

  return (
    <div className="safe-x pointer-events-none fixed inset-x-0 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-[55] px-4">
      <div className="pointer-events-auto mx-auto flex max-w-md items-start gap-3 rounded-[22px] border border-[#eadfce] bg-[#fffaf4]/96 p-3 shadow-[0_14px_30px_rgba(90,60,30,0.14)] backdrop-blur-sm">
        <img src="/pwa-192.png" alt="" className="mt-0.5 h-11 w-11 shrink-0 rounded-2xl object-cover" />
        <div className="min-w-0 flex-1">
          <p className="font-display text-base font-semibold text-[#2e2926]">Instalar Círculo</p>
          {iosHint ? (
            <p className="mt-1 text-xs leading-5 text-[#7d6d62]">
              No iPhone/iPad: toque em <Share className="mx-0.5 inline h-3.5 w-3.5 align-text-bottom" /> Compartilhar e depois em
              <span className="font-semibold"> Adicionar à Tela de Início</span>.
            </p>
          ) : (
            <p className="mt-1 text-xs leading-5 text-[#7d6d62]">
              Abra como aplicativo, com atalho na tela inicial e visual em tela cheia.
            </p>
          )}
          <div className="mt-2.5 flex flex-wrap gap-2">
            {!iosHint && deferred ? (
              <button
                type="button"
                onClick={install}
                className="inline-flex items-center gap-1.5 rounded-full bg-[#2a231f] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-white"
              >
                <Download className="h-3.5 w-3.5" />
                Instalar
              </button>
            ) : null}
            <button
              type="button"
              onClick={dismiss}
              className="rounded-full border border-[#eadfce] bg-white px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6b543f]"
            >
              Agora não
            </button>
          </div>
        </div>
        <button
          type="button"
          onClick={dismiss}
          className="rounded-full p-1 text-[#9a8a7c]"
          aria-label="Fechar"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
