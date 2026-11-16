import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

const STORAGE_KEY = 'circulo_pulsos'

const PulsosContext = createContext(null)

function storageKey(userId) {
  return `${STORAGE_KEY}:${userId}`
}

function normalizePulso(pulso) {
  if (!pulso || typeof pulso !== 'object') {
    return pulso
  }

  return {
    ...pulso,
    is_importante: Boolean(pulso.is_importante),
    is_urgente: Boolean(pulso.is_urgente),
  }
}

function readPulsos(userId) {
  if (!userId) return []

  try {
    const raw = localStorage.getItem(storageKey(userId))
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.map(normalizePulso) : []
  } catch {
    return []
  }
}

export function PulsosProvider({ children }) {
  const { user } = useAuth()
  const userId = user?.id ?? null
  const [pulsos, setPulsos] = useState([])
  const [hydratedFor, setHydratedFor] = useState(null)

  useEffect(() => {
    if (!userId) {
      setPulsos([])
      setHydratedFor(null)
      return
    }

    setPulsos(readPulsos(userId))
    setHydratedFor(userId)
  }, [userId])

  useEffect(() => {
    if (!userId || hydratedFor !== userId) return

    try {
      localStorage.setItem(storageKey(userId), JSON.stringify(pulsos))
    } catch {
      // ignore quota / private mode
    }
  }, [pulsos, userId, hydratedFor])

  const criarPulso = useCallback(
    async ({
      content,
      circle_visibility = 'amigos',
      is_importante = false,
      is_urgente = false,
    }) => {
      const payload = {
        user_id: userId ?? 'anon',
        content,
        is_importante: Boolean(is_importante),
        is_urgente: Boolean(is_urgente),
        circle_visibility,
        created_at: new Date().toISOString(),
      }

      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase.from('pulsos').insert([payload]).select().single()

        if (!error && data) {
          const nextPulso = {
            ...data,
            author: data.author ?? user?.user_metadata?.name ?? 'Você',
          }
          setPulsos((current) => [nextPulso, ...current])
          return { data: nextPulso, error: null }
        }

        if (error) {
          return { data: null, error }
        }
      }

      const localPulso = {
        id: crypto.randomUUID(),
        author: user?.user_metadata?.name ?? 'Você',
        ...payload,
      }

      setPulsos((current) => [localPulso, ...current])
      return { data: localPulso, error: null }
    },
    [userId, user],
  )

  const createPulso = useCallback(async (newPulso) => criarPulso(newPulso), [criarPulso])

  const value = useMemo(
    () => ({ pulsos, createPulso, criarPulso }),
    [pulsos, createPulso, criarPulso],
  )

  return <PulsosContext.Provider value={value}>{children}</PulsosContext.Provider>
}

/* eslint-disable react-refresh/only-export-components -- hook shares the provider module */
export function usePulsos() {
  const context = useContext(PulsosContext)

  if (!context) {
    throw new Error('usePulsos must be used within PulsosProvider')
  }

  return context
}
