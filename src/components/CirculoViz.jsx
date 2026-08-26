import { useMemo, useRef, useState } from 'react'

const circleMeta = {
  intimos: { radius: 116, color: '#f0c575', label: 'íntimos' },
  amigos: { radius: 192, color: '#7ccdc2', label: 'amigos' },
  conhecidos: { radius: 268, color: '#ad9ae9', label: 'conhecidos' },
}

const categoryOptions = {
  necessidade: { icon: '🤝', label: 'necessidade', accent: '#F4956A', hint: 'ex: preciso de carona hoje' },
  vontade: { icon: '✨', label: 'vontade', accent: '#4DC68B', hint: 'ex: querendo viajar pra Bahia' },
  sonho: { icon: '🌙', label: 'sonho', accent: '#8B8FF8', hint: 'ex: abrir uma cafeteria' },
  projeto: { icon: '🚀', label: 'projeto', accent: '#F0BA3A', hint: 'ex: lançando meu podcast' },
}

const angleByCircle = {
  intimos: [300, 60, 180],
  amigos: [35, 120, 220, 315],
  conhecidos: [20, 95, 160, 240, 310],
}

function polarToCartesian(angle, radius) {
  const radians = ((angle - 90) * Math.PI) / 180
  return {
    x: Math.cos(radians) * radius,
    y: Math.sin(radians) * radius,
  }
}

