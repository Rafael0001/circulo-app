import { isSupabaseConfigured, supabase } from './supabase'
import { storageKey } from './friendsStorage'

export const PULSO_FILTERS = [
  { value: 'all', label: 'Todos os Pulsos' },
  { value: 'urgent', label: 'Somente Pulsos urgentes' },
  { value: 'none', label: 'Nenhum Pulso' },
]

const STORAGE_KEY = 'circulo_notification_prefs'

export const DEFAULT_NOTIFICATION_PREFS = {
  pulsoFilter: 'all',
  allCircles: true,
  circleIds: [],
}

export function normalizeNotificationPrefs(raw) {
  const pulsoFilter = ['all', 'urgent', 'none'].includes(raw?.pulsoFilter || raw?.pulso_filter)
    ? raw.pulsoFilter || raw.pulso_filter
    : 'all'
  const allCircles = raw?.allCircles ?? raw?.all_circles
  const circleIds = Array.isArray(raw?.circleIds)
    ? raw.circleIds.filter(Boolean)
    : Array.isArray(raw?.circle_ids)
      ? raw.circle_ids.filter(Boolean)
      : []

  if (allCircles === false && circleIds.length > 0) {
    return { pulsoFilter, allCircles: false, circleIds: [...new Set(circleIds)] }
  }

  return {
    pulsoFilter,
    allCircles: true,
    circleIds: [],
  }
}

function readLocalPrefs(userId) {
  if (!userId) return DEFAULT_NOTIFICATION_PREFS
  try {
    const parsed = JSON.parse(localStorage.getItem(storageKey(STORAGE_KEY, userId)) || 'null')
    return normalizeNotificationPrefs(parsed || DEFAULT_NOTIFICATION_PREFS)
  } catch {
    return DEFAULT_NOTIFICATION_PREFS
  }
}

function writeLocalPrefs(userId, prefs) {
  if (!userId) return
  try {
    localStorage.setItem(storageKey(STORAGE_KEY, userId), JSON.stringify(normalizeNotificationPrefs(prefs)))
  } catch {
    // ignore
  }
}

export async function loadNotificationPrefs(userId) {
  if (!userId) return DEFAULT_NOTIFICATION_PREFS

  if (!isSupabaseConfigured || !supabase) {
    return readLocalPrefs(userId)
  }

  const { data, error } = await supabase
    .from('notification_preferences')
    .select('pulso_filter, all_circles, circle_ids')
    .eq('user_id', userId)
    .maybeSingle()

  if (error || !data) {
    return readLocalPrefs(userId)
  }

  const prefs = normalizeNotificationPrefs(data)
  writeLocalPrefs(userId, prefs)
  return prefs
}

export async function saveNotificationPrefs(userId, prefs) {
  const next = normalizeNotificationPrefs(prefs)
  if (!userId) return { prefs: next, error: { message: 'Usuário inválido.' } }

  writeLocalPrefs(userId, next)

  if (!isSupabaseConfigured || !supabase) {
    return { prefs: next, error: null }
  }

  const { error } = await supabase.from('notification_preferences').upsert(
    {
      user_id: userId,
      pulso_filter: next.pulsoFilter,
      all_circles: next.allCircles,
      circle_ids: next.allCircles ? [] : next.circleIds,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' },
  )

  return { prefs: next, error }
}

export function selectAllCircles(prefs) {
  return normalizeNotificationPrefs({
    ...prefs,
    allCircles: true,
    circleIds: [],
  })
}

export function toggleCirclePreference(prefs, circleId) {
  if (!circleId) return normalizeNotificationPrefs(prefs)
  const current = normalizeNotificationPrefs(prefs)

  if (current.allCircles) {
    return normalizeNotificationPrefs({
      pulsoFilter: current.pulsoFilter,
      allCircles: false,
      circleIds: [circleId],
    })
  }

  const has = current.circleIds.includes(circleId)
  const circleIds = has
    ? current.circleIds.filter((id) => id !== circleId)
    : [...current.circleIds, circleId]

  if (circleIds.length === 0) {
    return selectAllCircles(current)
  }

  return normalizeNotificationPrefs({
    pulsoFilter: current.pulsoFilter,
    allCircles: false,
    circleIds,
  })
}
