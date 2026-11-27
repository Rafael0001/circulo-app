import { useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, Clock, Minus, Pencil, Plus, Send, Settings, Trash2, Zap } from 'lucide-react'
import { isDefaultCircle } from '../lib/circles'
import {
  angleFromPoint,
  clientPointToSvg,
  compareMapOrder,
  layoutCircleMembers,
  polarToCartesian,
  reorderIdsByAngle,
} from '../lib/circleLayout'
import {
  durationLabel,
  hasDefinedDuration,
  readPulsoPublishSettings,
  toggleAudienceCircle,
  writePulsoPublishSettings,
} from '../lib/pulsoVisibility'
import ConnectionPanel from './ConnectionPanel'
import PulsoAudiencePreview from './PulsoAudiencePreview'
import PulsoPhotoGrid from './PulsoPhotoGrid'
import PulsoPhotoPicker from './PulsoPhotoPicker'

const priorityFlags = {
  is_importante: { icon: AlertTriangle, label: 'importante', accent: '#E8C87A', hint: 'marque quando for relevante' },
  is_urgente: { icon: Zap, label: 'urgente', accent: '#F4956A', hint: 'marque quando precisar agora' },
}

const MIN_ZOOM = 0.7
const MAX_ZOOM = 2.2
const ZOOM_STEP = 0.15
const MAP_DRAG_THRESHOLD = 8

