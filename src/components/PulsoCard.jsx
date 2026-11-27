import { AlertTriangle, Clock, Eye, EyeOff, MoreHorizontal, Pencil, Trash2, Zap } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { usePulsos } from '../hooks/usePulsos'
import { durationLabel, hasDefinedDuration } from '../lib/pulsoVisibility'
import { absoluteTimeFrom, relativeTimeFrom } from '../lib/relativeTime'
import PulsoComments from './PulsoComments'
import PulsoPhotoGrid from './PulsoPhotoGrid'
import PulsoPhotoPicker from './PulsoPhotoPicker'
import PulsoReactions from './PulsoReactions'

const priorityFlags = {
  is_importante: {
    label: 'importante',
    color: '#E8C87A',
    icon: AlertTriangle,
  },
  is_urgente: {
    label: 'urgente',
    color: '#F4956A',
    icon: Zap,
  },
}

export default function PulsoCard({ pulso, hidden = false }) {
  const { user } = useAuth()
  const { editarPulso, excluirPulso, ocultarPulso, mostrarPulso } = usePulsos()
  const isAuthor = Boolean(user?.id && pulso.user_id === user.id)
  const activeFlags = Object.entries(priorityFlags).filter(([key]) => pulso[key])
  const totalDuration = hasDefinedDuration(pulso.duration_hours) ? pulso.duration_hours : null
  const menuId = useId()
  const menuRef = useRef(null)

  const [editing, setEditing] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [draft, setDraft] = useState(pulso.content || '')
  const [draftPhotos, setDraftPhotos] = useState(pulso.photos || [])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!menuOpen) return undefined

    const onPointerDown = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false)
      }
    }
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setMenuOpen(false)
    }

    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [menuOpen])

  const startEdit = () => {
    setDraft(pulso.content || '')
    setDraftPhotos(pulso.photos || [])
    setError('')
    setConfirmingDelete(false)
    setMenuOpen(false)
    setEditing(true)
  }

  const handleSave = async () => {
    setBusy(true)
    setError('')
    const { error: saveError } = await editarPulso(pulso.id, {
      content: draft,
      photos: draftPhotos,
    })
    setBusy(false)
    if (saveError) {
      setError(saveError.message || 'Não foi possível salvar a edição.')
      return
    }
    setEditing(false)
  }

  const handleDelete = async () => {
    setBusy(true)
    setError('')
    const { error: deleteError } = await excluirPulso(pulso.id)
    setBusy(false)
    if (deleteError) {
      setError(deleteError.message || 'Não foi possível excluir o pulso.')
      setConfirmingDelete(false)
    }
  }

  const handleHideToggle = async () => {
    setBusy(true)
    setError('')
    setMenuOpen(false)
    const { error: hideError } = hidden
      ? await mostrarPulso(pulso.id)
      : await ocultarPulso(pulso.id)
    setBusy(false)
    if (hideError) {
      setError(
        hideError.message ||
          (hidden ? 'Não foi possível restaurar o pulso.' : 'Não foi possível ocultar o pulso.'),
      )
    }
  }

  return (
    <article className="rounded-[24px] border border-[#f0e2d3] bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex min-w-0 items-baseline gap-1.5 text-sm">
            <span className="truncate font-semibold text-[#2f2c2a]">{pulso.author}</span>
            <span className="text-[#d4c6b6]">·</span>
            <time
              className="shrink-0 text-[12px] text-[#9a8e80]"
              dateTime={pulso.created_at || undefined}
              title={absoluteTimeFrom(pulso.created_at)}
            >
              {relativeTimeFrom(pulso.created_at)}
            </time>
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {activeFlags.map(([key, flag]) => {
            const Icon = flag.icon
            return (
              <span
                key={key}
                className="inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em]"
                style={{
                  borderColor: `${flag.color}66`,
                  background: `${flag.color}1A`,
                  color: flag.color,
                }}
              >
                <Icon className="h-3.5 w-3.5" fill="currentColor" strokeWidth={1.5} />
                {flag.label}
              </span>
            )
          })}
          {totalDuration ? (
            <span
              className="inline-flex items-center gap-0.5 text-[10px] text-[#9a8e80]"
              title={`Duração de ${durationLabel(totalDuration)}`}
            >
              <Clock className="h-3 w-3" />
              {durationLabel(totalDuration)}
            </span>
          ) : null}
          {isAuthor && !editing && (
            <>
              <button
                type="button"
                onClick={startEdit}
                className="rounded-full p-1.5 text-[#8a7463] hover:bg-[#f7efe6]"
                aria-label="Editar pulso"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setConfirmingDelete(true)
                  setMenuOpen(false)
                  setError('')
                }}
                className="rounded-full p-1.5 text-[#8a4a38] hover:bg-[#fff1ed]"
                aria-label="Excluir pulso"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </>
          )}
          {!editing && user?.id ? (
            <div ref={menuRef} className="relative">
              <button
                type="button"
                onClick={() => setMenuOpen((open) => !open)}
                className="rounded-full p-1.5 text-[#8a7463] hover:bg-[#f7efe6]"
                aria-label="Mais ações"
                aria-expanded={menuOpen}
                aria-controls={menuId}
              >
                <MoreHorizontal className="h-3.5 w-3.5" />
              </button>
              {menuOpen ? (
                <div
                  id={menuId}
                  role="menu"
                  className="absolute right-0 z-20 mt-1 min-w-[11.5rem] rounded-2xl border border-[#eddcc7] bg-white p-1 shadow-[0_12px_28px_rgba(60,40,20,0.14)]"
                >
                  <button
                    type="button"
                    role="menuitem"
                    disabled={busy}
                    onClick={handleHideToggle}
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-[#2f2c2a] hover:bg-[#fff4e4] disabled:opacity-50"
                  >
                    {hidden ? (
                      <>
                        <Eye className="h-3.5 w-3.5 text-[#8a7463]" />
                        Mostrar na timeline
                      </>
                    ) : (
                      <>
                        <EyeOff className="h-3.5 w-3.5 text-[#8a7463]" />
                        Ocultar Pulso
                      </>
                    )}
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      {editing ? (
        <>
          <textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            rows={4}
            disabled={busy}
            className="w-full resize-none rounded-2xl border border-[#eddcc7] bg-[#fffaf4] px-3 py-2.5 text-sm outline-none focus:border-[#d4a86d]"
          />
          <PulsoPhotoPicker
            photos={draftPhotos}
            disabled={busy}
            onChange={setDraftPhotos}
            onError={(message) => setError(message)}
          />
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              disabled={busy || (!draft.trim() && draftPhotos.length === 0)}
              onClick={handleSave}
              className="flex-1 rounded-full bg-[#2a231f] px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-white disabled:opacity-50"
            >
              {busy ? 'Salvando...' : 'Salvar'}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => setEditing(false)}
              className="flex-1 rounded-full border border-[#eddcc7] px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#6d5748]"
            >
              Cancelar
            </button>
          </div>
        </>
      ) : (
        <>
          {pulso.content ? <p className="text-[15px] leading-6 text-[#2f2c2a]">{pulso.content}</p> : null}
          <div className={pulso.content ? 'mt-3' : ''}>
            <PulsoPhotoGrid photos={pulso.photos} />
          </div>
        </>
      )}

      {confirmingDelete && (
        <div className="mt-3 rounded-2xl border border-[#f0d4c8] bg-[#fff6f3] p-3">
          <p className="text-sm text-[#6a4338]">Excluir este pulso? Essa ação não pode ser desfeita.</p>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={handleDelete}
              className="flex-1 rounded-full bg-[#7a2f28] px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-white disabled:opacity-50"
            >
              {busy ? 'Excluindo...' : 'Excluir'}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => setConfirmingDelete(false)}
              className="flex-1 rounded-full border border-[#eddcc7] bg-white px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#6d5748]"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {error ? <p className="mt-2 text-sm text-[#b42318]">{error}</p> : null}

      {!editing ? (
        <>
          <PulsoReactions pulso={pulso} />
          <PulsoComments pulso={pulso} />
        </>
      ) : null}
    </article>
  )
}
