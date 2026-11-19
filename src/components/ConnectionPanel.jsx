import { useEffect, useMemo, useState } from 'react'
import { Ban, Bell, BellOff, Check, LoaderCircle, MoveRight, Trash2, UserRound, Users } from 'lucide-react'
import Avatar from './Avatar'
import { useAuth } from '../hooks/useAuth'
import { useFriends } from '../hooks/useFriends'
import { fetchMutualFriends } from '../lib/mutualFriends'

export default function ConnectionPanel({
  friend,
  circles,
  onViewProfile,
  onMoveFriend,
  onMute,
  onUnmute,
  onRemove,
  onBlock,
}) {
  const { user } = useAuth()
  const { friends, blockedUsers, unblockPerson } = useFriends()
  const relationKey = useMemo(() => friends.map((item) => item.id).sort().join('|'), [friends])
  const isBlocked = blockedUsers.some((item) => item.id === friend.id)
  const [draftCircle, setDraftCircle] = useState(friend.circle)
  const [moving, setMoving] = useState(false)
  const [muting, setMuting] = useState(false)
  const [confirm, setConfirm] = useState(null)
  const [busyAction, setBusyAction] = useState(null)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [mutualFriends, setMutualFriends] = useState([])
  const [mutualLoading, setMutualLoading] = useState(true)

  useEffect(() => {
    setDraftCircle(friend.circle)
    setConfirm(null)
    setMessage('')
    setError('')
  }, [friend.id, friend.circle])

  useEffect(() => {
    let cancelled = false

    const load = () => {
      fetchMutualFriends(user?.id, friend.id).then((people) => {
        if (!cancelled) {
          setMutualFriends(people)
          setMutualLoading(false)
        }
      })
    }

    setMutualLoading(true)
    load()

    const onVisible = () => {
      if (document.visibilityState === 'visible') load()
    }

    window.addEventListener('focus', load)
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('storage', load)

    return () => {
      cancelled = true
      window.removeEventListener('focus', load)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('storage', load)
    }
  }, [user?.id, friend.id, relationKey])

  const currentCircle = circles.find((circle) => circle.id === friend.circle)
  const canSaveMove = draftCircle && draftCircle !== friend.circle && !moving

  const run = async (key, fn, successText) => {
    setBusyAction(key)
    setError('')
    setMessage('')
    const ok = await fn()
    setBusyAction(null)
    setConfirm(null)
    if (ok) setMessage(successText)
    else setError('Não foi possível concluir. Tente novamente.')
    return ok
  }

  return (
    <div className="mt-4 mb-16 rounded-[24px] border border-[#f0e2d7] bg-[#fffaf4] p-4 shadow-[0_10px_24px_rgba(80,60,40,0.06)]">
      <div className="flex items-center gap-3">
        <Avatar name={friend.name} src={friend.avatarUrl} size={56} />
        <div className="min-w-0">
          <p className="truncate text-lg font-semibold text-[#2a231f]">{friend.name}</p>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8b7870]">
            {currentCircle?.label || friend.circle}
          </p>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-[#eadfce] bg-white p-3">
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="flex items-center gap-2 text-sm text-[#4f4036]">
            <Users size={16} />
            Amigos em comum
          </p>
          <span className="rounded-full bg-[#f4ead9] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#7f6042]">
            {mutualLoading ? '…' : mutualFriends.length}
          </span>
        </div>

        {mutualLoading ? (
          <p className="text-sm text-[#8d7c6b]">Buscando amigos em comum…</p>
        ) : mutualFriends.length === 0 ? (
          <p className="text-sm text-[#8d7c6b]">Vocês ainda não têm amigos em comum.</p>
        ) : (
          <div className="max-h-40 space-y-1 overflow-y-auto">
            {mutualFriends.map((person) => (
              <button
                key={person.id}
                type="button"
                onClick={() => onViewProfile?.(person)}
                className="flex w-full items-center gap-2 rounded-xl px-1 py-1.5 text-left hover:bg-[#fffaf4]"
              >
                <Avatar name={person.name} src={person.avatarUrl} size={32} />
                <span className="truncate text-sm text-[#4f4036]">{person.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="mt-4 space-y-2">
        <button
          type="button"
          onClick={() => onViewProfile?.(friend)}
          className="flex w-full items-center gap-3 rounded-2xl border border-[#eadfce] bg-white px-3 py-2.5 text-left text-sm text-[#4f4036]"
        >
          <UserRound size={16} />
          Ver perfil
        </button>

        <div className="rounded-2xl border border-[#eadfce] bg-white p-3">
          <p className="mb-2 flex items-center gap-2 text-sm text-[#4f4036]">
            <MoveRight size={16} />
            Mover para outro círculo
          </p>
          <div className="flex flex-wrap gap-2">
            {circles.map((circle) => (
              <button
                key={circle.id}
                type="button"
                onClick={() => setDraftCircle(circle.id)}
                className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${
                  draftCircle === circle.id
                    ? 'border-transparent bg-[#ead3a9] text-[#5c4733]'
                    : 'border-[#e7d8ca] bg-[#fffaf4] text-[#6f5a4a]'
                }`}
              >
                {circle.label}
              </button>
            ))}
          </div>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => setDraftCircle(friend.circle)}
              disabled={moving || draftCircle === friend.circle}
              className="flex-1 rounded-full border border-[#eadfce] px-3 py-2 text-sm text-[#6b543f] disabled:opacity-40"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={!canSaveMove}
              onClick={async () => {
                setMoving(true)
                setError('')
                setMessage('')
                const ok = await onMoveFriend(friend.id, draftCircle)
                setMoving(false)
                if (ok) setMessage('Círculo atualizado.')
                else {
                  setDraftCircle(friend.circle)
                  setError('Não foi possível mover esta pessoa.')
                }
              }}
              className="flex flex-1 items-center justify-center gap-2 rounded-full bg-[#2A2A2A] px-3 py-2 text-sm font-semibold text-[#E8C87A] disabled:opacity-40"
            >
              {moving ? <LoaderCircle size={16} className="animate-spin" /> : <Check size={16} />}
              OK
            </button>
          </div>
        </div>

        <button
          type="button"
          disabled={muting}
          onClick={async () => {
            setMuting(true)
            setError('')
            const ok = friend.muted ? await onUnmute(friend.id) : await onMute(friend.id)
            setMuting(false)
            if (ok) setMessage(friend.muted ? 'Notificações reativadas.' : 'Pessoa silenciada.')
            else setError('Não foi possível atualizar as notificações.')
          }}
          className="flex w-full items-center gap-3 rounded-2xl border border-[#eadfce] bg-white px-3 py-2.5 text-left text-sm text-[#4f4036] disabled:opacity-60"
        >
          {friend.muted ? <Bell size={16} /> : <BellOff size={16} />}
          {muting ? 'Salvando…' : friend.muted ? 'Reativar notificações' : 'Silenciar'}
        </button>

        {isBlocked ? (
          <button
            type="button"
            disabled={busyAction === 'unblock'}
            onClick={() => run('unblock', () => unblockPerson(friend.id), 'Bloqueio removido.')}
            className="flex w-full items-center gap-3 rounded-2xl border border-[#eadfce] bg-white px-3 py-2.5 text-left text-sm text-[#6b543f] disabled:opacity-60"
          >
            <Ban size={16} />
            {busyAction === 'unblock' ? 'Desbloqueando…' : 'Desbloquear'}
          </button>
        ) : confirm === 'block' ? (
          <div className="rounded-2xl border border-[#f0d4c8] bg-[#fff6f3] p-3">
            <p className="text-sm text-[#6a4338]">
              Tem certeza de que deseja bloquear esta pessoa? Ela permanece no seu Círculo, mas você deixa de ver os
              pulsos dela e as interações ficam restritas.
            </p>
            <div className="mt-3 flex gap-2">
              <button type="button" onClick={() => setConfirm(null)} className="flex-1 rounded-full border border-[#eadfce] bg-white px-3 py-2 text-sm">
                Cancelar
              </button>
              <button
                type="button"
                disabled={busyAction === 'block'}
                onClick={() => run('block', () => onBlock(friend), 'Pessoa bloqueada. Ela continua no seu Círculo.')}
                className="flex-1 rounded-full bg-[#8a4a38] px-3 py-2 text-sm text-white disabled:opacity-60"
              >
                {busyAction === 'block' ? 'Bloqueando…' : 'Bloquear'}
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirm('block')}
            className="flex w-full items-center gap-3 rounded-2xl border border-[#f0d4c8] bg-[#fff6f3] px-3 py-2.5 text-left text-sm text-[#8a4a38]"
          >
            <Ban size={16} />
            Bloquear
          </button>
        )}

        {confirm === 'remove' ? (
          <div className="rounded-2xl border border-[#e8c4bc] bg-[#fff1ed] p-3">
            <p className="text-sm text-[#6a4338]">Deseja realmente remover esta pessoa do seu Círculo?</p>
            <div className="mt-3 flex gap-2">
              <button type="button" onClick={() => setConfirm(null)} className="flex-1 rounded-full border border-[#eadfce] bg-white px-3 py-2 text-sm">
                Cancelar
              </button>
              <button
                type="button"
                disabled={busyAction === 'remove'}
                onClick={() => run('remove', () => onRemove(friend.id), 'Pessoa removida do seu Círculo.')}
                className="flex-1 rounded-full bg-[#7a2f28] px-3 py-2 text-sm text-white disabled:opacity-60"
              >
                {busyAction === 'remove' ? 'Removendo…' : 'Confirmar'}
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirm('remove')}
            className="flex w-full items-center gap-3 rounded-2xl border border-[#e8c4bc] bg-[#fff1ed] px-3 py-2.5 text-left text-sm text-[#7a2f28]"
          >
            <Trash2 size={16} />
            Remover do meu Círculo
          </button>
        )}
      </div>

      {message ? <p className="mt-3 text-sm text-[#5f7a4a]">{message}</p> : null}
      {error ? <p className="mt-3 text-sm text-[#a63f35]">{error}</p> : null}
    </div>
  )
}
