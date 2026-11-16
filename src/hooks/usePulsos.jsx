import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import { useAuth } from './useAuth'
import { useFriends } from './useFriends'
import { readFriends, storageKey } from '../lib/friendsStorage'

const STORAGE_KEY = 'circulo_pulsos'
const CIRCLES_STORAGE_KEY = 'circulo_circles'
const BASE_CIRCLE_IDS = ['intimos', 'amigos', 'conhecidos']

const PulsosContext = createContext(null)

function pulsosKey(userId) {
  return storageKey(STORAGE_KEY, userId)
}

function normalizePulso(pulso, authorName) {
  if (!pulso || typeof pulso !== 'object') {
    return pulso
  }

  return {
    ...pulso,
    author: authorName || pulso.author || 'Amigo',
    author_id: pulso.user_id || pulso.author_id,
    is_importante: Boolean(pulso.is_importante),
    is_urgente: Boolean(pulso.is_urgente),
  }
}

function readStoredPulsos(userId) {
  if (!userId) return []

  try {
    const raw = localStorage.getItem(pulsosKey(userId))
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.map((pulso) => normalizePulso(pulso)) : []
  } catch {
    return []
  }
}

function writeStoredPulsos(userId, pulsos) {
  if (!userId) return
  try {
    localStorage.setItem(
      pulsosKey(userId),
      JSON.stringify(pulsos.filter((pulso) => pulso.user_id === userId)),
    )
  } catch {
    // ignore quota / private mode
  }
}

function readAuthorCircleIds(authorId) {
  try {
    const raw = localStorage.getItem(storageKey(CIRCLES_STORAGE_KEY, authorId))
    if (!raw) return BASE_CIRCLE_IDS
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed) || parsed.length === 0) return BASE_CIRCLE_IDS
    const ids = parsed.map((circle) => circle?.id).filter(Boolean)
    return ids.length ? ids : BASE_CIRCLE_IDS
  } catch {
    return BASE_CIRCLE_IDS
  }
}

function circleRank(circleIds, circleId) {
  const index = circleIds.indexOf(circleId)
  if (index >= 0) return index
  const fallback = BASE_CIRCLE_IDS.indexOf(circleId)
  return fallback >= 0 ? fallback : circleIds.length
}

function isPulsoVisibleTo(viewerId, pulso, placementCircle, authorCircleIds) {
  if (!pulso) return false
  if (pulso.user_id === viewerId) return true
  if (pulso.expires_at && new Date(pulso.expires_at).getTime() < Date.now()) return false
  if (!placementCircle) return false

  const viewerRank = circleRank(authorCircleIds, placementCircle)
  const visibilityRank = circleRank(authorCircleIds, pulso.circle_visibility || 'conhecidos')
  return viewerRank <= visibilityRank
}

function loadDemoPulsos(userId, friends) {
  const names = new Map(friends.map((friend) => [friend.id, friend.name]))
  const mine = readStoredPulsos(userId).map((pulso) =>
    normalizePulso({ ...pulso, user_id: pulso.user_id || userId }, pulso.author),
  )

  const fromFriends = friends.flatMap((friend) => {
    const authorCircleIds = readAuthorCircleIds(friend.id)
    const placement = readFriends(friend.id).find((item) => item.id === userId)

    return readStoredPulsos(friend.id)
      .map((pulso) => normalizePulso({ ...pulso, user_id: pulso.user_id || friend.id }, friend.name))
      .filter((pulso) => isPulsoVisibleTo(userId, pulso, placement?.circle, authorCircleIds))
  })

  return [...mine, ...fromFriends]
    .filter((pulso, index, list) => list.findIndex((item) => item.id === pulso.id) === index)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .map((pulso) => normalizePulso(pulso, pulso.user_id === userId ? pulso.author : names.get(pulso.user_id) || pulso.author))
}

