import { useMemo, useState } from 'react'
import NavBar from '../components/NavBar'
import CirculoViz from '../components/CirculoViz'
import PulsoCard from '../components/PulsoCard'
import { useFriends } from '../hooks/useFriends'
import { usePulsos } from '../hooks/usePulsos'

const filterOptions = [
  { value: 'todos', label: 'todos' },
  { value: 'intimos', label: 'íntimos' },
  { value: 'amigos', label: 'amigos' },
  { value: 'conhecidos', label: 'conhecidos' },
]

export default function Home() {
  const { friends, moveFriend } = useFriends()
  const { pulsos, criarPulso } = usePulsos()
  const [selectedCircle, setSelectedCircle] = useState('todos')

  const visiblePulsos = useMemo(() => {
    if (selectedCircle === 'todos') return pulsos
    return pulsos.filter((pulso) => pulso.circle_visibility === selectedCircle)
  }, [selectedCircle, pulsos])

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

      <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
        {filterOptions.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => setSelectedCircle(option.value)}
            className={`rounded-full border px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.12em] transition ${
              selectedCircle === option.value
                ? 'border-[#d9b57a] bg-[#f3e7d1] text-[#6a4a2e]'
                : 'border-[#eadfce] bg-white text-[#786a5a]'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      <CirculoViz friends={friends} pulsos={pulsos} onMoveFriend={moveFriend} onCreatePulso={criarPulso} />

      <section className="mt-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-[0.24em] text-[#8d7c6b]">pulsos</h2>
          <span className="text-[11px] text-[#9a8d7c]">{visiblePulsos.length}</span>
        </div>

        <div className="space-y-3">
          {visiblePulsos.map((pulso) => (
            <PulsoCard key={pulso.id} pulso={pulso} />
          ))}
        </div>
      </section>

      <NavBar />
    </div>
  )
}
