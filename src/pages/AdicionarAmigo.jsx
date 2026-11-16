import { useCallback, useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { useNavigate } from 'react-router-dom'
import { Link as LinkIcon, QrCode, ScanLine } from 'lucide-react'
import NavBar from '../components/NavBar'
import QrScanner from '../components/QrScanner'
import { useAuth } from '../hooks/useAuth'
import { createInvite, formatCountdown, inviteUrl, tokenFromScan } from '../lib/invites'

const TABS = [
  { id: 'scan', label: 'Escanear', icon: ScanLine },
  { id: 'qr', label: 'Meu QR', icon: QrCode },
  { id: 'link', label: 'Link', icon: LinkIcon },
]

export default function AdicionarAmigo() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [tab, setTab] = useState('qr')
  const [token, setToken] = useState('')
  const [expiresAt, setExpiresAt] = useState(null)
  const [qrImage, setQrImage] = useState('')
  const [countdown, setCountdown] = useState({ remaining: 0, label: '20:00' })
  const [error, setError] = useState('')
  const [copied, setCopied] = useState('')
  const [scanError, setScanError] = useState('')
  const [scanning, setScanning] = useState(false)
  const [creating, setCreating] = useState(false)

  const link = token ? inviteUrl(token) : ''

  const generateInvite = useCallback(async () => {
    if (!user?.id) return
    setCreating(true)
    setError('')
    const result = await createInvite({
      userId: user.id,
      name: user.user_metadata?.name || user.email?.split('@')[0],
      avatarUrl: user.user_metadata?.avatar_url || null,
    })
    setCreating(false)

    if (result.error) {
      setError(result.error.message || 'Não foi possível gerar o convite.')
      return
    }

    setToken(result.token)
    setExpiresAt(result.expiresAt)
  }, [user])

  useEffect(() => {
    generateInvite()
  }, [generateInvite])

  useEffect(() => {
    if (!token) return undefined
    QRCode.toDataURL(inviteUrl(token), { width: 280, margin: 1 }).then(setQrImage)
  }, [token])

  useEffect(() => {
    if (!expiresAt) return undefined

    const tick = () => {
      const next = formatCountdown(expiresAt)
      setCountdown(next)
      if (next.remaining === 0) {
        generateInvite()
      }
    }

    tick()
    const timer = window.setInterval(tick, 1000)
    return () => window.clearInterval(timer)
  }, [expiresAt, generateInvite])

  const handleCopy = async (value, kind) => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(kind)
      window.setTimeout(() => setCopied(''), 1600)
    } catch {
      setError('Não foi possível copiar.')
    }
  }

  const handleShare = async () => {
    if (!link) return
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Círculo',
          text: 'Entra no meu Círculo',
          url: link,
        })
        return
      } catch {
        // user cancelled or share failed — fall through to copy
      }
    }
    handleCopy(link, 'link')
  }

  const handleWhatsApp = () => {
    if (!link) return
    window.open(`https://wa.me/?text=${encodeURIComponent(`Entra no meu Círculo: ${link}`)}`, '_blank', 'noopener')
  }

  const handleSaveQr = () => {
    if (!qrImage) return
    const anchor = document.createElement('a')
    anchor.href = qrImage
    anchor.download = 'circulo-convite.png'
    anchor.click()
  }

  const handleDecoded = (raw) => {
    const parsed = tokenFromScan(raw)
    if (!parsed) {
      setScanError('Esse QR Code não é um convite do Círculo.')
      setScanning(false)
      return
    }
    setScanning(false)
    navigate(`/convite/${parsed}`)
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col px-4 pb-28 pt-6">
      <header className="mb-5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-[#90795e]">conectar</p>
        <h1 className="mt-2 text-3xl font-semibold text-[#2e2926]">Adicionar ao meu Círculo</h1>
      </header>

      <div className="mb-4 grid grid-cols-3 gap-2">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => {
              setTab(id)
              setScanError('')
              setScanning(id === 'scan')
            }}
            className={`rounded-2xl border px-2 py-3 text-center text-[11px] font-semibold uppercase tracking-[0.08em] ${
              tab === id
                ? 'border-[#d9b57a] bg-[#f3e7d1] text-[#6a4a2e]'
                : 'border-[#eadfce] bg-white text-[#7d6d62]'
            }`}
          >
            <Icon size={16} className="mx-auto mb-1" />
            {label}
          </button>
        ))}
      </div>

      <div className="rounded-[30px] border border-[#f0e6d8] bg-white/85 p-5 shadow-[0_14px_36px_rgba(166,139,107,0.08)]">
        {tab === 'scan' ? (
          scanning ? (
            <QrScanner onDecode={handleDecoded} onCancel={() => setScanning(false)} />
          ) : (
            <div className="space-y-3 text-center">
              <p className="text-sm text-[#7d6d62]">Aponte a câmera para o QR Code de outra pessoa.</p>
              {scanError ? <p className="text-sm text-[#a63f35]">{scanError}</p> : null}
              <button
                type="button"
                onClick={() => {
                  setScanError('')
                  setScanning(true)
                }}
                className="w-full rounded-full bg-[#8f6545] px-4 py-3 text-sm font-medium text-white"
              >
                {scanError ? 'Tentar novamente' : 'Abrir câmera'}
              </button>
            </div>
          )
        ) : null}

        {tab === 'qr' ? (
          <div className="text-center">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-medium text-[#564e49]">Seu convite</p>
              <span className="text-[11px] uppercase tracking-[0.18em] text-[#a37d5a]">{countdown.label}</span>
            </div>
            <div className="mx-auto flex h-52 w-52 items-center justify-center rounded-[28px] border border-[#f0e2d6] bg-white">
              {qrImage ? <img src={qrImage} alt="QR Code de convite" className="h-44 w-44" /> : <p className="text-sm text-[#9a8e80]">{creating ? 'Gerando…' : '…'}</p>}
            </div>
            <p className="mt-3 text-xs text-[#8d7c6b]">Válido por 20 minutos</p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleShare}
                className="rounded-full bg-[#8f6545] px-3 py-2.5 text-sm font-medium text-white"
              >
                Compartilhar
              </button>
              <button
                type="button"
                onClick={handleSaveQr}
                className="rounded-full border border-[#eadfce] bg-white px-3 py-2.5 text-sm text-[#6b543f]"
              >
                Salvar imagem
              </button>
            </div>
            <button
              type="button"
              onClick={() => handleCopy(link, 'qr')}
              className="mt-2 w-full rounded-full border border-[#eadfce] bg-[#fffaf4] px-3 py-2.5 text-sm text-[#6b543f]"
            >
              {copied === 'qr' ? 'Link copiado' : 'Copiar link'}
            </button>
          </div>
        ) : null}

        {tab === 'link' ? (
          <div className="space-y-3">
            <p className="text-sm text-[#7d6d62]">Envie este link. Quem abrir entra no fluxo de conexão do Círculo.</p>
            <div className="break-all rounded-2xl border border-[#f0e2d6] bg-[#fffaf4] px-3 py-3 text-xs text-[#5a4b3f]">
              {link || 'Gerando link…'}
            </div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-[#a37d5a]">expira em {countdown.label}</p>
            <button
              type="button"
              onClick={handleWhatsApp}
              className="w-full rounded-full bg-[#8f6545] px-4 py-3 text-sm font-medium text-white"
            >
              Enviar no WhatsApp
            </button>
            <button
              type="button"
              onClick={handleShare}
              className="w-full rounded-full border border-[#eadfce] bg-white px-4 py-3 text-sm text-[#6b543f]"
            >
              Compartilhar
            </button>
            <button
              type="button"
              onClick={() => handleCopy(link, 'link')}
              className="w-full rounded-full border border-[#eadfce] bg-[#fffaf4] px-4 py-3 text-sm text-[#6b543f]"
            >
              {copied === 'link' ? 'Copiado' : 'Copiar link'}
            </button>
          </div>
        ) : null}

        {error ? <p className="mt-4 text-sm text-[#a63f35]">{error}</p> : null}
      </div>

      <NavBar />
    </div>
  )
}
