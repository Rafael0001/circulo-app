import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useAuth } from './useAuth'

const FRIENDS_STORAGE_KEY = 'circulo_friends'
const CIRCLES_STORAGE_KEY = 'circulo_circles'
const MAX_CIRCLES = 5

const BASE_CIRCLES = [
  { id: 'intimos', label: 'íntimos', color: '#f0c575' },
  { id: 'amigos', label: 'amigos', color: '#7ccdc2' },
  { id: 'conhecidos', label: 'conhecidos', color: '#ad9ae9' },
]

const CIRCLE_COLORS = ['#f0c575', '#7ccdc2', '#ad9ae9', '#f0a3c2', '#8ec5e8']

const FriendsContext = createContext(null)

function storageKey(base, userId) {
  return `${base}:${userId}`
}

function readFriends(userId) {
  if (!userId) return []

  try {
    const raw = localStorage.getItem(storageKey(FRIENDS_STORAGE_KEY, userId))
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

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

export function FriendsProvider({ children }) {
  const { user } = useAuth()
  const userId = user?.id ?? null
  const [friends, setFriends] = useState([])
  const [circles, setCircles] = useState(BASE_CIRCLES)
  const [hydratedFor, setHydratedFor] = useState(null)

  useEffect(() => {
    if (!userId) {
      setFriends([])
      setCircles(BASE_CIRCLES)
      setHydratedFor(null)
      return
    }

    setFriends(readFriends(userId))
    setCircles(readCircles(userId))
    setHydratedFor(userId)
  }, [userId])

  useEffect(() => {
    if (!userId || hydratedFor !== userId) return

    try {
      localStorage.setItem(storageKey(FRIENDS_STORAGE_KEY, userId), JSON.stringify(friends))
    } catch {
      // ignore quota / private mode
    }
  }, [friends, userId, hydratedFor])

  useEffect(() => {
    if (!userId || hydratedFor !== userId) return

    try {
      localStorage.setItem(storageKey(CIRCLES_STORAGE_KEY, userId), JSON.stringify(circles))
    } catch {
      // ignore quota / private mode
    }
  }, [circles, userId, hydratedFor])

  const outermostId = circles[circles.length - 1]?.id ?? 'conhecidos'

  const circleOptions = useMemo(
    () => circles.map((circle) => ({ value: circle.id, label: circle.label })),
    [circles],
  )

  const moveFriend = useCallback((friendId, nextCircle) => {
    setFriends((current) =>
      current.map((friend) =>
        friend.id === friendId ? { ...friend, circle: nextCircle } : friend,
      ),
    )
  }, [])

  const addFriend = useCallback(
    (person) => {
      const nextFriend = {
        ...person,
        id: person.id ?? crypto.randomUUID(),
        circle: person.circle ?? outermostId,
      }

      setFriends((current) => [nextFriend, ...current])
      return nextFriend
    },
    [outermostId],
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
      circleOptions,
    }),
    [friends, circles, moveFriend, addFriend, addCircle, renameCircle, removeCircle, circleOptions],
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
