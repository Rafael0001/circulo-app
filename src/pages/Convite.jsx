import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import Avatar from '../components/Avatar'
import NavBar from '../components/NavBar'
import { useAuth } from '../hooks/useAuth'
import { useFriends } from '../hooks/useFriends'
import { initialsFromName } from '../lib/imageFile'
import { rememberAuthNext } from '../lib/authRedirect'
import { acceptInvite, lookupInvite } from '../lib/invites'

const AVATAR_COLORS = ['#f6c65f', '#8ed8c8', '#b7b3ee', '#f6a89a', '#d9c7f5', '#9ac4ef']

export default function Convite() {
  const { token } = useParams()
  const navigate = useNavigate()
  const { user, loading } = useAuth()
  const { addFriend, friends, circles, refreshFriends } = useFriends()
  const [invite, setInvite] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [added, setAdded] = useState(null)

  useEffect(() => {
    if (loading) return undefined
    let cancelled = false

    lookupInvite(token, user?.id).then((result) => {
      if (!cancelled) setInvite(result)
    })

    return () => {
      cancelled = true
    }
  }, [token, user?.id, loading])

  const handleLogin = () => {
    rememberAuthNext(`/convite/${token}`)
    navigate(`/login?next=${encodeURIComponent(`/convite/${token}`)}`)
  }

  const handleAccept = async () => {
    setBusy(true)
    setError('')
    const result = await acceptInvite(token, {
      id: user.id,
      name: user.user_metadata?.name || user.email?.split('@')[0],
      avatar_url: user.user_metadata?.avatar_url,
    })
    setBusy(false)

    if (result.error && result.status !== 'already') {
      setError(result.error.message || 'Não foi possível adicionar.')
      return
    }

    const alreadyInCircle = friends.some((friend) => friend.id === result.id || friend.id === invite.creator_id)
    const nextFriend = alreadyInCircle
      ? friends.find((friend) => friend.id === result.id)
      : addFriend({
          id: result.id,
          name: result.name,
          initials: initialsFromName(result.name),
          avatarColor: AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)],
          avatarUrl: result.avatar_url,
          circle: circles[circles.length - 1]?.id,
        })

    setAdded({ ...nextFriend, already: result.status === 'already' || alreadyInCircle })
    await refreshFriends()
  }

  if (!invite || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f8f4ee] text-sm font-medium uppercase tracking-[0.2em] text-[#7c6a5f]">
        Abrindo convite...
      </div>
    )
  }

  if (invite.status === 'invalid' || invite.status === 'expired') {
    return (
      <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 pb-24 pt-6">
        <div className="rounded-[30px] border border-[#f0e6d8] bg-white p-6 text-center">
          <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-[#90795e]">convite</p>
          <h1 className="mt-3 text-2xl font-semibold text-[#2a231f]">
            {invite.status === 'expired' ? 'Convite expirado' : 'Convite inválido'}
          </h1>
          <p className="mt-2 text-sm text-[#7d6d62]">Peça um novo QR Code ou link para essa pessoa.</p>
          <Link to={user ? '/adicionar-amigo' : '/login'} className="mt-6 inline-block font-semibold text-[#8f6545]">
            {user ? 'Gerar meu convite' : 'Entrar'}
          </Link>
        </div>
      </div>
    )
  }

  if (added) {
    return (
      <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 pb-24 pt-6">
        <div className="rounded-[30px] border border-[#f0e6d8] bg-white p-6 text-center">
          <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-[#7e9a79]">
            {added.already ? 'já no círculo' : 'novo vínculo'}
          </p>
          <h1 className="mt-3 text-2xl font-semibold text-[#2a231f]">
            {added.already ? 'Vocês já estão conectados' : 'Adicionado ao seu Círculo'}
          </h1>
          <div className="mt-5 flex justify-center">
            <Avatar name={added.name} src={added.avatarUrl} size={72} />
          </div>
          <p className="mt-3 text-sm text-[#7d6d62]">{added.name}</p>
          <button
            type="button"
            onClick={() => navigate('/')}
            className="mt-6 w-full rounded-full bg-[#2a231f] px-4 py-3 text-sm font-medium text-white"
          >
            Ver meu círculo
          </button>
        </div>
        {user ? <NavBar /> : null}
      </div>
    )
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 pb-24 pt-6">
      <div className="rounded-[30px] border border-[#f0e6d8] bg-white p-6 text-center shadow-[0_14px_36px_rgba(166,139,107,0.08)]">
        <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-[#90795e]">convite</p>
        <div className="mt-5 flex justify-center">
          <Avatar name={invite.name} src={invite.avatar_url} size={88} />
        </div>
        <h1 className="mt-4 text-2xl font-semibold text-[#2a231f]">{invite.name}</h1>
        <p className="mt-2 text-sm text-[#7d6d62]">
          Você foi convidado para fazer parte do Círculo de {invite.name}.
        </p>

        {invite.is_self ? (
          <p className="mt-5 text-sm text-[#8a4a38]">Este é o seu próprio convite.</p>
        ) : invite.already_friends || friends.some((friend) => friend.id === invite.creator_id) ? (
          <p className="mt-5 text-sm text-[#5f7a4a]">Vocês já fazem parte do mesmo Círculo.</p>
        ) : null}

        {error ? <p className="mt-4 text-sm text-[#a63f35]">{error}</p> : null}

        {!user ? (
          <button
            type="button"
            onClick={handleLogin}
            className="mt-6 w-full rounded-full bg-[#8f6545] px-4 py-3 text-sm font-medium text-white"
          >
            Entrar para adicionar
          </button>
        ) : invite.is_self || invite.already_friends || friends.some((friend) => friend.id === invite.creator_id) ? (
          <button
            type="button"
            onClick={() => navigate('/')}
            className="mt-6 w-full rounded-full border border-[#eadfce] bg-white px-4 py-3 text-sm text-[#6b543f]"
          >
            Voltar ao círculo
          </button>
        ) : (
          <div className="mt-6 space-y-2">
            <button
              type="button"
              onClick={handleAccept}
              disabled={busy}
              className="w-full rounded-full bg-[#8f6545] px-4 py-3 text-sm font-medium text-white disabled:opacity-60"
            >
              {busy ? 'Adicionando…' : 'Adicionar ao meu Círculo'}
            </button>
            <button
              type="button"
              onClick={() => navigate('/adicionar-amigo')}
              className="w-full rounded-full border border-[#eadfce] bg-white px-4 py-3 text-sm text-[#6b543f]"
            >
              Cancelar
            </button>
          </div>
        )}
      </div>
      {user ? <NavBar /> : null}
    </div>
  )
}
