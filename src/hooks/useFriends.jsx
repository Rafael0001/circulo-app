import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import { useAuth } from './useAuth'
import {
  FRIENDS_STORAGE_KEY,
  mapFriendRecord,
  readFriends,
  storageKey,
  upsertStoredFriend,
  writeFriends,
} from '../lib/friendsStorage'

const CIRCLES_STORAGE_KEY = 'circulo_circles'
const MAX_CIRCLES = 5

const BASE_CIRCLES = [
  { id: 'intimos', label: 'íntimos', color: '#f0c575' },
  { id: 'amigos', label: 'amigos', color: '#7ccdc2' },
  { id: 'conhecidos', label: 'conhecidos', color: '#ad9ae9' },
]

const CIRCLE_COLORS = ['#f0c575', '#7ccdc2', '#ad9ae9', '#f0a3c2', '#8ec5e8']

const FriendsContext = createContext(null)

function readCircles(userId) {
  if (!userId) return BASE_CIRCLES

  try {
    const raw = localStorage.getItem(storageKey(CIRCLES_STORAGE_KEY, userId))
    if (!raw) return BASE_CIRCLES
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed) || parsed.length === 0) return BASE_CIRCLES
    return parsed
      .filter((circle) => circle && typeof circle.id === 'string')
      .slice(0, MAX_CIRCLES)
      .map((circle, index) => ({
        id: circle.id,
        label: circle.label || `círculo ${index + 1}`,
        color: circle.color || CIRCLE_COLORS[index % CIRCLE_COLORS.length],
      }))
  } catch {
    return BASE_CIRCLES
  }
}

async function loadRemoteFriends(userId) {
  const { data: rows, error } = await supabase
    .from('friendships')
    .select('friend_id, circle')
    .eq('user_id', userId)

  if (error || !rows?.length) return []

  const ids = rows.map((row) => row.friend_id)
  const { data: profiles } = await supabase.from('profiles').select('id, name, avatar_url').in('id', ids)
  const byId = new Map((profiles || []).map((profile) => [profile.id, profile]))

  return rows.map((row) => mapFriendRecord(byId.get(row.friend_id) || { id: row.friend_id, name: 'Amigo' }, row.circle))
}

