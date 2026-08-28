import { useState } from 'react'
import { UserRound, Users, X } from 'lucide-react'

const categoryColors = {
  necessidade: '#F4956A',
  vontade: '#4DC68B',
  sonho: '#8B8FF8',
  projeto: '#F0BA3A',
}

const circleColors = {
  intimos: '#FAC775',
  amigos: '#5DCAA5',
  conhecidos: '#AFA9EC',
}

export default function FriendCard({
  friend,
  circles,
  pulsos,
  position,
  onClose,
  onOpenSheet,
  onMove,
}) {
  const [showMovePanel, setShowMovePanel] = useState(false)

  const currentCircle = circles.find((circle) => circle.id === friend.circle)
  const moveOptions = circles.filter((circle) => circle.id !== friend.circle)

  return (
    <div
      className="fixed z-30 w-[270px] rounded-[22px] border border-[#f0e6d8] bg-white p-3 shadow-[0_20px_40px_rgba(58,41,29,0.12)] opacity-100 transition-all duration-200 ease-out"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        transform: 'translate(-12px, -12px)',
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-full text-[11px] font-bold text-[#2f2a28]"
            style={{ background: friend.avatarColor ?? '#F4E2CB' }}
          >
            {friend.initials}
          </div>
          <div>
            <p className="text-sm font-semibold text-[#2f2a28]">{friend.name}</p>
            <p
              className="text-[10px] font-semibold uppercase tracking-[0.14em]"
              style={{ color: currentCircle?.color ?? '#AFA9EC' }}
            >
              {currentCircle?.label ?? 'conhecidos'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-[#f6efe8] text-[#6c564d]"
          aria-label="Fechar amigo"
        >
          <X size={16} />
        </button>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={onOpenSheet}
          className="flex h-11 items-center justify-center gap-2 rounded-full border border-[#e9dcc9] bg-[#fffaf4] text-[11px] font-semibold uppercase tracking-[0.14em] text-[#4c413b]"
        >
          <UserRound size={15} />
          ver perfil
        </button>

        <button
          type="button"
          onClick={() => setShowMovePanel((current) => !current)}
          className="flex h-11 items-center justify-center gap-2 rounded-full border border-[#e9dcc9] bg-[#fffaf4] text-[11px] font-semibold uppercase tracking-[0.14em] text-[#4c413b]"
        >
          <Users size={15} />
          mover
        </button>
      </div>

      {showMovePanel && moveOptions.length > 0 && (
        <div className="mt-3 rounded-[14px] border border-[#f0e6d8] bg-[#fffaf4] p-2">
          <p className="mb-2 text-[9px] font-semibold uppercase tracking-[0.16em] text-[#8d7b67]">mover para</p>
          <div className="flex flex-wrap gap-2">
            {moveOptions.map((circle) => (
              <button
                key={circle.id}
                type="button"
                onClick={() => {
                  onMove(friend.id, circle.id)
                  setShowMovePanel(false)
                }}
                className="rounded-full border border-[#eadfce] bg-white px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#4d4139]"
                style={{ borderColor: `${circleColors[circle.id] ?? '#AFA9EC'}66` }}
              >
                {circle.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="mt-4">
        <p className="mb-2 text-[9px] font-semibold uppercase tracking-[0.18em] text-[#8d7b67]">pulsos</p>

        {pulsos.length === 0 ? (
          <p className="text-[12px] italic text-[#8a7a69]">nenhum pulso ativo</p>
        ) : (
          <div className="space-y-2">
            {pulsos.slice(0, 3).map((pulso) => (
              <div
                key={pulso.id}
                className="rounded-[12px] border border-[#f3ebdf] bg-[#fffdfb] px-2 py-2"
              >
                <div className="mb-1 flex items-center justify-between gap-2">
                  <span
                    className="rounded-full px-2 py-0.5 text-[8px] font-semibold uppercase tracking-[0.12em]"
                    style={{
                      background: `${categoryColors[pulso.category] ?? '#F4956A'}22`,
                      color: categoryColors[pulso.category] ?? '#F4956A',
                    }}
                  >
                    {pulso.category}
                  </span>
                </div>
                <p className="text-[11px] italic leading-5 text-[#433b36]">{pulso.content}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
