import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import { useAuth } from './useAuth'
import { addBlock, isBlockedPair, readBlocks, removeBlock } from '../lib/blocksStorage'
import {
  BASE_CIRCLES,
  CIRCLE_COLORS,
  MAX_CIRCLES,
  isDefaultCircle,
  normalizeCircles,
} from '../lib/circles'
import {
  FRIENDS_STORAGE_KEY,
  mapFriendRecord,
  readFriends,
  removeStoredFriendPair,
  storageKey,
  updateStoredFriendCircle,
  updateStoredFriendMuted,
  upsertStoredFriend,
  writeFriends,
} from '../lib/friendsStorage'

const CIRCLES_STORAGE_KEY = 'circulo_circles'

const FriendsContext = createContext(null)

function readCircles(userId) {
  if (!userId) return BASE_CIRCLES

  try {
    const raw = localStorage.getItem(storageKey(CIRCLES_STORAGE_KEY, userId))
    if (!raw) return BASE_CIRCLES
    return normalizeCircles(JSON.parse(raw))
  } catch {
    return BASE_CIRCLES
  }
}

function toCircleRows(userId, circles) {
  return normalizeCircles(circles).map((circle, index) => ({
    user_id: userId,
    id: circle.id,
    label: circle.label,
    color: circle.color,
    sort_order: index,
    is_default: circle.isDefault,
  }))
}

async function loadRemoteCircles(userId) {
  const { data, error } = await supabase
    .from('user_circles')
    .select('id, label, color, sort_order, is_default')
    .eq('user_id', userId)
    .order('sort_order', { ascending: true })

  if (error) throw error
  if (!data?.length) return []

  return normalizeCircles(
    data.map((row) => ({
      id: row.id,
      label: row.label,
      color: row.color,
      isDefault: row.is_default,
    })),
  )
}

async function persistRemoteCircles(userId, circles) {
  const rows = toCircleRows(userId, circles)
  const ids = rows.map((row) => row.id)
  if (ids.length) {
    await supabase
      .from('user_circles')
      .delete()
      .eq('user_id', userId)
      .eq('is_default', false)
      .not('id', 'in', `(${ids.join(',')})`)
  }
  const { error } = await supabase.from('user_circles').upsert(rows, { onConflict: 'user_id,id' })
  if (error) throw error
}

async function reassignCircleRefs(userId, fromId, toId) {
  if (!userId || !fromId || !toId || fromId === toId) return

  await Promise.all([
    supabase.from('friendships').update({ circle: toId }).eq('user_id', userId).eq('circle', fromId),
    supabase.from('pulsos').update({ circle_visibility: toId }).eq('user_id', userId).eq('circle_visibility', fromId),
  ])
}

async function loadRemoteFriends(userId) {
  let { data: rows, error } = await supabase
    .from('friendships')
    .select('friend_id, circle, muted, map_order, map_angle')
    .eq('user_id', userId)

  if (error) {
    const fallback = await supabase.from('friendships').select('friend_id, circle, muted').eq('user_id', userId)
    if (fallback.error) throw fallback.error
    rows = fallback.data
    error = null
  }

  if (error) throw error
  if (!rows?.length) return []

  const ids = rows.map((row) => row.friend_id)
  const { data: profiles } = await supabase.from('profiles').select('id, name, avatar_url').in('id', ids)
  const byId = new Map((profiles || []).map((profile) => [profile.id, profile]))

  return rows.map((row) =>
    mapFriendRecord(
      {
        ...(byId.get(row.friend_id) || { id: row.friend_id, name: 'Amigo' }),
        muted: row.muted,
        map_order: row.map_order,
        map_angle: row.map_angle,
      },
      row.circle || 'conhecidos',
    ),
  )
}

