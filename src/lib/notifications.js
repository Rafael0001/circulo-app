import { storageKey } from './friendsStorage'
import { activePulsoFlags } from './pulsoVisibility'
import {
  DEFAULT_NOTIFICATION_PREFS,
  normalizeNotificationPrefs,
} from './notificationPreferences'

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

export function matchesNotificationPrefs(friend, pulso, prefs = DEFAULT_NOTIFICATION_PREFS) {
  const settings = normalizeNotificationPrefs(prefs)
  if (!friend || friend.muted) return false

  if (settings.pulsoFilter === 'none') return false
  if (settings.pulsoFilter === 'urgent') {
    const flags = activePulsoFlags(pulso || {})
    if (!flags.is_urgente) return false
  }

  if (settings.allCircles) return true
  return settings.circleIds.includes(friend.circle)
}

export function shouldNotifyAbout(authorId, friends, viewerId, pulso = null, prefs = DEFAULT_NOTIFICATION_PREFS) {
  if (!authorId || authorId === viewerId) return false
  const friend = friends.find((item) => item.id === authorId)
  if (!friend) return false
  return matchesNotificationPrefs(friend, pulso, prefs)
}

export function alertStillMatches(alert, friends, viewerId, prefs = DEFAULT_NOTIFICATION_PREFS) {
  if (!alert?.authorId || alert.authorId === viewerId) return false
  const friend = friends.find((item) => item.id === alert.authorId)
  if (!friend || friend.muted) return false

  return matchesNotificationPrefs(
    friend,
    {
      is_urgente: alert.is_urgente,
      is_importante: alert.is_importante,
      created_at: alert.createdAt,
    },
    prefs,
  )
}

export function ingestPulsoAlerts(userId, pulsos, friends, prefs = DEFAULT_NOTIFICATION_PREFS) {
  if (!userId) return readAlerts(userId)

  const settings = normalizeNotificationPrefs(prefs)
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
    if (!shouldNotifyAbout(authorId, friends, userId, pulso, settings)) return

    const friend = friends.find((item) => item.id === authorId)
    const flags = activePulsoFlags(pulso)
    changed = true
    alerts.unshift({
      id: pulso.id,
      authorId,
      author: pulso.author,
      text: pulso.content,
      createdAt: pulso.created_at,
      circle: friend?.circle || null,
      is_urgente: flags.is_urgente,
      is_importante: flags.is_importante,
    })
  })

  writeSeen(userId, nextSeen)
  if (changed) writeAlerts(userId, alerts)
  return alerts
}

export function clearAlerts(userId) {
  writeAlerts(userId, [])
}
