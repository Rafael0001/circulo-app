import { storageKey } from './friendsStorage'

const ALERTS_KEY = 'circulo_alerts'
const SEEN_KEY = 'circulo_seen_pulsos'

export function readAlerts(userId) {
  if (!userId) return []
  try {
    const parsed = JSON.parse(localStorage.getItem(storageKey(ALERTS_KEY, userId)) || '[]')
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeAlerts(userId, alerts) {
  if (!userId) return
  try {
    localStorage.setItem(storageKey(ALERTS_KEY, userId), JSON.stringify(alerts.slice(0, 40)))
  } catch {
    // ignore
  }
}

function readSeen(userId) {
  try {
    const parsed = JSON.parse(localStorage.getItem(storageKey(SEEN_KEY, userId)) || '[]')
    return new Set(Array.isArray(parsed) ? parsed : [])
  } catch {
    return new Set()
  }
}

function writeSeen(userId, ids) {
  try {
    localStorage.setItem(storageKey(SEEN_KEY, userId), JSON.stringify([...ids].slice(0, 200)))
  } catch {
    // ignore
  }
}

export function shouldNotifyAbout(authorId, friends, viewerId) {
  if (!authorId || authorId === viewerId) return false
  const friend = friends.find((item) => item.id === authorId)
  if (!friend) return false
  return !friend.muted
}

export function ingestPulsoAlerts(userId, pulsos, friends) {
  if (!userId) return readAlerts(userId)

  const seen = readSeen(userId)
  const nextSeen = new Set(seen)
  const alerts = readAlerts(userId)
  let changed = false

  if (seen.size === 0) {
    pulsos.forEach((pulso) => {
      if (pulso.id) nextSeen.add(pulso.id)
    })
    writeSeen(userId, nextSeen)
    return alerts
  }

  pulsos.forEach((pulso) => {
    const authorId = pulso.user_id || pulso.author_id
    if (!pulso.id || seen.has(pulso.id)) {
      if (pulso.id) nextSeen.add(pulso.id)
      return
    }

    nextSeen.add(pulso.id)
    if (!shouldNotifyAbout(authorId, friends, userId)) return

    changed = true
    alerts.unshift({
      id: pulso.id,
      authorId,
      author: pulso.author,
      text: pulso.content,
      createdAt: pulso.created_at,
    })
  })

  writeSeen(userId, nextSeen)
  if (changed) writeAlerts(userId, alerts)
  return alerts
}

export function clearAlerts(userId) {
  writeAlerts(userId, [])
}
