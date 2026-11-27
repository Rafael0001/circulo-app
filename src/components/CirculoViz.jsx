import { useMemo, useRef, useState } from 'react'

const circleMeta = {
  intimos: { radius: 116, color: '#f0c575', label: 'íntimos' },
  amigos: { radius: 192, color: '#7ccdc2', label: 'amigos' },
  conhecidos: { radius: 268, color: '#ad9ae9', label: 'conhecidos' },
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

export default function CirculoViz({ friends, pulsos, onMoveFriend, onCreatePulso }) {
  const [selectedId, setSelectedId] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [pulsoText, setPulsoText] = useState('')
  const [centerHovered, setCenterHovered] = useState(false)
  const [centerBurst, setCenterBurst] = useState(false)
  const [popoverLift, setPopoverLift] = useState(0)
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
    setPulsoText('')
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

    // Category field kept for API compatibility; no category UI on Home.
    await onCreatePulso({
      category: 'necessidade',
      content,
      circle_visibility: 'amigos',
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

              return (
                <g
                  key={friend.id}
                  transform={`translate(${300 + pos.x}, ${300 + pos.y})`}
                  className="cursor-pointer"
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
            role="button"
            aria-label="Pulsar"
          >
            {centerBurst && (
              <>
                <circle cx="300" cy="288" r="40" fill="none" stroke="var(--circulo-core, #E4780C)" strokeWidth="1.5" opacity="0.75" className="center-pulse" />
                <circle cx="300" cy="288" r="40" fill="none" stroke="var(--circulo-core, #E4780C)" strokeWidth="1.1" opacity="0.42" className="center-pulse center-pulse-delayed" />
              </>
            )}
            <circle
              cx="300"
              cy="288"
              r="36"
              fill={centerHovered ? 'var(--circulo-core-soft, #F3A24A)' : 'var(--circulo-core, #E4780C)'}
            />
            <circle
              cx="292"
              cy="282"
              r="3.2"
              fill="var(--circulo-smile, #FFFFFF)"
            />
            <circle
              cx="308"
              cy="282"
              r="3.2"
              fill="var(--circulo-smile, #FFFFFF)"
            />
            <path
              d="M290 294c3.4 6.4 16.6 6.4 20 0"
              fill="none"
              stroke="var(--circulo-smile, #FFFFFF)"
              strokeWidth="3.2"
              strokeLinecap="round"
            />
            <text
              x="300"
              y="348"
              textAnchor="middle"
              fontSize="15"
              fontWeight="700"
              fill="var(--circulo-pulsar-label, #E4780C)"
              style={{ fontFamily: 'Fraunces, Georgia, serif' }}
            >
              Pulsar
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
                    transition: isDraggingRef.current ? 'none' : 'transform 0.2s ease',
                  }}
                >
                  {selectedPulsos.map((pulso) => (
                    <div key={pulso.id} className="rounded-[12px] border border-[#f5eee8] bg-[#fffaf4] p-2.5">
                      <div className="mb-1 flex items-center justify-end">
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

              <textarea
                value={pulsoText}
                onChange={(event) => setPulsoText(event.target.value)}
                rows={6}
                placeholder="Escreva seu pulso..."
                className="w-full resize-none rounded-[14px] border border-[#f0e7de] bg-[#fffaf4] p-3 text-sm text-[#372f2a] outline-none placeholder:text-[#ad9b8b] focus:border-core"
              />

              <button
                type="button"
                onClick={handleCreate}
                disabled={!pulsoText.trim()}
                className="mt-4 w-full rounded-full bg-core px-4 py-3 text-sm font-semibold text-smile transition hover:bg-core-soft disabled:cursor-not-allowed disabled:opacity-50"
              >
                Pulsar
              </button>
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
