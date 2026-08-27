import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

const FRIENDS_STORAGE_KEY = 'circulo_friends'
const CIRCLES_STORAGE_KEY = 'circulo_circles'
const MAX_CIRCLES = 5

const BASE_FRIENDS = [
  { id: 'f1', name: 'Ana', initials: 'AN', circle: 'intimos', avatarColor: '#f6c65f' },
  { id: 'f2', name: 'Rafa', initials: 'RA', circle: 'intimos', avatarColor: '#8ed8c8' },
  { id: 'f3', name: 'João', initials: 'JO', circle: 'amigos', avatarColor: '#b7b3ee' },
  { id: 'f4', name: 'Mari', initials: 'MA', circle: 'amigos', avatarColor: '#f6a89a' },
  { id: 'f5', name: 'Bia', initials: 'BI', circle: 'conhecidos', avatarColor: '#d9c7f5' },
  { id: 'f6', name: 'Lu', initials: 'LU', circle: 'conhecidos', avatarColor: '#9ac4ef' },
]

const BASE_CIRCLES = [
  { id: 'intimos', label: 'íntimos', color: '#f0c575' },
  { id: 'amigos', label: 'amigos', color: '#7ccdc2' },
  { id: 'conhecidos', label: 'conhecidos', color: '#ad9ae9' },
]

const CIRCLE_COLORS = ['#f0c575', '#7ccdc2', '#ad9ae9', '#f0a3c2', '#8ec5e8']

const FriendsContext = createContext(null)

function readFriends() {
  try {
    const raw = localStorage.getItem(FRIENDS_STORAGE_KEY)
    if (!raw) return BASE_FRIENDS
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : BASE_FRIENDS
  } catch {
    return BASE_FRIENDS
  }
}

function readCircles() {
  try {
    const raw = localStorage.getItem(CIRCLES_STORAGE_KEY)
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
  const [friends, setFriends] = useState(readFriends)
  const [circles, setCircles] = useState(readCircles)

  useEffect(() => {
    try {
      localStorage.setItem(FRIENDS_STORAGE_KEY, JSON.stringify(friends))
    } catch {
      // ignore quota / private mode
    }
  }, [friends])

  useEffect(() => {
    try {
      localStorage.setItem(CIRCLES_STORAGE_KEY, JSON.stringify(circles))
    } catch {
      // ignore quota / private mode
    }
  }, [circles])

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

  const removeFriendFromCircle = useCallback((friendId) => {
    setFriends((current) =>
      current.map((friend) =>
        friend.id === friendId ? { ...friend, circle: 'conhecidos' } : friend,
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
    if (!circleId || BASE_CIRCLES.some((circle) => circle.id === circleId)) {
      return
    }

    setCircles((current) => {
      if (!current.some((circle) => circle.id === circleId)) {
        return current
      }

      const remaining = current.filter((circle) => circle.id !== circleId)
      const removedIndex = current.findIndex((circle) => circle.id === circleId)
      const targetIndex = Math.min(removedIndex, remaining.length - 1)
      const nextCircle = remaining[targetIndex]?.id ?? 'conhecidos'

      setFriends((friendList) =>
        friendList.map((friend) =>
          friend.circle === circleId ? { ...friend, circle: nextCircle } : friend,
        ),
      )

      return remaining
    })
  }, [])

  const value = useMemo(
    () => ({
      friends,
      circles,
      maxCircles: MAX_CIRCLES,
      moveFriend,
      removeFriendFromCircle,
      addFriend,
      addCircle,
      renameCircle,
      removeCircle,
      circleOptions,
    }),
    [friends, circles, moveFriend, removeFriendFromCircle, addFriend, addCircle, renameCircle, removeCircle, circleOptions],
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
