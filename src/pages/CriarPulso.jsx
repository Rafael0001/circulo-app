import { AlertTriangle, Zap } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import NavBar from '../components/NavBar'
import PulsoPhotoPicker from '../components/PulsoPhotoPicker'
import PulsoSettings from '../components/PulsoSettings'
import { useFriends } from '../hooks/useFriends'
import { usePulsos } from '../hooks/usePulsos'
import { readPulsoPublishSettings, writePulsoPublishSettings } from '../lib/pulsoVisibility'

const priorityFlags = [
  {
    key: 'is_importante',
    label: 'Importante',
    color: '#E8C87A',
    icon: AlertTriangle,
  },
  {
    key: 'is_urgente',
    label: 'Urgente',
    color: '#F4956A',
    icon: Zap,
  },
]

export default function CriarPulso() {
  const navigate = useNavigate()
  const { createPulso } = usePulsos()
  const { circles } = useFriends()
  const savedSettings = useMemo(() => readPulsoPublishSettings(), [])
  const defaultVisibility = circles[circles.length - 1]?.id ?? ''
  const [settings, setSettings] = useState({
    duration_hours: savedSettings?.durationHours ?? 24,
    include_inner: savedSettings?.includeInner !== false,
    circle_visibility: savedSettings?.circleId || defaultVisibility,
  })
  const [form, setForm] = useState({
    is_importante: false,
    is_urgente: false,
    content: '',
  })
  const [photos, setPhotos] = useState([])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const visibilityValue = useMemo(
    () =>
      circles.some((circle) => circle.id === settings.circle_visibility)
        ? settings.circle_visibility
        : defaultVisibility,
    [circles, defaultVisibility, settings.circle_visibility],
  )

  const updateSettings = (next) => {
    setSettings((current) => {
      const merged = {
        duration_hours: next.durationHours ?? current.duration_hours,
        include_inner: next.includeInner ?? current.include_inner,
        circle_visibility: next.circleId ?? current.circle_visibility,
      }
      writePulsoPublishSettings({
        durationHours: merged.duration_hours,
        includeInner: merged.include_inner,
        circleId: merged.circle_visibility,
      })
      return merged
    })
  }

  const toggleFlag = (flagKey) => {
    setForm((current) => ({
      ...current,
      [flagKey]: !current[flagKey],
    }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!form.content.trim() && photos.length === 0) return

    setBusy(true)
    setError('')
    const { error: createError } = await createPulso({
      is_importante: form.is_importante,
      is_urgente: form.is_urgente,
      content: form.content.trim(),
      circle_visibility: visibilityValue,
      include_inner: settings.include_inner,
      duration_hours: settings.duration_hours,
      photos,
    })
    setBusy(false)

    if (createError) {
      setError(createError.message || 'Não foi possível publicar o pulso.')
      return
    }

    navigate('/')
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col px-4 pb-28 pt-6">
      <header className="mb-5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-[#90795e]">pulso</p>
        <h1 className="mt-2 text-3xl font-semibold text-[#2e2926]">Pulso</h1>
      </header>

      <section className="rounded-[30px] border border-[#f0e6d8] bg-white/85 p-5 shadow-[0_14px_36px_rgba(166,139,107,0.08)]">
        <h2 className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#90795e]">
          configurações do pulso
        </h2>
        <div className="mt-4">
          <PulsoSettings
            showLegend={false}
            circles={circles}
            durationHours={settings.duration_hours}
            includeInner={settings.include_inner}
            circleId={visibilityValue}
            onChange={updateSettings}
          />
        </div>
      </section>

      <form
        onSubmit={handleSubmit}
        className="mt-4 rounded-[30px] border border-[#f0e6d8] bg-white/85 p-5 shadow-[0_14px_36px_rgba(166,139,107,0.08)]"
      >
        <h2 className="mb-4 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#90795e]">
          criar pulso
        </h2>

        <div className="grid grid-cols-2 gap-3">
          {priorityFlags.map((flag) => {
            const Icon = flag.icon
            const isActive = form[flag.key]

            return (
              <button
                key={flag.key}
                type="button"
                onClick={() => toggleFlag(flag.key)}
                className="flex items-center justify-center gap-2 rounded-2xl border px-3 py-3 text-sm font-medium transition"
                style={{
                  borderColor: isActive ? flag.color : '#eddcc7',
                  background: isActive ? `${flag.color}1A` : '#fffaf4',
                  color: isActive ? flag.color : '#6d5748',
                }}
              >
                <Icon
                  className="h-4 w-4"
                  fill={isActive ? 'currentColor' : 'none'}
                  strokeWidth={1.8}
                />
                {flag.label}
              </button>
            )
          })}
        </div>

        <label className="mt-4 block text-sm text-[#5a4b3f]">
          Mensagem
          <textarea
            value={form.content}
            onChange={(event) => setForm((current) => ({ ...current, content: event.target.value }))}
            rows={5}
            className="mt-1 w-full rounded-2xl border border-[#eddcc7] bg-[#fffaf4] px-3 py-2.5 outline-none transition focus:border-[#d4a86d]"
            placeholder="Escreva o que você precisa, quer ou sonha..."
          />
        </label>

        <PulsoPhotoPicker
          photos={photos}
          disabled={busy}
          onChange={(next) => {
            setPhotos(next)
            setError('')
          }}
          onError={setError}
        />

        {error ? <p className="mt-3 text-sm text-[#b42318]">{error}</p> : null}

        <button
          type="submit"
          disabled={busy || (!form.content.trim() && photos.length === 0)}
          className="mt-5 w-full rounded-full bg-[#2a231f] px-4 py-3 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? 'Publicando...' : 'Publicar pulso'}
        </button>
      </form>

      <NavBar />
    </div>
  )
}
