import NavBar from '../components/NavBar'
import CirculoViz from '../components/CirculoViz'
import PulsoCard from '../components/PulsoCard'
import { useFriends } from '../hooks/useFriends'
import { usePulsos } from '../hooks/usePulsos'

export default function Home() {
  const { friends, circles, maxCircles, moveFriend, addCircle, renameCircle } = useFriends()
  const { pulsos, criarPulso } = usePulsos()

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col px-4 pb-28 pt-6">
      <header className="mb-5 flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-[#90795e]">seu círculo</p>
          <h1 className="mt-1 text-3xl font-semibold text-[#2e2926]">Círculo</h1>
        </div>
        <div className="rounded-full bg-[#f7e8d2] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8b5f38]">
          {friends.length} amigos
        </div>
      </header>

      <CirculoViz
        friends={friends}
        circles={circles}
        maxCircles={maxCircles}
        pulsos={pulsos}
        onMoveFriend={moveFriend}
        onAddCircle={addCircle}
        onRenameCircle={renameCircle}
        onCreatePulso={criarPulso}
      />

      <section className="mt-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-[0.24em] text-[#8d7c6b]">pulsos</h2>
          <span className="text-[11px] text-[#9a8d7c]">{pulsos.length}</span>
        </div>

        <div className="space-y-3">
          {pulsos.length === 0 ? (
            <p className="rounded-[24px] border border-dashed border-[#eadfce] bg-white/70 px-4 py-6 text-center text-sm text-[#8d7c6b]">
              Nenhum pulso neste círculo.
            </p>
          ) : (
            pulsos.map((pulso) => <PulsoCard key={pulso.id} pulso={pulso} />)
          )}
        </div>
      </section>

      <NavBar />
    </div>
  )
}
