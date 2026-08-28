import { ArrowLeftRight, UserRound, X } from 'lucide-react'

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

export default function FriendSheet({
  friend,
  circles,
  pulsos,
  onClose,
  onMove,
  onRemoveFromCircle,
}) {
  const currentCircle = circles.find((circle) => circle.id === friend.circle)
  const moveOptions = circles.filter((circle) => circle.id !== friend.circle)

  return (
    <div className="fixed inset-0 z-40 bg-[#1f1a17]/20 backdrop-blur-[2px]">
      <div className="absolute inset-x-0 bottom-0 mx-auto w-full max-w-md rounded-t-[28px] border border-[#f1e7dc] bg-[#fffdfb] p-4 shadow-[0_-18px_40px_rgba(55,41,35,0.14)] transition-transform duration-300 ease-out translate-y-0">
        <div className="mx-auto mb-3 h-1.5 w-14 rounded-full bg-[#e7d3ba]" />

        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className="flex h-14 w-14 items-center justify-center rounded-full text-base font-bold text-[#2f2a28]"
              style={{ background: friend.avatarColor ?? '#F4E2CB' }}
            >
              {friend.initials}
            </div>
            <div>
              <p className="text-xl font-semibold text-[#2e2926]">{friend.name}</p>
              <p
                className="text-[10px] font-semibold uppercase tracking-[0.16em]"
                style={{ color: currentCircle?.color ?? '#AFA9EC' }}
              >
                {currentCircle?.label ?? 'conhecidos'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f6efe8] text-[#6c564d]"
            aria-label="Fechar perfil"
          >
            <X size={18} />
          </button>
        </div>

        <div className="mb-4 grid grid-cols-2 gap-2">
          <button
            type="button"
            className="flex h-11 items-center justify-center gap-2 rounded-full bg-[#2b2928] text-[11px] font-semibold uppercase tracking-[0.14em] text-[#f5d89a]"
            disabled
          >
            <UserRound size={15} />
            ver perfil
          </button>

          <button
            type="button"
            onClick={() => {
              if (moveOptions.length > 0) {
                onMove(friend.id, moveOptions[0].id)
              }
            }}
            className="flex h-11 items-center justify-center gap-2 rounded-full border border-[#e9dcc9] bg-[#fffaf4] text-[11px] font-semibold uppercase tracking-[0.14em] text-[#4c413b]"
          >
            <ArrowLeftRight size={15} />
            mover
          </button>
        </div>

        <div className="mb-5 rounded-[16px] border border-[#f0e6d8] bg-[#fffaf4] p-3">
          <p className="mb-2 text-[9px] font-semibold uppercase tracking-[0.18em] text-[#8d7b67]">mover para</p>
          <div className="flex flex-wrap gap-2">
            {moveOptions.map((circle) => (
              <button
                key={circle.id}
                type="button"
                onClick={() => onMove(friend.id, circle.id)}
                className="rounded-full border border-[#eadfce] bg-white px-2.5 py-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#4d4139]"
                style={{ borderColor: `${circleColors[circle.id] ?? '#AFA9EC'}66` }}
              >
                {circle.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-5">
          <p className="mb-2 text-[9px] font-semibold uppercase tracking-[0.18em] text-[#8d7b67]">pulsos ativos</p>
          <div className="space-y-2">
            {pulsos.length === 0 ? (
              <p className="text-[12px] italic text-[#8a7a69]">nenhum pulso ativo</p>
            ) : (
              pulsos.map((pulso) => (
                <div key={pulso.id} className="rounded-[14px] border border-[#f2ebdf] bg-[#fffdfb] p-2.5">
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
                  <p className="text-[12px] italic leading-5 text-[#433b36]">{pulso.content}</p>
                </div>
              ))
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={() => onRemoveFromCircle(friend.id)}
          className="flex h-11 w-full items-center justify-center rounded-full bg-[#b6534e] text-[11px] font-semibold uppercase tracking-[0.14em] text-white"
        >
          remover do círculo
        </button>
      </div>
    </div>
  )
}
