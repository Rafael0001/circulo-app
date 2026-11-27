import { Eye, EyeOff } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import NavBar from '../components/NavBar'
import CirculoViz from '../components/CirculoViz'
import PulsoCard from '../components/PulsoCard'
import { useFriends } from '../hooks/useFriends'
import { usePulsos } from '../hooks/usePulsos'

export default function Home() {
  const navigate = useNavigate()
  const { friends, circles, moveFriend, reorderFriendsInCircle, muteFriend, unmuteFriend, removeFromCircle, blockPerson, renameCircle, removeCircle } = useFriends()
  const { pulsos, hiddenPulsos, criarPulso } = usePulsos()
  const [showHidden, setShowHidden] = useState(false)

  const feed = showHidden ? hiddenPulsos : pulsos

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col px-4 pb-28 pt-6">
      <header className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <img src="/logo-colorida.png" alt="" className="h-12 w-12 object-contain" />
          <h1 className="font-display text-[1.85rem] font-semibold leading-none tracking-[-0.03em] text-[#2e2926]">
            Círculo
          </h1>
        </div>
        <div className="rounded-full bg-[#f7e8d2] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8b5f38]">
          {friends.length === 0 ? 'vazio' : `${friends.length} amigos`}
        </div>
      </header>

      <CirculoViz
        friends={friends}
        circles={circles}
        pulsos={pulsos}
        onMoveFriend={moveFriend}
        onReorderFriends={reorderFriendsInCircle}
        onViewProfile={(friend) => navigate(`/perfil/${friend.id}`, { state: { from: '/' } })}
        onMuteFriend={muteFriend}
        onUnmuteFriend={unmuteFriend}
        onRemoveFriend={removeFromCircle}
        onBlockFriend={blockPerson}
        onRenameCircle={renameCircle}
        onRemoveCircle={removeCircle}
        onCreatePulso={criarPulso}
      />

      <section className="mt-6">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <h2 className="text-xs font-semibold uppercase tracking-[0.24em] text-[#8d7c6b]">
              {showHidden ? 'pulsos ocultos' : 'pulsos'}
            </h2>
            <span className="text-[11px] text-[#9a8d7c]">{feed.length}</span>
          </div>
          <button
            type="button"
            onClick={() => setShowHidden((value) => !value)}
            className="relative inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[#8b5f38] hover:bg-[#f7e8d2]"
            aria-label={showHidden ? 'Voltar à timeline' : 'Ver pulsos ocultos'}
            title={showHidden ? 'Voltar à timeline' : 'Pulsos ocultos'}
          >
            {showHidden ? <EyeOff className="h-4 w-4" strokeWidth={1.75} /> : <Eye className="h-4 w-4" strokeWidth={1.75} />}
            {!showHidden && hiddenPulsos.length > 0 ? (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#8b5f38] px-1 text-[9px] font-semibold text-white">
                {hiddenPulsos.length > 9 ? '9+' : hiddenPulsos.length}
              </span>
            ) : null}
          </button>
        </div>

        <div className="space-y-3">
          {feed.length === 0 ? (
            <p className="rounded-[24px] border border-dashed border-[#eadfce] bg-white/70 px-4 py-6 text-center text-sm text-[#8d7c6b]">
              {showHidden
                ? 'Nenhum pulso oculto.'
                : 'Nenhum pulso neste círculo.'}
            </p>
          ) : (
            feed.map((pulso) => (
              <PulsoCard key={pulso.id} pulso={pulso} hidden={showHidden} />
            ))
          )}
        </div>
      </section>

      <NavBar />
    </div>
  )
}
