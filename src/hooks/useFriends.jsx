import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import { useAuth } from './useAuth'
import { addBlock, isBlockedPair, readBlocks, removeBlock } from '../lib/blocksStorage'
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
    .select('friend_id, circle, muted')
    .eq('user_id', userId)

  if (error) throw error
  if (!rows?.length) return []

  const ids = rows.map((row) => row.friend_id)
  const { data: profiles } = await supabase.from('profiles').select('id, name, avatar_url').in('id', ids)
  const byId = new Map((profiles || []).map((profile) => [profile.id, profile]))

  return rows.map((row) =>
    mapFriendRecord(
      { ...(byId.get(row.friend_id) || { id: row.friend_id, name: 'Amigo' }), muted: row.muted },
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
    if (!userId) {
      setFriends([])
      setBlockedUsers([])
      setCircles(BASE_CIRCLES)
      setHydratedFor(null)
      return undefined
    }

    setCircles(readCircles(userId))

    if (!isSupabaseConfigured) {
      setFriends(readFriends(userId))
      setBlockedUsers(readBlocks(userId))
      setHydratedFor(userId)
      return undefined
    }

    let cancelled = false
    Promise.all([loadRemoteFriends(userId), loadRemoteBlocks()])
      .then(([remote, blocks]) => {
        if (!cancelled) {
          setFriends(remote)
          setBlockedUsers(blocks)
          setHydratedFor(userId)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setFriends([])
          setBlockedUsers([])
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
      let changed = false

      setFriends((current) => {
        const target = current.find((friend) => friend.id === friendId)
        if (!target || target.circle === nextCircle) return current

        previousCircle = target.circle
        changed = true
        const next = current.map((friend) => (friend.id === friendId ? { ...friend, circle: nextCircle } : friend))

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
        .update({ circle: nextCircle })
        .eq('user_id', userId)
        .eq('friend_id', friendId)
        .select('friend_id, circle')

      if (error || !data?.length) {
        setFriends((current) =>
          current.map((friend) =>
            friend.id === friendId ? { ...friend, circle: previousCircle || 'conhecidos' } : friend,
          ),
        )
        return false
      }

      return true
    },
    [userId],
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

      setFriends((currentFriends) => {
        const nextFriends = currentFriends.map((friend) =>
          friend.circle === circleId ? { ...friend, circle: fallbackId } : friend,
        )

        if (!isSupabaseConfigured && userId) writeFriends(userId, nextFriends)

        if (isSupabaseConfigured && supabase && userId && fallbackId) {
          currentFriends
            .filter((friend) => friend.circle === circleId)
            .forEach((friend) => {
              supabase
                .from('friendships')
                .update({ circle: fallbackId })
                .eq('user_id', userId)
                .eq('friend_id', friend.id)
            })
        }

        return nextFriends
      })

      return nextCircles
    })
  }, [userId])

  const value = useMemo(
    () => ({
      friends,
      blockedUsers,
      circles,
      maxCircles: MAX_CIRCLES,
      moveFriend,
      muteFriend,
      unmuteFriend,
      removeFromCircle,
      blockPerson,
      unblockPerson,
      addFriend,
      addCircle,
      renameCircle,
      removeCircle,
      refreshFriends,
      circleOptions,
    }),
    [
      friends,
      blockedUsers,
      circles,
      moveFriend,
      muteFriend,
      unmuteFriend,
      removeFromCircle,
      blockPerson,
      unblockPerson,
      addFriend,
      addCircle,
      renameCircle,
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