export function FriendsProvider({ children }) {
  const { user } = useAuth()
  const userId = user?.id ?? null
  const [friends, setFriends] = useState([])
  const [circles, setCircles] = useState(BASE_CIRCLES)
  const [hydratedFor, setHydratedFor] = useState(null)

  const refreshFriends = useCallback(async () => {
    if (!userId) return []

    if (!isSupabaseConfigured) {
      const local = readFriends(userId)
      setFriends(local)
      return local
    }

    const remote = await loadRemoteFriends(userId)
    setFriends(remote)
    return remote
  }, [userId])

  useEffect(() => {
    if (!userId) {
      setFriends([])
      setCircles(BASE_CIRCLES)
      setHydratedFor(null)
      return undefined
    }

    setCircles(readCircles(userId))

    if (!isSupabaseConfigured) {
      setFriends(readFriends(userId))
      setHydratedFor(userId)
      return undefined
    }

    let cancelled = false
    loadRemoteFriends(userId).then((remote) => {
      if (!cancelled) {
        setFriends(remote)
        setHydratedFor(userId)
      }
    })

    return () => {
      cancelled = true
    }
  }, [userId])

  useEffect(() => {
    if (!userId || hydratedFor !== userId || isSupabaseConfigured) return

    writeFriends(userId, friends)
  }, [friends, userId, hydratedFor])

  useEffect(() => {
    if (!userId || hydratedFor !== userId) return

    try {
      localStorage.setItem(storageKey(CIRCLES_STORAGE_KEY, userId), JSON.stringify(circles))
    } catch {
      // ignore quota / private mode
    }
  }, [circles, userId, hydratedFor])

  useEffect(() => {
    if (!userId) return undefined

    const onStorage = (event) => {
      if (event.key === storageKey(FRIENDS_STORAGE_KEY, userId)) {
        refreshFriends()
      }
    }

    const onVisible = () => {
      if (document.visibilityState === 'visible') refreshFriends()
    }

    window.addEventListener('storage', onStorage)
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', onVisible)

    let channel = null
    if (isSupabaseConfigured && supabase) {
      channel = supabase
        .channel(`friendships-${userId}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'friendships', filter: `user_id=eq.${userId}` },
          () => {
            refreshFriends()
          },
        )
        .subscribe()
    }

    return () => {
      window.removeEventListener('storage', onStorage)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', onVisible)
      if (channel) supabase.removeChannel(channel)
    }
  }, [userId, refreshFriends])

  const outermostId = circles[circles.length - 1]?.id ?? 'conhecidos'

  const circleOptions = useMemo(
    () => circles.map((circle) => ({ value: circle.id, label: circle.label })),
    [circles],
  )

  const moveFriend = useCallback(
    (friendId, nextCircle) => {
      setFriends((current) =>
        current.map((friend) =>
          friend.id === friendId ? { ...friend, circle: nextCircle } : friend,
        ),
      )

      if (isSupabaseConfigured && supabase && userId) {
        supabase.from('friendships').update({ circle: nextCircle }).eq('user_id', userId).eq('friend_id', friendId)
      }
    },
    [userId],
  )

  const addFriend = useCallback(
    (person) => {
      const nextFriend = mapFriendRecord(
        { ...person, avatar_url: person.avatarUrl || person.avatar_url },
        person.circle ?? outermostId,
      )

      setFriends((current) => (current.some((friend) => friend.id === nextFriend.id) ? current : [nextFriend, ...current]))
      if (!isSupabaseConfigured && userId) {
        upsertStoredFriend(userId, nextFriend)
      }
      return nextFriend
    },
    [outermostId, userId],
  )

  const addCircle = useCallback((payload = {}) => {
    const nextId = `c-${crypto.randomUUID().slice(0, 8)}`
    const requestedLabel = payload.label?.trim() || ''

    setCircles((current) => {
      if (current.length >= MAX_CIRCLES || current.some((circle) => circle.id === nextId)) {
        return current
      }

      return [
        ...current,
        {
          id: nextId,
          label: requestedLabel || `círculo ${current.length + 1}`,
          color: CIRCLE_COLORS[current.length % CIRCLE_COLORS.length],
        },
      ]
    })

    return nextId
  }, [])

  const renameCircle = useCallback((circleId, nextLabel) => {
    setCircles((current) =>
      current.map((circle) => {
        if (circle.id !== circleId) return circle
        const label = nextLabel.trim()
        return { ...circle, label: label || circle.label }
      }),
    )
  }, [])

  const removeCircle = useCallback((circleId) => {
    setCircles((currentCircles) => {
      if (currentCircles.length <= 1) return currentCircles

      const nextCircles = currentCircles.filter((circle) => circle.id !== circleId)
      const fallbackId = nextCircles[nextCircles.length - 1]?.id

      setFriends((currentFriends) =>
        currentFriends.map((friend) =>
          friend.circle === circleId ? { ...friend, circle: fallbackId } : friend,
        ),
      )

      return nextCircles
    })
  }, [])

  const value = useMemo(
    () => ({
      friends,
      circles,
      maxCircles: MAX_CIRCLES,
      moveFriend,
      addFriend,
      addCircle,
      renameCircle,
      removeCircle,
      refreshFriends,
      circleOptions,
    }),
    [friends, circles, moveFriend, addFriend, addCircle, renameCircle, removeCircle, refreshFriends, circleOptions],
  )

  return <FriendsContext.Provider value={value}>{children}</FriendsContext.Provider>
}

/* eslint-disable react-refresh/only-export-components -- hook shares the provider module */
export function useFriends() {
  const context = useContext(FriendsContext)

  if (!context) {
    throw new Error('useFriends must be used within FriendsProvider')
  }

  return context
}
