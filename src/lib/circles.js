import { BASE_CIRCLE_IDS } from './pulsoVisibility'

export const MAX_CIRCLES = 5

export const BASE_CIRCLES = [
  { id: 'intimos', label: 'íntimos', color: '#f0c575', isDefault: true },
  { id: 'amigos', label: 'amigos', color: '#7ccdc2', isDefault: true },
  { id: 'conhecidos', label: 'conhecidos', color: '#ad9ae9', isDefault: true },
]

export const CIRCLE_COLORS = [
  '#f0c575',
  '#7ccdc2',
  '#ad9ae9',
  '#f0a3c2',
  '#8ec5e8',
  '#F15A22',
  '#e8a07a',
  '#9bbf8a',
  '#d4a86d',
  '#6b8cae',
]

export function isDefaultCircle(circleId) {
  return BASE_CIRCLE_IDS.includes(circleId)
}

export function normalizeCircles(list) {
  if (!Array.isArray(list) || list.length === 0) return BASE_CIRCLES

  return list
    .filter((circle) => circle && typeof circle.id === 'string')
    .slice(0, MAX_CIRCLES)
    .map((circle, index) => ({
      id: circle.id,
      label: circle.label || `círculo ${index + 1}`,
      color: circle.color || CIRCLE_COLORS[index % CIRCLE_COLORS.length],
      isDefault: circle.isDefault === true || isDefaultCircle(circle.id),
    }))
}
