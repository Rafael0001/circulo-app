const HIDES_STORAGE_KEY = 'circulo_pulso_hides'

function hidesKey(userId) {
  return `${HIDES_STORAGE_KEY}:${userId}`
}

export function readStoredPulsoHides(userId) {
  if (!userId) return []

  try {
    const parsed = JSON.parse(localStorage.getItem(hidesKey(userId)) || '[]')
    return Array.isArray(parsed) ? [...new Set(parsed.filter((id) => typeof id === 'string' && id))] : []
  } catch {
    return []
  }
}

export function writeStoredPulsoHides(userId, pulsoIds) {
  if (!userId) return
  try {
    localStorage.setItem(
      hidesKey(userId),
      JSON.stringify([...new Set((pulsoIds || []).filter((id) => typeof id === 'string' && id))]),
    )
  } catch {
    // ignore
  }
}

export function normalizeHideIds(rows) {
  if (!Array.isArray(rows)) return []
  return [
    ...new Set(
      rows
        .map((row) => (typeof row === 'string' ? row : row?.pulso_id))
        .filter((id) => typeof id === 'string' && id),
    ),
  ]
}