async function loadRemoteBlocks() {
  const { data: rows, error } = await supabase
    .from('connection_blocks')
    .select('blocked_id, blocked_name, blocked_avatar')

  if (error) throw error
  if (!rows?.length) return []

  const ids = rows.map((row) => row.blocked_id)
  const { data: profiles } = await supabase.from('profiles').select('id, name, avatar_url').in('id', ids)
  const byId = new Map((profiles || []).map((profile) => [profile.id, profile]))

  return rows.map((row) => ({
    id: row.blocked_id,
    name: byId.get(row.blocked_id)?.name || row.blocked_name || 'Pessoa',
    avatarUrl: byId.get(row.blocked_id)?.avatar_url || row.blocked_avatar || null,
  }))
}

export function FriendsProvider({ children }) {
  const { user } = useAuth()
  const userId = user?.id ?? null
  const [friends, setFriends] = useState([])
  const [blockedUsers, setBlockedUsers] = useState([])
  const [circles, setCircles] = useState(BASE_CIRCLES)
  const [hydratedFor, setHydratedFor] = useState(null)
  const persistCirclesRef = useRef(false)
  const skipFriendsRefreshUntilRef = useRef(0)

  const refreshFriends = useCallback(async () => {
    if (!userId) return []

    if (!isSupabaseConfigured) {
      const local = readFriends(userId)
      setFriends(local)
      setBlockedUsers(readBlocks(userId))
      return local
    }

    try {
      const [remote, blocks] = await Promise.all([loadRemoteFriends(userId), loadRemoteBlocks()])
      setFriends(remote)
      setBlockedUsers(blocks)
      return remote
    } catch {
      return []
    }
  }, [userId])

  useEffect(() => {
    persistCirclesRef.current = false

    if (!userId) {
      setFriends([])
      setBlockedUsers([])
      setCircles(BASE_CIRCLES)
      setHydratedFor(null)
      return undefined
    }

    if (!isSupabaseConfigured) {
      setCircles(readCircles(userId))
      setFriends(readFriends(userId))
      setBlockedUsers(readBlocks(userId))
      setHydratedFor(userId)
      persistCirclesRef.current = true
      return undefined
    }

    let cancelled = false
    Promise.all([loadRemoteFriends(userId), loadRemoteBlocks(), loadRemoteCircles(userId)])
      .then(async ([remote, blocks, remoteCircles]) => {
        if (cancelled) return

        let nextCircles = remoteCircles
        if (!nextCircles.length) {
          nextCircles = readCircles(userId)
          try {
            await persistRemoteCircles(userId, nextCircles)
          } catch {
            // keep local copy if the first persist fails
          }
        }

        setCircles(nextCircles)
        setFriends(remote)
        setBlockedUsers(blocks)
        setHydratedFor(userId)
        persistCirclesRef.current = true
      })
      .catch(() => {
        if (!cancelled) {
          setCircles(readCircles(userId))
          setFriends([])
          setBlockedUsers([])
          setHydratedFor(userId)
          persistCirclesRef.current = true
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
    if (!userId || hydratedFor !== userId || !persistCirclesRef.current) return

    try {
      localStorage.setItem(storageKey(CIRCLES_STORAGE_KEY, userId), JSON.stringify(circles))
    } catch {
      // ignore quota / private mode
    }

    if (isSupabaseConfigured && supabase) {
      persistRemoteCircles(userId, circles).catch(() => {})
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
      if (Date.now() < skipFriendsRefreshUntilRef.current) return
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
            if (Date.now() < skipFriendsRefreshUntilRef.current) return
            refreshFriends()
          },
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'connection_blocks', filter: `blocker_id=eq.${userId}` },
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
    async (friendId, nextCircle) => {
      if (!userId || !friendId || !nextCircle) return false

      let previousCircle = null
      let previousOrder = 0
      let persistedOrder = 0
      let changed = false

      setFriends((current) => {
        const target = current.find((friend) => friend.id === friendId)
        if (!target || target.circle === nextCircle) return current

        previousCircle = target.circle
        previousOrder = target.sortOrder
        changed = true
        const maxOrder = current
          .filter((friend) => friend.circle === nextCircle)
          .reduce((memo, friend) => Math.max(memo, Number.isFinite(friend.sortOrder) ? friend.sortOrder : 0), -1)
        persistedOrder = maxOrder + 1
        const next = current.map((friend) =>
          friend.id === friendId ? { ...friend, circle: nextCircle, sortOrder: persistedOrder } : friend,
        )

        if (!isSupabaseConfigured) writeFriends(userId, next)
        return next
      })

      if (!changed) return true

      if (!isSupabaseConfigured) {
        updateStoredFriendCircle(userId, friendId, nextCircle)
        return true
      }

      const { data, error } = await supabase
        .from('friendships')
        .update({ circle: nextCircle, map_order: persistedOrder })
        .eq('user_id', userId)
        .eq('friend_id', friendId)
        .select('friend_id, circle')

      if (error || !data?.length) {
        setFriends((current) =>
          current.map((friend) =>
            friend.id === friendId
              ? { ...friend, circle: previousCircle || 'conhecidos', sortOrder: previousOrder }
              : friend,
          ),
        )
        return false
      }

      return true
    },
    [userId],
  )

  const reorderFriendsInCircle = useCallback(
    async (circleId, orderedIds, anglesById = null) => {
      if (!userId || !circleId || !Array.isArray(orderedIds) || orderedIds.length === 0) return false

      const rank = new Map(orderedIds.map((id, index) => [id, index]))
      const nextAngles = anglesById instanceof Map ? anglesById : null

      setFriends((current) => {
        const next = current.map((friend) => {
          if (friend.circle !== circleId || !rank.has(friend.id)) return friend
          const sortOrder = rank.get(friend.id)
          const mapAngle = nextAngles?.has(friend.id) ? nextAngles.get(friend.id) : friend.mapAngle
          if (friend.sortOrder === sortOrder && friend.mapAngle === mapAngle) return friend
          return { ...friend, sortOrder, mapAngle }
        })
        if (!isSupabaseConfigured) writeFriends(userId, next)
        return next
      })

      if (!isSupabaseConfigured) return true

      skipFriendsRefreshUntilRef.current = Date.now() + 2000

      const updates = await Promise.all(
        orderedIds.map((friendId, index) => {
          const payload = { map_order: index }
          if (nextAngles?.has(friendId)) payload.map_angle = nextAngles.get(friendId)
          return supabase.from('friendships').update(payload).eq('user_id', userId).eq('friend_id', friendId)
        }),
      )

      if (updates.some((result) => result.error)) {
        return false
      }

      return true
    },
    [refreshFriends, userId],
  )

  const setFriendMuted = useCallback(
    async (friendId, muted) => {
      if (!userId || !friendId) return false

      let previous = null
      setFriends((current) => {
        const target = current.find((friend) => friend.id === friendId)
        if (!target) return current
        previous = Boolean(target.muted)
        const next = current.map((friend) => (friend.id === friendId ? { ...friend, muted: Boolean(muted) } : friend))
        if (!isSupabaseConfigured) writeFriends(userId, next)
        return next
      })

      if (!isSupabaseConfigured) {
        updateStoredFriendMuted(userId, friendId, muted)
        return true
      }

      const { data, error } = await supabase
        .from('friendships')
        .update({ muted: Boolean(muted) })
        .eq('user_id', userId)
        .eq('friend_id', friendId)
        .select('friend_id, muted')

      if (error || !data?.length) {
        setFriends((current) =>
          current.map((friend) => (friend.id === friendId ? { ...friend, muted: previous } : friend)),
        )
        return false
      }

      return true
    },
    [userId],
  )

  const muteFriend = useCallback((friendId) => setFriendMuted(friendId, true), [setFriendMuted])
  const unmuteFriend = useCallback((friendId) => setFriendMuted(friendId, false), [setFriendMuted])

  const removeFromCircle = useCallback(
    async (friendId) => {
      if (!userId || !friendId) return false

      if (!isSupabaseConfigured) {
        removeStoredFriendPair(userId, friendId)
        setFriends((current) => current.filter((friend) => friend.id !== friendId))
        return true
      }

      const { error } = await supabase.rpc('remove_from_circle', { target: friendId })
      if (error) return false
      setFriends((current) => current.filter((friend) => friend.id !== friendId))
      return true
    },
    [userId],
  )

  const blockPerson = useCallback(
    async (person) => {
      const friendId = person?.id || person
      if (!userId || !friendId || userId === friendId) return false

      if (!isSupabaseConfigured) {
        addBlock(userId, typeof person === 'object' ? person : { id: friendId })
        setBlockedUsers(readBlocks(userId))
        return true
      }

      const { error } = await supabase.rpc('block_person', { target: friendId })
      if (error) return false
      await refreshFriends()
      return true
    },
    [userId, refreshFriends],
  )

  const unblockPerson = useCallback(
    async (friendId) => {
      if (!userId || !friendId) return false

      if (!isSupabaseConfigured) {
        removeBlock(userId, friendId)
        setBlockedUsers(readBlocks(userId))
        return true
      }

      const { error } = await supabase.rpc('unblock_person', { target: friendId })
      if (error) return false
      setBlockedUsers((current) => current.filter((item) => item.id !== friendId))
      return true
    },
    [userId],
  )

  const addFriend = useCallback(
    (person) => {
      if (userId && isBlockedPair(userId, person.id)) return null

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
          isDefault: false,
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

  const recolorCircle = useCallback((circleId, nextColor) => {
    const color = String(nextColor || '').trim()
    if (!circleId || !color) return

    setCircles((current) =>
      current.map((circle) => (circle.id === circleId ? { ...circle, color } : circle)),
    )
  }, [])

  const reorderCircles = useCallback((orderedIds) => {
    if (!Array.isArray(orderedIds) || orderedIds.length === 0) return

    setCircles((current) => {
      const byId = new Map(current.map((circle) => [circle.id, circle]))
      const next = orderedIds.map((id) => byId.get(id)).filter(Boolean)
      const missing = current.filter((circle) => !orderedIds.includes(circle.id))
      return normalizeCircles([...next, ...missing])
    })
  }, [])

  const removeCircle = useCallback((circleId) => {
    if (isDefaultCircle(circleId)) return false

    setCircles((currentCircles) => {
      if (currentCircles.length <= 1) return currentCircles

      const target = currentCircles.find((circle) => circle.id === circleId)
      if (!target || target.isDefault) return currentCircles

      const nextCircles = currentCircles.filter((circle) => circle.id !== circleId)
      const fallbackId = nextCircles[nextCircles.length - 1]?.id

      setFriends((currentFriends) => {
        const nextFriends = currentFriends.map((friend) =>
          friend.circle === circleId ? { ...friend, circle: fallbackId } : friend,
        )

        if (!isSupabaseConfigured && userId) writeFriends(userId, nextFriends)
        return nextFriends
      })

      if (isSupabaseConfigured && supabase && userId && fallbackId) {
        reassignCircleRefs(userId, circleId, fallbackId)
      }

      return nextCircles
    })

    return true
  }, [userId])

  const value = useMemo(
    () => ({
      friends,
      blockedUsers,
      circles,
      maxCircles: MAX_CIRCLES,
      moveFriend,
      reorderFriendsInCircle,
      muteFriend,
      unmuteFriend,
      removeFromCircle,
      blockPerson,
      unblockPerson,
      addFriend,
      addCircle,
      renameCircle,
      recolorCircle,
      reorderCircles,
      removeCircle,
      refreshFriends,
      circleOptions,
    }),
    [
      friends,
      blockedUsers,
      circles,
      moveFriend,
      reorderFriendsInCircle,
      muteFriend,
      unmuteFriend,
      removeFromCircle,
      blockPerson,
      unblockPerson,
      addFriend,
      addCircle,
      renameCircle,
      recolorCircle,
      reorderCircles,
      removeCircle,
      refreshFriends,
      circleOptions,
    ],
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
