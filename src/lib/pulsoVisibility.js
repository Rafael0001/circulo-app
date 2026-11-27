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

export function parsePulsoDuration(value, fallback = null) {
  if (value === null || value === '' || value === 'none') return null
  if (value === undefined) return fallback
  const hours = Number(value)
  return PULSO_DURATIONS.includes(hours) ? hours : fallback
}

export function readPulsoPublishSettings() {
  try {
    const parsed = JSON.parse(localStorage.getItem(PULSO_SETTINGS_KEY) || 'null')
    if (!parsed || typeof parsed !== 'object') return null
    return {
      durationHours: Object.prototype.hasOwnProperty.call(parsed, 'durationHours')
        ? parsePulsoDuration(parsed.durationHours, null)
        : null,
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
        durationHours: parsePulsoDuration(settings.durationHours, null),
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

export function hasDefinedDuration(hours) {
  return PULSO_DURATIONS.includes(Number(hours))
}

export const URGENT_TAG_HOURS = 48
export const IMPORTANT_TAG_HOURS = 24 * 7

export function activePulsoFlags(pulso, now = Date.now()) {
  const created = new Date(pulso?.created_at || 0).getTime()
  const ageMs = Number.isFinite(created) ? Math.max(0, now - created) : Number.POSITIVE_INFINITY
  const urgentLimit = URGENT_TAG_HOURS * 60 * 60 * 1000
  const importantLimit = IMPORTANT_TAG_HOURS * 60 * 60 * 1000

  return {
    is_urgente: Boolean(pulso?.is_urgente) && ageMs < urgentLimit,
    is_importante: Boolean(pulso?.is_importante) && ageMs < importantLimit,
  }
}

export function durationLabel(hours) {
  if (Number(hours) === 12) return '12 horas'
  if (Number(hours) === 24) return '1 dia'
  if (Number(hours) === 48) return '2 dias'
  return ''
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

export function circlesReached(circles = [], selectedId, includeInner = true) {
  const ids = circles.map((circle) => circle.id)
  return circles.filter((circle) =>
    pulsoReachesPlacement(selectedId, circle.id, ids, includeInner !== false),
  )
}

export function toggleAudienceCircle(circles = [], current, clickedId) {
  const includeInner = current?.includeInner !== false
  const circleId = current?.circleId
  const index = circles.findIndex((circle) => circle.id === clickedId)
  if (index < 0) {
    return { circleId, includeInner }
  }

  const reached = circlesReached(circles, circleId, includeInner)
  const isOn = reached.some((circle) => circle.id === clickedId)

  if (!isOn) {
    return { circleId: clickedId, includeInner: true }
  }

  if (index === 0) {
    return { circleId: circles[0].id, includeInner: true }
  }

  return { circleId: circles[index - 1].id, includeInner: true }
}

export function visibilityHint(circles = [], selectedId, includeInner = true) {
  const selected = circles.find((circle) => circle.id === selectedId)
  const reached = circlesReached(circles, selectedId, includeInner)
  if (!selected || reached.length === 0) return ''

  if (includeInner === false || reached.length === 1) {
    return `Somente ${selected.label} veem este pulso.`
  }

  if (reached.length === circles.length) {
    return `Todos os círculos, até ${selected.label}.`
  }

  const names = reached.map((circle) => circle.label)
  const last = names.pop()
  return `${names.join(', ')} e ${last} veem este pulso.`
}
