import { useEffect, useMemo, useState } from 'react'
import QRCode from 'qrcode'
import { useNavigate } from 'react-router-dom'
import NavBar from '../components/NavBar'
import { useFriends } from '../hooks/useFriends'

const EXPIRY_SECONDS = 300
const AVATAR_COLORS = ['#f6c65f', '#8ed8c8', '#b7b3ee', '#f6a89a', '#d9c7f5', '#9ac4ef']

function initialsFromName(name) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return 'AM'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
}

export default function AdicionarAmigo() {
  const navigate = useNavigate()
  const { addFriend } = useFriends()
  const [token, setToken] = useState(() => `circulo-${Math.random().toString(36).slice(2, 10)}`)
  const [qrImage, setQrImage] = useState('')
  const [scanValue, setScanValue] = useState('')
  const [friendName, setFriendName] = useState('')
  const [countdown, setCountdown] = useState(EXPIRY_SECONDS)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [addedFriend, setAddedFriend] = useState(null)

  useEffect(() => {
    QRCode.toDataURL(token, { width: 220, margin: 1 }).then((url) => setQrImage(url))
  }, [token])

  useEffect(() => {
    const timer = window.setInterval(() => {
      setCountdown((current) => {
        if (current <= 1) {
          const nextToken = `circulo-${Math.random().toString(36).slice(2, 10)}`
          setToken(nextToken)
          return EXPIRY_SECONDS
        }

        return current - 1
      })
    }, 1000)

    return () => window.clearInterval(timer)
  }, [])

  const progress = useMemo(() => (countdown / EXPIRY_SECONDS) * 100, [countdown])

  const handleCopyToken = async () => {
    try {
      await navigator.clipboard.writeText(token)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
    } catch {
      setError('Não foi possível copiar o código.')
    }
  }

  const handleScan = () => {
    if (scanValue.trim() !== token) {
      setError('O código não confere com a sessão atual.')
      return
    }

    const name = friendName.trim() || 'Novo amigo'
    const nextFriend = addFriend({
      name,
      initials: initialsFromName(name),
      circle: 'conhecidos',
      avatarColor: AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)],
    })

    setAddedFriend(nextFriend)
    setError('')
  }

  if (addedFriend) {
    return (
      <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 pb-24 pt-6">
        <div className="rounded-[30px] border border-[#f0e6d8] bg-white p-6 text-center shadow-[0_14px_36px_rgba(166,139,107,0.08)]">
          <div className="mx-auto mb-4 flex w-20 items-center justify-center rounded-full bg-[#eaf7ef] p-3 text-3xl">✨</div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-[#7e9a79]">novo vínculo</p>
          <h1 className="mt-3 text-2xl font-semibold text-[#2a231f]">Amizade criada</h1>
          <p className="mt-2 text-sm text-[#7d6d62]">{addedFriend.name} entrou em conhecidos</p>

          <div className="mt-5 flex items-center justify-center gap-4">
            <div
              className="flex h-16 w-16 items-center justify-center rounded-full text-xl font-semibold text-[#514330]"
              style={{ background: addedFriend.avatarColor }}
            >
              {addedFriend.initials}
            </div>
            <div className="text-3xl text-[#c0b5a7]">+</div>
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#dfe7ff] text-xl font-semibold text-[#4d5c7d]">VO</div>
          </div>

          <button
            type="button"
            onClick={() => navigate('/')}
            className="mt-6 w-full rounded-full bg-[#2a231f] px-4 py-3 text-sm font-medium text-white"
          >
            Voltar para o círculo
          </button>
        </div>
        <NavBar />
      </div>
    )
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col px-4 pb-28 pt-6">
      <header className="mb-5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-[#90795e]">conectar</p>
        <h1 className="mt-2 text-3xl font-semibold text-[#2e2926]">Adicionar amigo</h1>
      </header>

      <div className="rounded-[30px] border border-[#f0e6d8] bg-white/85 p-5 shadow-[0_14px_36px_rgba(166,139,107,0.08)]">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm font-medium text-[#564e49]">Código de convite</p>
          <span className="text-[11px] uppercase tracking-[0.18em] text-[#a37d5a]">{countdown}s</span>
        </div>

        <div className="relative mx-auto flex h-40 w-40 items-center justify-center rounded-full border-[10px] border-[#f5e7d4] bg-[#fffaf4]">
          <div
            className="absolute inset-0 rounded-full"
            style={{
              background: `conic-gradient(#d6a35a 0 ${progress}%, rgba(214, 163, 90, 0.12) ${progress}% 100%)`,
            }}
          />
          <div className="absolute inset-2 rounded-full border border-dashed border-[#d8b882] bg-[#fffaf4]" />
          {qrImage ? (
            <img src={qrImage} alt="QR code" className="relative z-10 h-28 w-28 rounded-2xl bg-white p-2" />
          ) : null}
        </div>

        <div className="mt-4 flex items-center justify-between gap-2 rounded-2xl border border-[#f0e2d6] bg-[#fffaf4] px-3 py-2">
          <code className="truncate text-xs text-[#5a4b3f]">{token}</code>
          <button
            type="button"
            onClick={handleCopyToken}
            className="shrink-0 rounded-full bg-[#f3e6d3] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#7f5b3d]"
          >
            {copied ? 'copiado' : 'copiar código'}
          </button>
        </div>

        <div className="mt-5 rounded-2xl border border-[#f0e2d6] bg-[#fffaf4] p-3">
          <label className="block text-xs uppercase tracking-[0.2em] text-[#9a8e80]">Nome</label>
          <input
            value={friendName}
            onChange={(event) => setFriendName(event.target.value)}
            placeholder="Nome do amigo"
            className="mt-2 w-full rounded-xl border border-[#eddcc7] bg-white px-3 py-2.5 text-sm text-[#3c312b] outline-none focus:border-[#d7af74]"
          />

          <label className="mt-3 block text-xs uppercase tracking-[0.2em] text-[#9a8e80]">Código</label>
          <input
            value={scanValue}
            onChange={(event) => setScanValue(event.target.value)}
            placeholder="Cole o código do convite"
            className="mt-2 w-full rounded-xl border border-[#eddcc7] bg-white px-3 py-2.5 text-sm text-[#3c312b] outline-none focus:border-[#d7af74]"
          />
          {error && <p className="mt-2 text-sm text-[#a63f35]">{error}</p>}
        </div>

        <button
          type="button"
          onClick={handleScan}
          className="mt-5 w-full rounded-full bg-[#8f6545] px-4 py-3 text-sm font-medium text-white"
        >
          Validar convite
        </button>
      </div>

      <NavBar />
    </div>
  )
}
