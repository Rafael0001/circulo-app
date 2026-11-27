const CENTER_CLEAR = 62
const FIT_RADIUS = 272
const MIN_AVATAR = 10
const RING_GAP = 16

export function polarToCartesian(angle, radius) {
  const radians = ((angle - 90) * Math.PI) / 180
  return {
    x: Math.cos(radians) * radius,
    y: Math.sin(radians) * radius,
  }
}

export function angleFromPoint(x, y) {
  return (((Math.atan2(x, -y) * 180) / Math.PI) + 360) % 360
}

export function compareMapOrder(a, b) {
  const left = Number.isFinite(a?.sortOrder) ? a.sortOrder : 0
  const right = Number.isFinite(b?.sortOrder) ? b.sortOrder : 0
  if (left !== right) return left - right
  return String(a?.id || '').localeCompare(String(b?.id || ''))
}

export function normalizeAngle(angle) {
  return ((Number(angle) % 360) + 360) % 360
}

export function memberLayoutAngle(friend, memberIndex, count, ringIndex) {
  if (Number.isFinite(friend?.mapAngle)) return normalizeAngle(friend.mapAngle)
  return count === 0 ? 0 : (360 / count) * memberIndex + ringIndex * 18
}

export function reorderIdsByAngle(memberIds, anglesById, draggedId, pointerAngle) {
  return [...memberIds]
    .map((id) => ({
      id,
      angle: id === draggedId ? pointerAngle : (anglesById.get(id) ?? 0),
    }))
    .sort((left, right) => left.angle - right.angle)
    .map((item) => item.id)
}

export function clientPointToSvg(svg, clientX, clientY, viewSize = 600) {
  const rect = svg.getBoundingClientRect()
  return {
    x: ((clientX - rect.left) / Math.max(rect.width, 1)) * viewSize,
    y: ((clientY - rect.top) / Math.max(rect.height, 1)) * viewSize,
  }
}

export function avatarSizeForCount(count, ringIndex) {
  const base = Math.max(18, 32 - ringIndex * 3)
  if (count <= 6) return base
  if (count <= 12) return Math.max(MIN_AVATAR, Math.round(base * 0.78))
  if (count <= 24) return Math.max(MIN_AVATAR, Math.round(base * 0.58))
  if (count <= 40) return Math.max(MIN_AVATAR, Math.round(base * 0.48))
  return MIN_AVATAR
}

export function orbitCapacity(radius, size) {
  const spacing = size * 2 + 6
  return Math.max(1, Math.floor((2 * Math.PI * Math.max(radius, 1)) / spacing))
}

function laneOffsets(laneCount, pitch, mode = 'straddle') {
  if (laneCount <= 1) {
    return [0]
  }

  if (mode === 'outward') {
    return Array.from({ length: laneCount }, (_, index) => index * pitch)
  }

  if (mode === 'inward') {
    return Array.from({ length: laneCount }, (_, index) => -index * pitch)
  }

  const offsets = [0]
  for (let step = 1; offsets.length < laneCount; step += 1) {
    offsets.push(step * pitch)
    if (offsets.length < laneCount) offsets.push(-step * pitch)
  }
  return offsets.slice(0, laneCount)
}

function bandHalf(lanes, pitch, size) {
  return ((Math.max(lanes, 1) - 1) * pitch) / 2 + size + 8
}

function placeRadii(count, lanes, pitches, sizes) {
  const radii = []
  for (let index = 0; index < count; index += 1) {
    const inner = bandHalf(lanes[index], pitches[index], sizes[index])
    if (index === 0) {
      radii.push(CENTER_CLEAR + inner)
    } else {
      const previous = bandHalf(lanes[index - 1], pitches[index - 1], sizes[index - 1])
      radii.push(radii[index - 1] + previous + RING_GAP + inner)
    }
  }
  return radii
}

