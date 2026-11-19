export const BASE_CIRCLE_IDS = ['intimos', 'amigos', 'conhecidos']

export function circleRank(circleIds, circleId) {
  const ids = circleIds?.length ? circleIds : BASE_CIRCLE_IDS
  const index = ids.indexOf(circleId)
  if (index >= 0) return index
  const fallback = BASE_CIRCLE_IDS.indexOf(circleId)
  return fallback >= 0 ? fallback : ids.length
}

export function pulsoReachesPlacement(visibility, placement, orderedIds = BASE_CIRCLE_IDS, includeInner = true) {
  if (!includeInner) {
    return (placement || '') === (visibility || '')
  }

  return circleRank(orderedIds, placement || 'conhecidos') <= circleRank(orderedIds, visibility || 'conhecidos')
}

export const PULSO_DURATIONS = [12, 24, 48]
const PULSO_SETTINGS_KEY = 'circulo_pulso_publish_settings'

export function readPulsoPublishSettings() {
  try {
    const parsed = JSON.parse(localStorage.getItem(PULSO_SETTINGS_KEY) || 'null')
    if (!parsed || typeof parsed !== 'object') return null
    const durationHours = PULSO_DURATIONS.includes(Number(parsed.durationHours))
      ? Number(parsed.durationHours)
      : 24
    return {
      durationHours,
      includeInner: parsed.includeInner !== false,
      circleId: typeof parsed.circleId === 'string' ? parsed.circleId : '',
    }
  } catch {
    return null
  }
}

export function writePulsoPublishSettings(settings) {
  try {
    localStorage.setItem(
      PULSO_SETTINGS_KEY,
      JSON.stringify({
        durationHours: PULSO_DURATIONS.includes(Number(settings.durationHours))
          ? Number(settings.durationHours)
          : 24,
        includeInner: settings.includeInner !== false,
        circleId: settings.circleId || '',
      }),
    )
  } catch {
    // ignore quota / private mode
  }
}

export function expiresAtFromDuration(createdAt, durationHours) {
  if (!durationHours) return null
  const start = createdAt ? new Date(createdAt).getTime() : Date.now()
  if (Number.isNaN(start)) return null
  return new Date(start + durationHours * 60 * 60 * 1000).toISOString()
}

export function durationLabel(hours) {
  return `${hours}h`
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