async function loadRemotePulsos(userId) {
  const { data: rows, error } = await supabase
    .from('pulsos')
    .select('id, user_id, content, is_importante, is_urgente, circle_visibility, created_at, expires_at')
    .order('created_at', { ascending: false })

  if (error) throw error
  if (!rows?.length) return []

  const authorIds = [...new Set(rows.map((row) => row.user_id))]
  const [{ data: profiles }, { data: placements }] = await Promise.all([
    supabase.from('profiles').select('id, name').in('id', authorIds),
    supabase.from('friendships').select('user_id, circle').eq('friend_id', userId),
  ])

  const names = new Map((profiles || []).map((profile) => [profile.id, profile.name]))
  const placedBy = new Map((placements || []).map((row) => [row.user_id, row.circle]))

  return rows
    .map((row) => normalizePulso(row, names.get(row.user_id) || (row.user_id === userId ? 'Você' : 'Amigo')))
    .filter((pulso) =>
      isPulsoVisibleTo(userId, pulso, pulso.user_id === userId ? 'intimos' : placedBy.get(pulso.user_id), BASE_CIRCLE_IDS),
    )
}

export function PulsosProvider({ children }) {
  const { user } = useAuth()
  const { friends } = useFriends()
  const userId = user?.id ?? null
  const friendKey = friends.map((friend) => friend.id).join('|')
  const [pulsos, setPulsos] = useState([])
  const [hydratedFor, setHydratedFor] = useState(null)

  const refreshPulsos = useCallback(async () => {
    if (!userId) return []

    if (!isSupabaseConfigured) {
      const local = loadDemoPulsos(userId, friends)
      setPulsos(local)
      return local
    }

    try {
      const remote = await loadRemotePulsos(userId)
      setPulsos(remote)
      return remote
    } catch {
      return []
    }
  }, [userId, friends, friendKey])

  useEffect(() => {
    if (!userId) {
      setPulsos([])
      setHydratedFor(null)
      return undefined
    }

    if (!isSupabaseConfigured) {
      setPulsos(loadDemoPulsos(userId, friends))
      setHydratedFor(userId)
      return undefined
    }

    let cancelled = false
    loadRemotePulsos(userId)
      .then((remote) => {
        if (!cancelled) {
          setPulsos(remote)
          setHydratedFor(userId)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setPulsos([])
          setHydratedFor(userId)
        }
      })

    return () => {
      cancelled = true
    }
  }, [userId, friendKey])

  useEffect(() => {
    if (!userId || hydratedFor !== userId || isSupabaseConfigured) return
    writeStoredPulsos(userId, pulsos)
  }, [pulsos, userId, hydratedFor])

  useEffect(() => {
    if (!userId) return undefined

    const onVisible = () => {
      if (document.visibilityState === 'visible') refreshPulsos()
    }

    window.addEventListener('focus', onVisible)
    document.addEventListener('visibilitychange', onVisible)

    let channel = null
    if (isSupabaseConfigured && supabase) {
      channel = supabase
        .channel(`pulsos-${userId}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'pulsos' }, () => {
          refreshPulsos()
        })
        .subscribe()
    }

    return () => {
      window.removeEventListener('focus', onVisible)
      document.removeEventListener('visibilitychange', onVisible)
      if (channel) supabase.removeChannel(channel)
    }
  }, [userId, refreshPulsos])

  const criarPulso = useCallback(
    async ({
      content,
      circle_visibility = 'conhecidos',
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
        const { data, error } = await supabase
          .from('pulsos')
          .insert([
            {
              user_id: userId,
              content,
              is_importante: Boolean(is_importante),
              is_urgente: Boolean(is_urgente),
              circle_visibility,
            },
          ])
          .select('id, user_id, content, is_importante, is_urgente, circle_visibility, created_at, expires_at')
          .single()

        if (!error && data) {
          const nextPulso = normalizePulso(data, user?.user_metadata?.name ?? 'Você')
          setPulsos((current) => [nextPulso, ...current.filter((item) => item.id !== nextPulso.id)])
          return { data: nextPulso, error: null }
        }

        if (error) {
          return { data: null, error }
        }
      }

      const localPulso = normalizePulso(
        {
          id: crypto.randomUUID(),
          author: user?.user_metadata?.name ?? 'Você',
          ...payload,
        },
        user?.user_metadata?.name ?? 'Você',
      )

      setPulsos((current) => [localPulso, ...current])
      if (userId) {
        writeStoredPulsos(userId, [localPulso, ...readStoredPulsos(userId)])
      }
      return { data: localPulso, error: null }
    },
    [userId, user],
  )

  const createPulso = useCallback(async (newPulso) => criarPulso(newPulso), [criarPulso])

  const value = useMemo(
    () => ({ pulsos, createPulso, criarPulso, refreshPulsos }),
    [pulsos, createPulso, criarPulso, refreshPulsos],
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