export function layoutCircleMembers(circles = [], friends = []) {
  if (circles.length === 0) {
    return { rings: [], placements: [], byId: new Map() }
  }

  const count = circles.length
  const groups = circles.map((circle) =>
    friends.filter((friend) => friend.circle === circle.id).sort(compareMapOrder),
  )
  const crowded = groups.some((group) => group.length > 8)

  if (!crowded) {
    const rings = circles.map((circle, index) => {
      const radius = count === 1 ? 270 : 110 + ((160 * index) / Math.max(count - 1, 1))
      return {
        ...circle,
        index,
        radius,
        size: Math.max(22, 36 - index * 3),
        lanes: 1,
        pitch: 0,
      }
    })
    const placements = []
    const byId = new Map()
    rings.forEach((ring, ringIndex) => {
      const members = groups[ringIndex]
      members.forEach((friend, memberIndex) => {
        const angle = memberLayoutAngle(friend, memberIndex, members.length, ringIndex)
        const pos = polarToCartesian(angle, ring.radius)
        const item = {
          id: friend.id,
          friend,
          ring,
          x: pos.x,
          y: pos.y,
          size: ring.size,
          showName: true,
          radius: ring.radius,
          angle,
        }
        placements.push(item)
        byId.set(friend.id, item)
      })
    })
    return { rings, placements, byId }
  }

  let sizes = groups.map((group, index) => avatarSizeForCount(group.length, index))
  let radii = []
  let lanes = groups.map(() => 1)
  let pitches = sizes.map((size) => size * 2 + 6)

  for (let pass = 0; pass < 12; pass += 1) {
    pitches = sizes.map((size) => size * 2 + 6)
    lanes = groups.map((group, index) => {
      const guess = count === 1 ? 190 : 110 + (160 * index) / Math.max(count - 1, 1)
      return Math.min(10, Math.max(1, Math.ceil(Math.max(group.length, 1) / orbitCapacity(guess, sizes[index]))))
    })
    radii = placeRadii(count, lanes, pitches, sizes)
    lanes = groups.map((group, index) =>
      Math.min(10, Math.max(1, Math.ceil(Math.max(group.length, 1) / orbitCapacity(radii[index], sizes[index])))),
    )
    radii = placeRadii(count, lanes, pitches, sizes)

    const outer = radii[count - 1] + bandHalf(lanes[count - 1], pitches[count - 1], sizes[count - 1])
    if (outer <= FIT_RADIUS) {
      break
    }

    const scale = FIT_RADIUS / outer
    if (sizes.every((size) => size <= MIN_AVATAR)) {
      radii = radii.map((radius) => radius * scale)
      pitches = pitches.map((pitch) => pitch * scale)
      break
    }

    sizes = sizes.map((size) => Math.max(MIN_AVATAR, Math.round(size * 0.9)))
  }

  const rings = circles.map((circle, index) => ({
    ...circle,
    index,
    radius: radii[index],
    size: sizes[index],
    lanes: lanes[index],
    pitch: pitches[index],
  }))

  const placements = []
  const byId = new Map()

  rings.forEach((ring, ringIndex) => {
    const members = groups[ringIndex]
    const offsetMode = ringIndex === 0 ? 'outward' : ringIndex === count - 1 ? 'inward' : 'straddle'
    const offsets = laneOffsets(ring.lanes, ring.pitch, offsetMode)
    const capacity = Math.max(1, orbitCapacity(ring.radius, ring.size))
    const showName = members.length <= 8
    const minRadius = CENTER_CLEAR + ring.size + 8

    members.forEach((friend, memberIndex) => {
      const lane = Math.min(Math.floor(memberIndex / capacity), ring.lanes - 1)
      const start = lane * capacity
      const laneCount = lane === ring.lanes - 1 ? members.length - start : capacity
      const indexInLane = memberIndex - start
      const labelGap = members.length > 8 ? 36 : 0
      const span = 360 - labelGap
      const packedAngle =
        labelGap / 2 +
        (span / Math.max(laneCount, 1)) * indexInLane +
        ringIndex * 12 +
        lane * (8 / Math.max(laneCount, 2))
      const angle = Number.isFinite(friend.mapAngle) ? normalizeAngle(friend.mapAngle) : packedAngle
      const radius = Math.max(minRadius, ring.radius + (offsets[lane] ?? 0))
      const pos = polarToCartesian(angle, radius)
      const item = {
        id: friend.id,
        friend,
        ring,
        x: pos.x,
        y: pos.y,
        size: ring.size,
        showName,
        radius,
        angle,
      }
      placements.push(item)
      byId.set(friend.id, item)
    })
  })

  return { rings, placements, byId }
}