export default function CirculoViz({
  friends,
  circles = [],
  pulsos,
  onMoveFriend,
  onReorderFriends,
  onViewProfile,
  onMuteFriend,
  onUnmuteFriend,
  onRemoveFriend,
  onBlockFriend,
  onRenameCircle,
  onRemoveCircle,
  onCreatePulso,
}) {
  const navigate = useNavigate()
  const svgRef = useRef(null)
  const mapDragRef = useRef(null)
  const mapMovedRef = useRef(false)
  const mapListenersRef = useRef({ move: null, up: null })
  const [mapDrag, setMapDrag] = useState(null)

  const displayFriends = useMemo(() => {
    if (!mapDrag?.friendId || !Number.isFinite(mapDrag.angle)) return friends
    return friends.map((friend) =>
      friend.id === mapDrag.friendId ? { ...friend, mapAngle: mapDrag.angle } : friend,
    )
  }, [friends, mapDrag])

  const layout = useMemo(() => layoutCircleMembers(circles, displayFriends), [circles, displayFriends])
  const rings = layout.rings
  const defaultVisibility = rings[Math.min(1, rings.length - 1)]?.id ?? rings[0]?.id ?? ''

  const [selectedId, setSelectedId] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [pulsoAudience, setPulsoAudience] = useState({
    circleId: defaultVisibility,
    includeInner: true,
  })
  const [pulsoFlags, setPulsoFlags] = useState({ is_importante: false, is_urgente: false })
  const [pulsoText, setPulsoText] = useState('')
  const [pulsoPhotos, setPulsoPhotos] = useState([])
  const [pulsoError, setPulsoError] = useState('')
  const [pulsoBusy, setPulsoBusy] = useState(false)
  const [centerHovered, setCenterHovered] = useState(false)
  const [centerBurst, setCenterBurst] = useState(false)
  const [popoverLift, setPopoverLift] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [zoom, setZoom] = useState(1)
  const [editingId, setEditingId] = useState(null)
  const [editingLabel, setEditingLabel] = useState('')
  const [menuRingId, setMenuRingId] = useState(null)
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 })
  const vizRef = useRef(null)
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
        const keys = [pulso.user_id, pulso.author_id, pulso.author].filter(Boolean)
        keys.forEach((key) => {
          if (!memo[key]) memo[key] = []
          if (!memo[key].some((item) => item.id === pulso.id)) memo[key].push(pulso)
        })
        return memo
      }, {}),
    [pulsos],
  )

  const pulsosForFriend = (friend) => pulseMap[friend?.id] ?? pulseMap[friend?.name] ?? []
  const selectedPulsos = selected ? pulsosForFriend(selected) : []

  const selectedCoordinates = useMemo(() => {
    if (!selected) {
      return null
    }

    const placed = layout.byId.get(selected.id)
    if (!placed) {
      return null
    }

    return {
      x: (300 + placed.x) / 600,
      y: (300 + placed.y) / 600,
    }
  }, [layout, selected])

  const closeModal = () => {
    setShowModal(false)
    setPulsoText('')
    setPulsoPhotos([])
    setPulsoError('')
    setPulsoBusy(false)
    setPulsoFlags({ is_importante: false, is_urgente: false })
  }

  const openPulsoModal = () => {
    const saved = readPulsoPublishSettings()
    const circleId = rings.some((ring) => ring.id === saved?.circleId) ? saved.circleId : defaultVisibility
    setPulsoAudience({
      circleId,
      includeInner: saved?.includeInner !== false,
    })
    setShowModal(true)
  }

  const handleToggleAudience = (clickedId) => {
    setPulsoAudience((current) => {
      const next = toggleAudienceCircle(rings, current, clickedId)
      const saved = readPulsoPublishSettings()
      writePulsoPublishSettings({
        durationHours: saved?.durationHours ?? null,
        includeInner: next.includeInner,
        circleId: next.circleId,
      })
      return next
    })
  }

  const closeFriendPopover = () => {
    setSelectedId(null)
    setPopoverLift(0)
  }

  const commitRename = () => {
    if (!editingId || typeof onRenameCircle !== 'function') {
      setEditingId(null)
      return
    }

    onRenameCircle(editingId, editingLabel)
    setEditingId(null)
  }

  const startRename = (ring) => {
    setMenuRingId(null)
    setEditingId(ring.id)
    setEditingLabel(ring.label)
  }

  const openRingMenu = (ringId, event) => {
    event?.stopPropagation()
    setEditingId(null)

    setMenuRingId((current) => {
      if (current === ringId) {
        return null
      }

      const bounds = vizRef.current?.getBoundingClientRect()
      if (event && bounds) {
        const menuWidth = 84
        const menuHeight = 40
        const gap = 10
        const clickX = event.clientX - bounds.left
        const clickY = event.clientY - bounds.top
        const placeRight = clickX + gap + menuWidth < bounds.width - 8
        const x = placeRight ? clickX + gap : clickX - gap - menuWidth
        const y = Math.min(Math.max(clickY - menuHeight / 2, 8), bounds.height - menuHeight - 8)
        setMenuPos({ x, y })
      }

      return ringId
    })
  }

  const menuRing = rings.find((ring) => ring.id === menuRingId) ?? null
  const canRemoveCircle = circles.length > 1 && menuRing && !isDefaultCircle(menuRing.id)

  const detachMapListeners = () => {
    if (mapListenersRef.current.move) {
      window.removeEventListener('pointermove', mapListenersRef.current.move)
      window.removeEventListener('mousemove', mapListenersRef.current.move)
      mapListenersRef.current.move = null
    }
    if (mapListenersRef.current.up) {
      window.removeEventListener('pointerup', mapListenersRef.current.up)
      window.removeEventListener('pointercancel', mapListenersRef.current.up)
      window.removeEventListener('mouseup', mapListenersRef.current.up)
      mapListenersRef.current.up = null
    }
  }

  const beginMapDrag = (event, placed) => {
    event.stopPropagation()
    try {
      event.currentTarget.setPointerCapture?.(event.pointerId)
    } catch {
      // Untrusted or SVG targets may reject capture; window listeners still track the drag.
    }
    mapMovedRef.current = false
    detachMapListeners()
    const members = displayFriends
      .filter((friend) => friend.circle === placed.ring.id)
      .sort(compareMapOrder)
    const anglesById = new Map()
    layout.placements.forEach((item) => {
      if (item.ring.id === placed.ring.id) anglesById.set(item.id, item.angle)
    })
    mapDragRef.current = {
      pointerId: event.pointerId,
      friendId: placed.id,
      circleId: placed.ring.id,
      radius: placed.ring.radius,
      startX: event.clientX,
      startY: event.clientY,
      order: members.map((friend) => friend.id),
      anglesById,
      x: placed.x,
      y: placed.y,
    }
    mapListenersRef.current.move = (moveEvent) => moveMapDrag(moveEvent)
    mapListenersRef.current.up = (upEvent) => endMapDrag(upEvent)
    window.addEventListener('pointermove', mapListenersRef.current.move, { passive: false })
    window.addEventListener('pointerup', mapListenersRef.current.up)
    window.addEventListener('pointercancel', mapListenersRef.current.up)
    window.addEventListener('mousemove', mapListenersRef.current.move, { passive: false })
    window.addEventListener('mouseup', mapListenersRef.current.up)
  }

  const moveMapDrag = (event) => {
    const drag = mapDragRef.current
    if (!drag) return
    if (event.pointerId !== undefined && drag.pointerId !== undefined && event.pointerId !== drag.pointerId) {
      return
    }

    const deltaX = event.clientX - drag.startX
    const deltaY = event.clientY - drag.startY
    if (!mapMovedRef.current && deltaX * deltaX + deltaY * deltaY < MAP_DRAG_THRESHOLD * MAP_DRAG_THRESHOLD) {
      return
    }

    if (!mapMovedRef.current) {
      mapMovedRef.current = true
      setSelectedId(null)
      setMenuRingId(null)
    }

    event.preventDefault()
    const svg = svgRef.current
    if (!svg) return

    const point = clientPointToSvg(svg, event.clientX, event.clientY)
    const angle = angleFromPoint(point.x - 300, point.y - 300)
    const pos = polarToCartesian(angle, drag.radius)
    const order = reorderIdsByAngle(drag.order, drag.anglesById, drag.friendId, angle)
    mapDragRef.current = { ...drag, order, x: pos.x, y: pos.y, angle }
    setMapDrag({
      friendId: drag.friendId,
      circleId: drag.circleId,
      radius: drag.radius,
      order,
      x: pos.x,
      y: pos.y,
      angle,
    })
  }

  const endMapDrag = (event) => {
    const drag = mapDragRef.current
    if (!drag) return
    if (event?.pointerId !== undefined && drag.pointerId !== undefined && event.pointerId !== drag.pointerId) {
      return
    }

    const moved = mapMovedRef.current
    const dropAngle = Number.isFinite(drag.angle) ? drag.angle : null
    const angles = new Map(drag.anglesById || [])
    if (dropAngle !== null) angles.set(drag.friendId, dropAngle)
    const orderedIds = [...(drag.order || [])].sort(
      (left, right) => (angles.get(left) ?? 0) - (angles.get(right) ?? 0),
    )
    const circleId = drag.circleId

    mapDragRef.current = null
    detachMapListeners()

    if (moved && typeof onReorderFriends === 'function' && orderedIds.length) {
      onReorderFriends(circleId, orderedIds, angles)
    }
    setMapDrag(null)
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

    if ((!content && pulsoPhotos.length === 0) || typeof onCreatePulso !== 'function') {
      return
    }

    setPulsoBusy(true)
    setPulsoError('')
    const savedSettings = readPulsoPublishSettings()
    const visibility = rings.some((ring) => ring.id === pulsoAudience.circleId)
      ? pulsoAudience.circleId
      : defaultVisibility
    const { error } = await onCreatePulso({
      is_importante: pulsoFlags.is_importante,
      is_urgente: pulsoFlags.is_urgente,
      content,
      circle_visibility: visibility,
      include_inner: pulsoAudience.includeInner !== false,
      duration_hours: savedSettings ? savedSettings.durationHours : null,
      photos: pulsoPhotos,
    })
    setPulsoBusy(false)

    if (error) {
      setPulsoError(error.message || 'Não foi possível publicar o pulso.')
      return
    }

    setCenterBurst(true)
    window.setTimeout(() => setCenterBurst(false), 500)
    closeModal()
  }

  return (
    <div className="w-full max-w-md rounded-[30px] border border-[#f0e5d9] bg-[#fffdfb]/80 p-3 shadow-[0_14px_36px_rgba(166,139,107,0.08)] backdrop-blur-sm">
      <div className="mb-2 flex items-center justify-end gap-2 px-1">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setZoom((current) => Math.max(MIN_ZOOM, +(current - ZOOM_STEP).toFixed(2)))}
            disabled={zoom <= MIN_ZOOM}
            className="flex h-7 w-7 items-center justify-center rounded-full border border-[#eadfce] bg-white text-[#6f5a4a] disabled:opacity-40"
            aria-label="Diminuir zoom"
          >
            <Minus size={14} />
          </button>
          <button
            type="button"
            onClick={() => setZoom((current) => Math.min(MAX_ZOOM, +(current + ZOOM_STEP).toFixed(2)))}
            disabled={zoom >= MAX_ZOOM}
            className="flex h-7 w-7 items-center justify-center rounded-full border border-[#eadfce] bg-white text-[#6f5a4a] disabled:opacity-40"
            aria-label="Aumentar zoom"
          >
            <Plus size={14} />
          </button>
          <button
            type="button"
            onClick={() => navigate('/configurar-circulos')}
            className="flex h-7 w-7 items-center justify-center rounded-full border border-[#eadfce] bg-white text-[#6f5a4a]"
            aria-label="Configurações dos círculos"
          >
            <Settings size={14} />
          </button>
        </div>
      </div>

      <div ref={vizRef} className="relative overflow-hidden rounded-[24px]">
        <div
          className="origin-center transition-transform duration-200"
          style={{ transform: `scale(${zoom})` }}
        >
          <svg ref={svgRef} viewBox="0 0 600 600" className="h-[420px] w-full">
            <defs>
              {rings.map((ring) => (
                <radialGradient key={ring.id} id={`grad-${ring.id}`} cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor={ring.color} stopOpacity="0.14" />
                  <stop offset="100%" stopColor={ring.color} stopOpacity="0" />
                </radialGradient>
              ))}
            </defs>

            {rings.map((ring) => (
              <g key={ring.id}>
                <circle cx="300" cy="300" r={ring.radius} fill={`url(#grad-${ring.id})`} />
                <circle
                  cx="300"
                  cy="300"
                  r={ring.radius}
                  fill="none"
                  stroke={ring.color}
                  strokeWidth={mapDrag?.circleId === ring.id ? 3.2 : ring.index === 0 ? 2.5 : 1.5}
                  opacity={mapDrag?.circleId === ring.id ? 1 : 0.85}
                  className="cursor-pointer"
                  onClick={(event) => openRingMenu(ring.id, event)}
                />
                <circle
                  cx="300"
                  cy="300"
                  r={ring.radius}
                  fill="none"
                  stroke="transparent"
                  strokeWidth="18"
                  className="cursor-pointer"
                  onClick={(event) => openRingMenu(ring.id, event)}
                />
              </g>
            ))}

            {mapDrag ? (
              <circle
                cx={300 + (layout.byId.get(mapDrag.friendId)?.x ?? mapDrag.x)}
                cy={300 + (layout.byId.get(mapDrag.friendId)?.y ?? mapDrag.y)}
                r={layout.byId.get(mapDrag.friendId)?.size ? layout.byId.get(mapDrag.friendId).size + 6 : 22}
                fill="none"
                stroke={rings.find((ring) => ring.id === mapDrag.circleId)?.color || '#c9a27a'}
                strokeWidth="1.4"
                strokeDasharray="4 4"
                opacity="0.7"
              />
            ) : null}

            {(mapDrag
              ? [
                  ...layout.placements.filter((placed) => placed.id !== mapDrag.friendId),
                  layout.placements.find((placed) => placed.id === mapDrag.friendId),
                ].filter(Boolean)
              : layout.placements
            ).map((placed) => {
              const { friend, ring, size } = placed
              const isSelected = selected?.id === friend.id
              const isMapDragging = mapDrag?.friendId === friend.id
              const friendPulsos = pulsosForFriend(friend)
              const hasPulse = friendPulsos.length > 0
              const showPulseWaves = hasPulse && !isSelected
              const pulseColor = hasPulse
                ? friendPulsos.some((pulso) => pulso.is_urgente)
                  ? '#E5484D'
                  : friendPulsos.some((pulso) => pulso.is_importante)
                    ? '#E8C84A'
                    : ring.color
                : ring.color
              const pulseStroke = Math.max(0.75, size * 0.045)
              const drawX = isMapDragging ? mapDrag.x : placed.x
              const drawY = isMapDragging ? mapDrag.y : placed.y

              return (
                <g
                  key={friend.id}
                  transform={`translate(${300 + drawX}, ${300 + drawY})`}
                  className={isMapDragging ? 'cursor-grabbing' : 'cursor-grab'}
                  role="button"
                  aria-label={friend.name}
                  style={{ touchAction: 'none' }}
                  opacity={isMapDragging ? 0.92 : 1}
                  onDragStart={(event) => event.preventDefault()}
                  onPointerDown={(event) => beginMapDrag(event, placed)}
                  onPointerMove={moveMapDrag}
                  onPointerUp={endMapDrag}
                  onPointerCancel={endMapDrag}
                  onClick={() => {
                    if (mapMovedRef.current) {
                      mapMovedRef.current = false
                      return
                    }
                    setSelectedId(isSelected ? null : friend.id)
                  }}
                >
                  {showPulseWaves && (
                    <>
                      <circle
                        cx="0"
                        cy="0"
                        r={size}
                        fill="transparent"
                        stroke={pulseColor}
                        strokeWidth={pulseStroke}
                        className="pulse-ring"
                      />
                      <circle
                        cx="0"
                        cy="0"
                        r={size}
                        fill="transparent"
                        stroke={pulseColor}
                        strokeWidth={pulseStroke}
                        className="pulse-ring pulse-ring-delayed"
                      />
                      <circle
                        cx="0"
                        cy="0"
                        r={size}
                        fill="transparent"
                        stroke={pulseColor}
                        strokeWidth={pulseStroke}
                        className="pulse-ring pulse-ring-delayed-2"
                      />
                    </>
                  )}

                  <circle
                    r={size}
                    fill={isSelected ? ring.color : '#fff9f4'}
                    stroke={ring.color}
                    strokeWidth={isSelected ? 3 : 1.5}
                    opacity={1}
                  />

                  {friend.avatarUrl ? (
                    <>
                      <clipPath id={`avatar-${friend.id}`}>
                        <circle r={size - 2} />
                      </clipPath>
                      <image
                        href={friend.avatarUrl}
                        x={-(size - 2)}
                        y={-(size - 2)}
                        width={(size - 2) * 2}
                        height={(size - 2) * 2}
                        clipPath={`url(#avatar-${friend.id})`}
                        preserveAspectRatio="xMidYMid slice"
                      />
                    </>
                  ) : (
                    <text x="0" y="4" textAnchor="middle" fontSize={Math.max(8, size * 0.45)} fontWeight="700" fill={isSelected ? '#fff' : '#4b4f5b'}>
                      {friend.initials}
                    </text>
                  )}

                  {placed.showName || isSelected ? (
                    <text x="0" y={size + 14} textAnchor="middle" fontSize="10" fill="#685f57">
                      {friend.name}
                    </text>
                  ) : null}
                </g>
              )
            })}

            {rings.map((ring) => (
              <g key={`${ring.id}-label`}>
                {editingId === ring.id ? (
                  <foreignObject x="175" y={300 - ring.radius - 2} width="250" height="28">
                    <input
                      autoFocus
                      value={editingLabel}
                      onChange={(event) => setEditingLabel(event.target.value)}
                      onBlur={commitRename}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          event.preventDefault()
                          commitRename()
                        }
                        if (event.key === 'Escape') {
                          setEditingId(null)
                        }
                      }}
                      className="w-full rounded-full border border-[#eadfce] bg-white px-2 py-0.5 text-center text-[11px] font-semibold uppercase tracking-[0.14em] text-[#5c4733] outline-none"
                    />
                  </foreignObject>
                ) : (
                  <text
                    x="300"
                    y={300 - ring.radius + 18}
                    textAnchor="middle"
                    fontSize="11"
                    letterSpacing="0.16em"
                    fill={ring.color}
                    stroke="#fffdfb"
                    strokeWidth="4"
                    paintOrder="stroke"
                    className="cursor-pointer font-semibold uppercase"
                    onClick={(event) => openRingMenu(ring.id, event)}
                  >
                    {ring.label}
                  </text>
                )}
              </g>
            ))}

            <g
              onClick={openPulsoModal}
              onMouseEnter={() => setCenterHovered(true)}
              onMouseLeave={() => setCenterHovered(false)}
              className="cursor-pointer"
              role="button"
              aria-label="Pulsar"
            >
              {centerBurst && (
                <>
                  <circle cx="300" cy="300" r="42" fill="none" stroke="#F15A22" strokeWidth="1.5" opacity="0.75" className="center-pulse" />
                  <circle cx="300" cy="300" r="42" fill="none" stroke="#F15A22" strokeWidth="1.1" opacity="0.42" className="center-pulse center-pulse-delayed" />
                </>
              )}
              <defs>
                <clipPath id="pulsar-logo-clip">
                  <circle cx="300" cy="300" r="38" />
                </clipPath>
              </defs>
              <image
                href="/logo-colorida.png"
                x="205"
                y="205"
                width="190"
                height="190"
                preserveAspectRatio="xMidYMid meet"
                clipPath="url(#pulsar-logo-clip)"
                opacity={centerHovered ? 0.92 : 1}
              />
              <g
                transform="translate(300, 310) scale(1.15) translate(-12, -12)"
                pointerEvents="none"
                fill="none"
                stroke="#fff"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity={centerHovered ? 0.95 : 1}
              >
                <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
                <path d="M8 12h8" />
                <path d="M12 8v8" />
              </g>
              <circle cx="300" cy="300" r="38" fill="transparent" />
            </g>
          </svg>
        </div>

        {menuRing ? (
          <div
            className="absolute z-30 flex items-center gap-1 rounded-full border border-[#eadfce] bg-white/95 p-1 shadow-[0_10px_24px_rgba(80,60,40,0.14)]"
            style={{ left: menuPos.x, top: menuPos.y }}
          >
            <button
              type="button"
              onClick={() => startRename(menuRing)}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-[#f7ead8] text-[#6a4a2e]"
              aria-label="Renomear círculo"
            >
              <Pencil size={14} />
            </button>
            <button
              type="button"
              disabled={!canRemoveCircle || typeof onRemoveCircle !== 'function'}
              onClick={() => {
                onRemoveCircle?.(menuRing.id)
                setMenuRingId(null)
              }}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-[#f8e4dc] text-[#8a4a38] disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Excluir círculo"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ) : null}

        {selectedPulsos.length > 0 && selectedCoordinates && (
          <div className="absolute inset-0 z-20" onClick={closeFriendPopover}>
            <div
              className="absolute w-[240px] rounded-[18px] border border-[#f0e6d8] bg-white p-3 shadow-[0_18px_30px_rgba(60,45,35,0.12)]"
              onClick={(event) => event.stopPropagation()}
              style={{
                left: `${Math.min(Math.max(selectedCoordinates.x * 100, 18), 82)}%`,
                top: `${Math.min(Math.max(selectedCoordinates.y * 100, 12), 88)}%`,
                transform: selectedCoordinates.y > 0.5 ? 'translate(-50%, calc(-100% - 12px))' : 'translate(-50%, 12px)',
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
                  {selectedPulsos.map((pulso) => {
                    const activePulsoFlags = Object.entries(priorityFlags).filter(([key]) => pulso[key])

                    return (
                      <div key={pulso.id} className="rounded-[12px] border border-[#f5eee8] bg-[#fffaf4] p-2.5">
                        <div className="mb-1 flex items-center justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-1">
                            {activePulsoFlags.map(([key, option]) => {
                              const Icon = option.icon
                              return (
                                <span
                                  key={`${pulso.id}-${key}`}
                                  className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-[0.12em]"
                                  style={{
                                    background: `${option.accent}22`,
                                    color: option.accent,
                                  }}
                                >
                                  <Icon className="h-2.5 w-2.5" fill="currentColor" strokeWidth={1.6} />
                                  {option.label}
                                </span>
                              )
                            })}
                          </div>
                          <span className="inline-flex items-center gap-1 text-[8px] uppercase tracking-[0.1em] text-[#8a7a69]">
                            {hasDefinedDuration(pulso.duration_hours) ? (
                              <span className="inline-flex items-center gap-0.5" title={`Duração de ${durationLabel(pulso.duration_hours)}`}>
                                <Clock className="h-2.5 w-2.5" />
                                {durationLabel(pulso.duration_hours)}
                              </span>
                            ) : null}
                            {formatPulsoTimestamp(pulso.created_at)}
                          </span>
                        </div>
                        {pulso.content ? (
                          <p className="text-[12px] leading-5 text-[#362f2b]">{pulso.content}</p>
                        ) : null}
                        <div className={pulso.content ? 'mt-1.5' : ''}>
                          <PulsoPhotoGrid photos={pulso.photos} compact />
                        </div>
                      </div>
                    )
                  })}
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
            className="absolute inset-0 z-10 flex items-center justify-center rounded-[24px] bg-[#1a1715]/55 px-5 py-6"
            onClick={closeModal}
          >
            <div
              className="w-full max-w-[280px] rounded-[16px] border border-[#f0e6d8] bg-white p-3.5 shadow-[0_18px_38px_rgba(50,40,32,0.18)]"
              onClick={(event) => event.stopPropagation()}
              style={{ animation: 'modalIn 0.22s ease-out' }}
            >
              <div className="mb-2 flex items-center justify-between">
                <button type="button" onClick={closeModal} className="text-lg leading-none text-[#7b695d]" aria-label="Fechar modal">
                  ×
                </button>
                <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#9a8e80]">novo pulso</span>
              </div>

              <div className="grid grid-cols-2 gap-1.5">
                {Object.entries(priorityFlags).map(([key, option]) => {
                  const isActive = pulsoFlags[key]

                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setPulsoFlags((current) => ({ ...current, [key]: !current[key] }))}
                      className="flex items-center justify-center gap-1.5 rounded-xl border px-2 py-1.5 transition"
                      style={{
                        borderColor: isActive ? option.accent : '#f0e7de',
                        background: isActive ? `${option.accent}1A` : '#fffaf4',
                        color: isActive ? option.accent : '#5f4c3e',
                      }}
                    >
                      <span
                        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full"
                        style={{ background: `${option.accent}22`, color: option.accent }}
                      >
                        <option.icon className="h-3 w-3" fill={isActive ? 'currentColor' : 'none'} strokeWidth={1.8} />
                      </span>
                      <span className="text-[9px] font-semibold uppercase tracking-[0.06em] text-inherit">{option.label}</span>
                    </button>
                  )
                })}
              </div>

              <textarea
                value={pulsoText}
                onChange={(event) => setPulsoText(event.target.value)}
                rows={2}
                placeholder="Escreva seu pulso..."
                className="mt-3 w-full resize-none rounded-xl border border-[#f0e7de] bg-[#fffaf4] px-2.5 py-2 text-sm text-[#372f2a] outline-none placeholder:text-[#ad9b8b] focus:border-[#d3b888]"
              />

              <PulsoPhotoPicker
                photos={pulsoPhotos}
                disabled={pulsoBusy}
                onChange={(next) => {
                  setPulsoPhotos(next)
                  setPulsoError('')
                }}
                onError={setPulsoError}
              />

              {pulsoError ? <p className="mt-2 text-sm text-[#b42318]">{pulsoError}</p> : null}

              <PulsoAudiencePreview
                circles={rings}
                circleId={pulsoAudience.circleId}
                includeInner={pulsoAudience.includeInner}
                onToggleCircle={handleToggleAudience}
              />

              <button
                type="button"
                onClick={handleCreate}
                disabled={pulsoBusy || (!pulsoText.trim() && pulsoPhotos.length === 0)}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-full bg-[#2A2A2A] px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.14em] text-[#E8C87A] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Send className="h-3.5 w-3.5" />
                {pulsoBusy ? 'enviando...' : 'enviar'}
              </button>
            </div>
          </div>
        )}
      </div>

      {selected ? (
        <ConnectionPanel
          friend={selected}
          circles={rings}
          onViewProfile={onViewProfile}
          onMoveFriend={onMoveFriend}
          onMute={onMuteFriend}
          onUnmute={onUnmuteFriend}
          onRemove={async (friendId) => {
            const ok = await onRemoveFriend?.(friendId)
            if (ok) closeFriendPopover()
            return ok
          }}
          onBlock={onBlockFriend}
        />
      ) : null}
    </div>
  )
}
