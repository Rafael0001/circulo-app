import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useAuth } from './useAuth'
import {
  DEFAULT_NOTIFICATION_PREFS,
  loadNotificationPrefs,
  normalizeNotificationPrefs,
  saveNotificationPrefs,
} from '../lib/notificationPreferences'

const NotificationPrefsContext = createContext(null)

export function NotificationPrefsProvider({ children }) {
  const { user } = useAuth()
  const userId = user?.id ?? null
  const [prefs, setPrefs] = useState(DEFAULT_NOTIFICATION_PREFS)
  const [loading, setLoading] = useState(Boolean(userId))

  useEffect(() => {
    if (!userId) {
      setPrefs(DEFAULT_NOTIFICATION_PREFS)
      setLoading(false)
      return undefined
    }

    let cancelled = false
    setLoading(true)
    loadNotificationPrefs(userId).then((next) => {
      if (!cancelled) {
        setPrefs(next)
        setLoading(false)
      }
    })

    return () => {
      cancelled = true
    }
  }, [userId])

  const savePrefs = useCallback(
    async (nextPrefs) => {
      if (!userId) return { prefs: DEFAULT_NOTIFICATION_PREFS, error: { message: 'Faça login para salvar.' } }
      const normalized = normalizeNotificationPrefs(nextPrefs)
      setPrefs(normalized)
      return saveNotificationPrefs(userId, normalized)
    },
    [userId],
  )

  const value = useMemo(
    () => ({
      prefs,
      loading,
      savePrefs,
    }),
    [prefs, loading, savePrefs],
  )

  return <NotificationPrefsContext.Provider value={value}>{children}</NotificationPrefsContext.Provider>
}

export function useNotificationPreferences() {
  const context = useContext(NotificationPrefsContext)
  if (!context) {
    throw new Error('useNotificationPreferences must be used within NotificationPrefsProvider')
  }
  return context
}
