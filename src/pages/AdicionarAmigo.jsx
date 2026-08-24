import { useEffect, useMemo, useState } from 'react'
import QRCode from 'qrcode'
import { useNavigate } from 'react-router-dom'
import NavBar from '../components/NavBar'

const EXPIRY_SECONDS = 300

export default function AdicionarAmigo() {
  const navigate = useNavigate()
  const [token, setToken] = useState(() => `circulo-${Math.random().toString(36).slice(2, 10)}`)
  const [qrImage, setQrImage] = useState('')
  const [scanValue, setScanValue] = useState('')
  const [countdown, setCountdown] = useState(EXPIRY_SECONDS)
  const [error, setError] = useState('')
  const [friendAdded, setFriendAdded] = useState(false)

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

  const handleScan = () => {
    if (scanValue.trim() === token) {
      setFriendAdded(true)
      setError('')
      return
    }

    setError('O código não confere com a sessão atual.')
  }

  if (friendAdded) {
    return (
      <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 pb-24 pt-6">
        <div className="rounded-[30px] border border-[#f0e6d8] bg-white p-6 text-center shadow-[0_14px_36px_rgba(166,139,107,0.08)]">
          <div className="mx-auto mb-4 flex w-20 items-center justify-center rounded-full bg-[#eaf7ef] p-3 text-3xl">✨</div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-[#7e9a79]">novo vínculo</p>
          <h1 className="mt-3 text-2xl font-semibold text-[#2a231f]">Amizade criada</h1>

          <div className="mt-5 flex items-center justify-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#f5d9b8] text-xl font-semibold text-[#514330]">AN</div>
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
          <div className="absolute inset-2 rounded-full border border-dashed border-[#d8b882]" />
          {qrImage ? <img src={qrImage} alt="QR code" className="h-28 w-28 rounded-2xl bg-white p-2" /> : null}
          <div
            className="absolute inset-0 rounded-full"
            style={{
              background: `conic-gradient(#d6a35a 0 ${progress}%, rgba(214, 163, 90, 0.12) ${progress}% 100%)`,
            }}
          />
        </div>

        <div className="mt-5 rounded-2xl border border-[#f0e2d6] bg-[#fffaf4] p-3">
          <label className="block text-xs uppercase tracking-[0.2em] text-[#9a8e80]">Código</label>
          <input
            value={scanValue}
            onChange={(event) => setScanValue(event.target.value)}
            placeholder="Cole o código do QR"
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
