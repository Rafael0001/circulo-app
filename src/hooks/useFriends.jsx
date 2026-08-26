import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

const STORAGE_KEY = 'circulo_friends'

const BASE_FRIENDS = [
  { id: 'f1', name: 'Ana', initials: 'AN', circle: 'intimos', avatarColor: '#f6c65f' },
  { id: 'f2', name: 'Rafa', initials: 'RA', circle: 'intimos', avatarColor: '#8ed8c8' },
  { id: 'f3', name: 'João', initials: 'JO', circle: 'amigos', avatarColor: '#b7b3ee' },
  { id: 'f4', name: 'Mari', initials: 'MA', circle: 'amigos', avatarColor: '#f6a89a' },
  { id: 'f5', name: 'Bia', initials: 'BI', circle: 'conhecidos', avatarColor: '#d9c7f5' },
  { id: 'f6', name: 'Lu', initials: 'LU', circle: 'conhecidos', avatarColor: '#9ac4ef' },
]

const FriendsContext = createContext(null)

function readFriends() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return BASE_FRIENDS
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : BASE_FRIENDS
  } catch {
    return BASE_FRIENDS
  }
}

export function FriendsProvider({ children }) {
  const [friends, setFriends] = useState(readFriends)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(friends))
    } catch {
      // ignore quota / private mode
    }
  }, [friends])

  const circleOptions = useMemo(
    () => [
      { value: 'intimos', label: 'íntimos' },
      { value: 'amigos', label: 'amigos' },
      { value: 'conhecidos', label: 'conhecidos' },
    ],
    [],
  )

  const moveFriend = useCallback((friendId, nextCircle) => {
    setFriends((current) =>
      current.map((friend) =>
        friend.id === friendId ? { ...friend, circle: nextCircle } : friend,
      ),
    )
  }, [])

  const addFriend = useCallback((person) => {
    const nextFriend = {
      ...person,
      id: person.id ?? crypto.randomUUID(),
      circle: person.circle ?? 'conhecidos',
    }

    setFriends((current) => [nextFriend, ...current])
    return nextFriend
  }, [])

  const value = useMemo(
    () => ({ friends, moveFriend, addFriend, circleOptions }),
    [friends, moveFriend, addFriend, circleOptions],
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
