import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import NavBar from '../components/NavBar'
import { useFriends } from '../hooks/useFriends'
import { useNotificationPreferences } from '../hooks/useNotificationPreferences'
import {
  PULSO_FILTERS,
  selectAllCircles,
  toggleCirclePreference,
} from '../lib/notificationPreferences'

export default function ConfigurarNotificacoes() {
  const navigate = useNavigate()
  const { circles } = useFriends()
  const { prefs, loading, savePrefs } = useNotificationPreferences()
  const [draft, setDraft] = useState(prefs)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    setDraft(prefs)
  }, [prefs])

  const handleSave = async () => {
    setSaving(true)
    setMessage('')
    setError('')
    const { error: saveError } = await savePrefs(draft)
    setSaving(false)
    if (saveError) {
      setError(saveError.message || 'Não foi possível salvar as preferências.')
      return
    }
    setMessage('Preferências salvas.')
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col px-4 pb-28 pt-6">
      <header className="mb-5 flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-[#90795e]">círculo</p>
          <h1 className="mt-1 text-3xl font-semibold text-[#2e2926]">Notificações</h1>
        </div>
        <button
          type="button"
          onClick={() => navigate('/')}
          className="rounded-full border border-[#eadfce] bg-white px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-[#6b543f]"
        >
          Voltar
        </button>
      </header>

      <p className="mb-4 text-sm text-[#8d7c6b]">
        Escolha quais pulsos geram alerta. Isso não muda quem pode ver seus pulsos nem ignora silenciar/bloquear.
      </p>

      {loading ? (
        <p className="rounded-[24px] border border-[#f0e6d8] bg-white/80 px-4 py-6 text-center text-sm text-[#8d7c6b]">
          Carregando preferências…
        </p>
      ) : (
        <>
          <section className="rounded-[30px] border border-[#f0e6d8] bg-white/85 p-5 shadow-[0_14px_36px_rgba(166,139,107,0.08)]">
            <h2 className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#90795e]">
              tipo de pulso
            </h2>
            <div className="mt-3 space-y-2">
              {PULSO_FILTERS.map((option) => {
                const selected = draft.pulsoFilter === option.value
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setDraft((current) => ({ ...current, pulsoFilter: option.value }))}
                    className={`flex w-full items-center justify-between rounded-2xl border px-3 py-3 text-left text-sm transition ${
                      selected
                        ? 'border-[#d4a86d] bg-[#fff6ea] text-[#5a4533]'
                        : 'border-[#eadfce] bg-[#fffaf4] text-[#6b5748]'
                    }`}
                  >
                    <span>{option.label}</span>
                    <span
                      className={`flex h-5 w-5 items-center justify-center rounded-full border ${
                        selected ? 'border-[#c4894a] bg-[#c4894a]' : 'border-[#d7c7b4] bg-white'
                      }`}
                    >
                      {selected ? <span className="h-2 w-2 rounded-full bg-white" /> : null}
                    </span>
                  </button>
                )
              })}
            </div>
          </section>

          <section className="mt-4 rounded-[30px] border border-[#f0e6d8] bg-white/85 p-5 shadow-[0_14px_36px_rgba(166,139,107,0.08)]">
            <h2 className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#90795e]">
              círculos
            </h2>
            <p className="mt-2 text-sm text-[#8d7c6b]">
              “Todos os círculos” exclui as outras opções. Você pode marcar vários círculos específicos.
            </p>
            <div className="mt-3 space-y-2">
              <button
                type="button"
                onClick={() => setDraft((current) => selectAllCircles(current))}
                className={`flex w-full items-center justify-between rounded-2xl border px-3 py-3 text-left text-sm transition ${
                  draft.allCircles
                    ? 'border-[#d4a86d] bg-[#fff6ea] text-[#5a4533]'
                    : 'border-[#eadfce] bg-[#fffaf4] text-[#6b5748]'
                }`}
              >
                <span>Todos os círculos</span>
                <span
                  className={`flex h-5 w-5 items-center justify-center rounded-full border ${
                    draft.allCircles ? 'border-[#c4894a] bg-[#c4894a]' : 'border-[#d7c7b4] bg-white'
                  }`}
                >
                  {draft.allCircles ? <span className="h-2 w-2 rounded-full bg-white" /> : null}
                </span>
              </button>

              {circles.map((circle) => {
                const selected = !draft.allCircles && draft.circleIds.includes(circle.id)
                return (
                  <button
                    key={circle.id}
                    type="button"
                    onClick={() => setDraft((current) => toggleCirclePreference(current, circle.id))}
                    className={`flex w-full items-center gap-3 rounded-2xl border px-3 py-3 text-left text-sm transition ${
                      selected
                        ? 'border-[#d4a86d] bg-[#fff6ea] text-[#5a4533]'
                        : 'border-[#eadfce] bg-[#fffaf4] text-[#6b5748]'
                    }`}
                  >
                    <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: circle.color }} />
                    <span className="min-w-0 flex-1 truncate capitalize">{circle.label}</span>
                    <span
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${
                        selected ? 'border-[#c4894a] bg-[#c4894a]' : 'border-[#d7c7b4] bg-white'
                      }`}
                    >
                      {selected ? <span className="h-2 w-2 rounded-sm bg-white" /> : null}
                    </span>
                  </button>
                )
              })}
            </div>
          </section>

          {error ? <p className="mt-3 text-sm text-[#a63f35]">{error}</p> : null}
          {message ? <p className="mt-3 text-sm text-[#5f7a4a]">{message}</p> : null}

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="mt-5 w-full rounded-full bg-[#2a231f] px-4 py-3 text-sm font-medium text-white disabled:opacity-50"
          >
            {saving ? 'Salvando…' : 'Salvar preferências'}
          </button>
        </>
      )}

      <NavBar />
    </div>
  )
}