export default function CirculoViz({ friends, pulsos, onMoveFriend, onCreatePulso, selectedCircle = 'todos' }) {
  const [selectedId, setSelectedId] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [pulsoStep, setPulsoStep] = useState(1)
  const [pulsoCategory, setPulsoCategory] = useState('necessidade')
  const [pulsoVisibility, setPulsoVisibility] = useState('amigos')
  const [pulsoText, setPulsoText] = useState('')
  const [centerHovered, setCenterHovered] = useState(false)
  const [centerBurst, setCenterBurst] = useState(false)
  const [popoverLift, setPopoverLift] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const dragStartRef = useRef({ y: 0, lift: 0 })
  const isDraggingRef = useRef(false)
  const dragHandleRef = useRef(null)

  const selected = useMemo(
    () => friends.find((friend) => friend.id === selectedId) ?? null,
    [friends, selectedId],
  )

  const pulseMap = useMemo(
    () =>
      pulsos.reduce((memo, pulso) => {
        if (!memo[pulso.author]) {
          memo[pulso.author] = []
        }

        memo[pulso.author].push(pulso)
        return memo
      }, {}),
    [pulsos],
  )

  const selectedPulsos = selected ? pulseMap[selected.name] ?? [] : []
  const selectedCoordinates = useMemo(() => {
    if (!selected) {
      return null
    }

    const members = friends.filter((friend) => friend.circle === selected.circle)
    const index = members.findIndex((friend) => friend.id === selected.id)
    const placements = angleByCircle[selected.circle] ?? [0]
    const angle = placements[index] ?? placements[0]
    const pos = polarToCartesian(angle, circleMeta[selected.circle].radius)

    return {
      x: (300 + pos.x) / 600,
      y: (300 + pos.y) / 600,
    }
  }, [friends, selected])

  const closeModal = () => {
    setShowModal(false)
    setPulsoStep(1)
    setPulsoText('')
    setPulsoCategory('necessidade')
    setPulsoVisibility('amigos')
  }

  const closeFriendPopover = () => {
    setSelectedId(null)
    setPopoverLift(0)
  }

  const handlePointerDown = (event) => {
    if (selectedPulsos.length <= 1) {
      return
    }

    event.preventDefault()
    isDraggingRef.current = true
    setIsDragging(true)
    dragStartRef.current = { y: event.clientY, lift: popoverLift }

    if (dragHandleRef.current) {
      dragHandleRef.current.setPointerCapture(event.pointerId)
    }
  }

  const handlePointerMove = (event) => {
    if (!isDraggingRef.current || selectedPulsos.length <= 1) {
      return
    }

    const deltaY = dragStartRef.current.y - event.clientY
    const nextLift = Math.min(Math.max(dragStartRef.current.lift + deltaY, 0), 120)
    setPopoverLift(nextLift)
  }

  const handlePointerEnd = (event) => {
    if (!isDraggingRef.current) {
      return
    }

    isDraggingRef.current = false
    setIsDragging(false)

    if (event && dragHandleRef.current && event.pointerId !== undefined) {
      dragHandleRef.current.releasePointerCapture(event.pointerId)
    }

    setPopoverLift((current) => (current > 60 ? 110 : 0))
  }

  const formatPulsoTimestamp = (value) => {
    if (!value) {
      return ''
    }

    const date = new Date(value)
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date)
  }

  const handleCreate = async () => {
    const content = pulsoText.trim()

    if (!content || typeof onCreatePulso !== 'function') {
      return
    }

    await onCreatePulso({
      category: pulsoCategory,
      content,
      circle_visibility: pulsoVisibility,
    })

    setCenterBurst(true)
    window.setTimeout(() => setCenterBurst(false), 500)
    closeModal()
  }

  return (
    <div className="w-full max-w-md rounded-[30px] border border-[#f0e5d9] bg-[#fffdfb]/80 p-3 shadow-[0_14px_36px_rgba(166,139,107,0.08)] backdrop-blur-sm">
      <div className="mb-2 text-center">
        <p className="text-[10px] font-semibold uppercase tracking-[0.38em] text-[#9a8e80]">círculo</p>
      </div>

      <div className="relative">
        <svg viewBox="0 0 600 600" className="h-[420px] w-full overflow-visible">
          <defs>
            {Object.entries(circleMeta).map(([key, value]) => (
              <radialGradient key={key} id={`grad-${key}`} cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor={value.color} stopOpacity="0.14" />
                <stop offset="100%" stopColor={value.color} stopOpacity="0" />
              </radialGradient>
            ))}
          </defs>

          {Object.entries(circleMeta).map(([key, value], index) => (
            <g key={key}>
              <circle cx="300" cy="300" r={value.radius} fill={`url(#grad-${key})`} />
              <circle
                cx="300"
                cy="300"
                r={value.radius}
                fill="none"
                stroke={value.color}
                strokeWidth={index === 0 ? 2.5 : 1.5}
                strokeDasharray={key === 'conhecidos' ? '6 8' : '0'}
                opacity={0.85}
              />
              <text
                x="300"
                y={300 - value.radius + 18}
                textAnchor="middle"
                fontSize="11"
                letterSpacing="0.16em"
                fill={value.color}
                className="font-semibold uppercase"
              >
                {value.label}
              </text>
            </g>
          ))}

          {Object.entries(circleMeta).map(([circleName, meta]) => {
            const members = friends.filter((friend) => friend.circle === circleName)
            const placements = angleByCircle[circleName] ?? [0]

            return members.map((friend, memberIndex) => {
              const angle = placements[memberIndex] ?? placements[0]
              const pos = polarToCartesian(angle, meta.radius)
              const size = circleName === 'intimos' ? 36 : circleName === 'amigos' ? 30 : 26
              const isSelected = selected?.id === friend.id
              const hasPulse = Boolean((pulseMap[friend.name] ?? []).length)
              const isDimmed = selectedCircle !== 'todos' && friend.circle !== selectedCircle

              return (
                <g
                  key={friend.id}
                  transform={`translate(${300 + pos.x}, ${300 + pos.y})`}
                  className="cursor-pointer"
                  opacity={isDimmed ? 0.28 : 1}
                  onClick={() => setSelectedId(isSelected ? null : friend.id)}
                >
                  {hasPulse && (
                    <>
                      <circle
                        cx="0"
                        cy="0"
                        r={size + 8}
                        fill="none"
                        stroke="#f7a86a"
                        strokeWidth="1.1"
                        opacity="0.7"
                        className="pulse-ring"
                        style={{ transformOrigin: '50% 50%', transformBox: 'fill-box' }}
                      />
                      <circle
                        cx="0"
                        cy="0"
                        r={size + 16}
                        fill="none"
                        stroke="#f7a86a"
                        strokeWidth="0.9"
                        opacity="0.45"
                        className="pulse-ring pulse-ring-delayed"
                        style={{ transformOrigin: '50% 50%', transformBox: 'fill-box' }}
                      />
                      <circle
                        cx="0"
                        cy="0"
                        r={size + 24}
                        fill="none"
                        stroke="#f7a86a"
                        strokeWidth="0.7"
                        opacity="0.2"
                        className="pulse-ring pulse-ring-delayed-2"
                        style={{ transformOrigin: '50% 50%', transformBox: 'fill-box' }}
                      />
                    </>
                  )}

                  <circle
                    r={size}
                    fill={isSelected ? meta.color : '#fff9f4'}
                    stroke={meta.color}
                    strokeWidth={isSelected ? 3 : 1.5}
                    opacity={1}
                  />

                  <text x="0" y="4" textAnchor="middle" fontSize={Math.max(10, size * 0.45)} fontWeight="700" fill={isSelected ? '#fff' : '#4b4f5b'}>
                    {friend.initials}
                  </text>

                  <text x="0" y={size + 16} textAnchor="middle" fontSize="10" fill="#685f57">
                    {friend.name}
                  </text>
                </g>
              )
            })
          })}

          <g
            onClick={() => setShowModal(true)}
            onMouseEnter={() => setCenterHovered(true)}
            onMouseLeave={() => setCenterHovered(false)}
            className="cursor-pointer"
          >
            {centerBurst && (
              <>
                <circle cx="300" cy="300" r="36" fill="none" stroke="#E8C87A" strokeWidth="1.5" opacity="0.75" className="center-pulse" />
                <circle cx="300" cy="300" r="36" fill="none" stroke="#E8C87A" strokeWidth="1.1" opacity="0.42" className="center-pulse center-pulse-delayed" />
              </>
            )}
            <circle cx="300" cy="300" r="34" fill={centerHovered ? '#3A3A3A' : '#2A2A2A'} opacity="1" />
            <circle cx="300" cy="300" r="34" fill="none" stroke="#E8C87A" strokeWidth="1.5" opacity="0.7" className={centerBurst ? 'center-pulse' : ''} />
            <text x="300" y="306" textAnchor="middle" fontSize="11" letterSpacing="0.12em" fill="#E8C87A" fontWeight="700">
              pulsar
            </text>
          </g>
        </svg>

        {selectedPulsos.length > 0 && selectedCoordinates && (
          <div
            className="absolute inset-0 z-20"
            onClick={closeFriendPopover}
          >
            <div
              className="absolute w-[240px] rounded-[18px] border border-[#f0e6d8] bg-white p-3 shadow-[0_18px_30px_rgba(60,45,35,0.12)]"
              onClick={(event) => event.stopPropagation()}
              style={{
                left: `${Math.min(Math.max(selectedCoordinates.x * 100, 18), 82)}%`,
                top: `${Math.min(Math.max(selectedCoordinates.y * 100, 22), 78)}%`,
                transform: 'translate(-50%, 0)',
              }}
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8d7b67]">{selected.name}</span>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-[#f4ead9] px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-[#7f6042]">
                    {selectedPulsos.length} pulsos
                  </span>
                  <button
                    type="button"
                    onClick={closeFriendPopover}
                    className="flex h-6 w-6 items-center justify-center rounded-full bg-[#f5efe8] text-sm text-[#5f4f47]"
                    aria-label="Fechar pulsos"
                  >
                    ×
                  </button>
                </div>
              </div>

              <div className="relative flex max-h-[220px] overflow-hidden">
                <div
                  className="flex-1 space-y-2"
                  style={{
                    transform: `translateY(-${popoverLift}px)`,
                    transition: isDragging ? 'none' : 'transform 0.2s ease',
                  }}
                >
                  {selectedPulsos.map((pulso) => (
                    <div key={pulso.id} className="rounded-[12px] border border-[#f5eee8] bg-[#fffaf4] p-2.5">
                      <div className="mb-1 flex items-center justify-between gap-2">
                        <span
                          className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-[0.12em]"
                          style={{
                            background: `${categoryOptions[pulso.category]?.accent ?? '#F4956A'}22`,
                            color: categoryOptions[pulso.category]?.accent ?? '#F4956A',
                          }}
                        >
                          <span>{categoryOptions[pulso.category]?.icon ?? '✦'}</span>
                          {pulso.category}
                        </span>
                        <span className="text-[8px] uppercase tracking-[0.1em] text-[#8a7a69]">
                          {formatPulsoTimestamp(pulso.created_at)}
                        </span>
                      </div>
                      <p className="text-[12px] leading-5 text-[#362f2b]">{pulso.content}</p>
                    </div>
                  ))}
                </div>

                <div
                  ref={dragHandleRef}
                  className="ml-2 flex w-3 cursor-grab touch-none items-center justify-center rounded-full bg-[#f4efe9]"
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerEnd}
                  onPointerLeave={handlePointerEnd}
                  onPointerCancel={handlePointerEnd}
                >
                  <div className="h-12 w-1 rounded-full bg-[#d9c8b6]" />
                </div>
              </div>
            </div>
          </div>
        )}

        {showModal && (
          <div
            className="absolute inset-0 z-10 flex items-center justify-center rounded-[30px] bg-[#1a1715]/55 px-4 py-10"
            onClick={closeModal}
          >
            <div
              className="w-full max-w-[320px] rounded-[16px] border border-[#f0e6d8] bg-white p-4 shadow-[0_18px_38px_rgba(50,40,32,0.18)]"
              onClick={(event) => event.stopPropagation()}
              style={{ animation: 'modalIn 0.22s ease-out' }}
            >
              <div className="mb-3 flex items-center justify-between">
                <button type="button" onClick={closeModal} className="text-lg text-[#7b695d]" aria-label="Fechar modal">
                  ×
                </button>
                <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#9a8e80]">novo pulso</span>
              </div>

              {pulsoStep === 1 ? (
                <>
                  <p className="mb-3 text-sm font-medium text-[#4f4239]">Escolha a categoria</p>
                  <div className="space-y-2">
                    {Object.entries(categoryOptions).map(([key, option]) => {
                      const selected = pulsoCategory === key

                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => {
                            setPulsoCategory(key)
                            setPulsoStep(2)
                          }}
                          className="flex w-full items-center gap-3 rounded-[14px] border px-3 py-3 text-left transition"
                          style={{
                            borderColor: selected ? option.accent : '#f0e7de',
                            background: selected ? `${option.accent}1A` : '#fffaf4',
                          }}
                        >
                          <span className="flex h-10 w-10 items-center justify-center rounded-full text-lg" style={{ background: `${option.accent}22`, color: option.accent }}>
                            {option.icon}
                          </span>
                          <span className="flex-1">
                            <span className="block text-sm font-semibold text-[#302b29]">{option.label}</span>
                            <span className="block text-[11px] text-[#7b695d]">{option.hint}</span>
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </>
              ) : (
                <>
                  <div className="mb-3 flex items-center justify-between">
                    <button type="button" onClick={() => setPulsoStep(1)} className="text-sm font-medium text-[#7b695d]">← voltar</button>
                    <span
                      className="inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em]"
                      style={{ background: `${categoryOptions[pulsoCategory].accent}22`, color: categoryOptions[pulsoCategory].accent }}
                    >
                      <span>{categoryOptions[pulsoCategory].icon}</span>
                      {categoryOptions[pulsoCategory].label}
                    </span>
                  </div>

                  <label className="mb-3 block text-sm text-[#5a4b3f]">
                    Visível para
                    <select
                      value={pulsoVisibility}
                      onChange={(event) => setPulsoVisibility(event.target.value)}
                      className="mt-1 w-full rounded-2xl border border-[#eddcc7] bg-[#fffaf4] px-3 py-2.5 text-sm outline-none transition focus:border-[#d4a86d]"
                    >
                      <option value="intimos">íntimos</option>
                      <option value="amigos">amigos</option>
                      <option value="conhecidos">conhecidos</option>
                    </select>
                  </label>

                  <textarea
                    value={pulsoText}
                    onChange={(event) => setPulsoText(event.target.value)}
                    rows={5}
                    placeholder="Escreva seu pulso..."
                    className="w-full resize-none rounded-[14px] border border-[#f0e7de] bg-[#fffaf4] p-3 text-sm text-[#372f2a] outline-none placeholder:text-[#ad9b8b] focus:border-[#d3b888]"
                  />

                  <button
                    type="button"
                    onClick={handleCreate}
                    disabled={!pulsoText.trim()}
                    className="mt-4 w-full rounded-full bg-[#2A2A2A] px-4 py-3 text-sm font-semibold uppercase tracking-[0.16em] text-[#E8C87A] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    pulsar
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {selected && onMoveFriend && (
        <div className="mt-4 rounded-[20px] border border-[#f0e2d7] bg-[#fffaf4] p-3">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8b7870]">mover {selected.name}</p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(circleMeta).map(([circleName, meta]) => (
              <button
                key={circleName}
                type="button"
                onClick={() => onMoveFriend(selected.id, circleName)}
                className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${
                  selected.circle === circleName
                    ? 'border-transparent bg-[#ead3a9] text-[#5c4733]'
                    : 'border-[#e7d8ca] bg-white text-[#6f5a4a]'
                }`}
              >
                {meta.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
