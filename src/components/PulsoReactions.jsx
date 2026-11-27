import { SmilePlus } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { usePulsos } from '../hooks/usePulsos'
import { groupReactions, PULSO_REACTION_EMOJIS } from '../lib/pulsoReactions'

export default function PulsoReactions({ pulso }) {
  const { user } = useAuth()
  const { reagirPulso } = usePulsos()
  const pickerId = useId()
  const rootRef = useRef(null)

  const reactions = pulso.reactions || []
  const groups = groupReactions(reactions, user?.id)

  const [pickerOpen, setPickerOpen] = useState(false)
  const [detailEmoji, setDetailEmoji] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!pickerOpen && !detailEmoji) return undefined

    const onPointerDown = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) {
        setPickerOpen(false)
        setDetailEmoji(null)
      }
    }
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        setPickerOpen(false)
        setDetailEmoji(null)
      }
    }

    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [pickerOpen, detailEmoji])

  const handleReact = async (emoji) => {
    if (!user?.id || busy) return

    setBusy(true)
    setError('')
    const { error: reactError } = await reagirPulso(pulso.id, emoji)
    setBusy(false)
    setPickerOpen(false)

    if (reactError) {
      setError(reactError.message || 'Não foi possível salvar a reação.')
    }
  }

  const detailGroup = detailEmoji ? groups.find((group) => group.emoji === detailEmoji) : null

  return (
    <div ref={rootRef} className="mt-3">
      <div className="flex flex-wrap items-center gap-1.5">
        {groups.map((group) => (
          <button
            key={group.emoji}
            type="button"
            disabled={busy || !user?.id}
            onClick={() => {
              setPickerOpen(false)
              if (group.mine && detailEmoji === group.emoji) {
                setDetailEmoji(null)
                handleReact(group.emoji)
                return
              }
              setDetailEmoji((current) => (current === group.emoji ? null : group.emoji))
            }}
            className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-sm transition ${
              group.mine
                ? 'border-[#d4a86d] bg-[#fff4e4] text-[#5c4634]'
                : 'border-[#f0e2d3] bg-[#fffaf4] text-[#6d5748] hover:border-[#e2c9ad]'
            } disabled:opacity-60`}
            aria-label={
              group.mine && detailEmoji === group.emoji
                ? `Remover sua reação ${group.emoji}`
                : `Ver quem reagiu com ${group.emoji}`
            }
            aria-pressed={group.mine}
            title={
              group.mine && detailEmoji === group.emoji
                ? 'Remover sua reação'
                : 'Ver quem reagiu'
            }
          >
            <span aria-hidden="true">{group.emoji}</span>
            <span className="text-[12px] font-semibold tabular-nums">{group.count}</span>
          </button>
        ))}

        <div className="relative">
          <button
            type="button"
            disabled={busy || !user?.id}
            onClick={() => {
              setDetailEmoji(null)
              setPickerOpen((open) => !open)
            }}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#f0e2d3] bg-white text-[#8a7463] hover:bg-[#f7efe6] disabled:opacity-50"
            aria-label="Reagir ao pulso"
            aria-expanded={pickerOpen}
            aria-controls={pickerId}
          >
            <SmilePlus className="h-4 w-4" strokeWidth={1.75} />
          </button>

          {pickerOpen ? (
            <div
              id={pickerId}
              role="listbox"
              aria-label="Escolher reação"
              className="absolute bottom-full left-0 z-20 mb-2 grid w-[min(100vw-2rem,17.5rem)] grid-cols-5 gap-1 rounded-2xl border border-[#eddcc7] bg-white p-2 shadow-[0_12px_28px_rgba(60,40,20,0.14)]"
            >
              {PULSO_REACTION_EMOJIS.map((emoji) => {
                const mine = groups.some((group) => group.mine && group.emoji === emoji)
                return (
                  <button
                    key={emoji}
                    type="button"
                    role="option"
                    aria-selected={mine}
                    disabled={busy}
                    onClick={() => handleReact(emoji)}
                    className={`flex h-10 items-center justify-center rounded-xl text-xl transition hover:bg-[#fff4e4] ${
                      mine ? 'bg-[#fff4e4] ring-1 ring-[#d4a86d]' : ''
                    }`}
                  >
                    {emoji}
                  </button>
                )
              })}
            </div>
          ) : null}
        </div>
      </div>

      {detailGroup ? (
        <div className="mt-2 rounded-2xl border border-[#f0e2d3] bg-[#fffaf4] px-3 py-2">
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <p className="text-[12px] font-semibold text-[#6d5748]">
              {detailGroup.emoji} · {detailGroup.count}{' '}
              {detailGroup.count === 1 ? 'pessoa' : 'pessoas'}
            </p>
            <button
              type="button"
              onClick={() => setDetailEmoji(null)}
              className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#9a8e80]"
            >
              Fechar
            </button>
          </div>
          <ul className="max-h-36 space-y-1 overflow-y-auto">
            {detailGroup.reactors.map((reactor) => (
              <li
                key={reactor.id}
                className={`truncate text-[13px] ${
                  reactor.user_id === user?.id ? 'font-semibold text-[#5c4634]' : 'text-[#2f2c2a]'
                }`}
              >
                {reactor.user_id === user?.id ? 'Você' : reactor.author}
              </li>
            ))}
          </ul>
          {user?.id ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => handleReact(detailGroup.emoji)}
              className="mt-2 text-[12px] font-semibold text-[#8a7463] hover:text-[#5c4634] disabled:opacity-50"
            >
              {detailGroup.mine ? 'Remover minha reação' : `Reagir com ${detailGroup.emoji}`}
            </button>
          ) : null}
        </div>
      ) : null}

      {error ? <p className="mt-2 text-sm text-[#b42318]">{error}</p> : null}
    </div>
  )
}
