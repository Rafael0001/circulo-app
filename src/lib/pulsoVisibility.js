export const BASE_CIRCLE_IDS = ['intimos', 'amigos', 'conhecidos']

export function circleRank(circleIds, circleId) {
  const ids = circleIds?.length ? circleIds : BASE_CIRCLE_IDS
  const index = ids.indexOf(circleId)
  if (index >= 0) return index
  const fallback = BASE_CIRCLE_IDS.indexOf(circleId)
  return fallback >= 0 ? fallback : ids.length
}

export function pulsoReachesPlacement(visibility, placement, orderedIds = BASE_CIRCLE_IDS) {
  return circleRank(orderedIds, placement || 'conhecidos') <= circleRank(orderedIds, visibility || 'conhecidos')
}

export function visibilityOptionLabel(circles, circle) {
  const index = circles.findIndex((item) => item.id === circle.id)
  if (index <= 0) return circle.label

  const inner = circles
    .slice(0, index)
    .map((item) => item.label)
    .join(', ')

  return `${circle.label} · inclui ${inner}`
}

export function visibilityHint(circles, selectedId) {
  const index = Math.max(0, circles.findIndex((circle) => circle.id === selectedId))
  const selected = circles[index]
  if (!selected) return ''
  if (index === 0) return `Somente ${selected.label} veem este pulso.`

  const inner = circles
    .slice(0, index)
    .map((circle) => circle.label)
    .join(', ')

  return `${selected.label} e também ${inner}.`
}
