import { useMemo, useState } from 'react'

const BASE_FRIENDS = [
  { id: 'f1', name: 'Ana', initials: 'AN', circle: 'intimos', avatarColor: '#f6c65f' },
  { id: 'f2', name: 'Rafa', initials: 'RA', circle: 'intimos', avatarColor: '#8ed8c8' },
  { id: 'f3', name: 'João', initials: 'JO', circle: 'amigos', avatarColor: '#b7b3ee' },
  { id: 'f4', name: 'Mari', initials: 'MA', circle: 'amigos', avatarColor: '#f6a89a' },
  { id: 'f5', name: 'Bia', initials: 'BI', circle: 'conhecidos', avatarColor: '#d9c7f5' },
  { id: 'f6', name: 'Lu', initials: 'LU', circle: 'conhecidos', avatarColor: '#9ac4ef' },
]

export function useFriends() {
  const [friends, setFriends] = useState(BASE_FRIENDS)

  const circleOptions = useMemo(
    () => [
      { value: 'intimos', label: 'íntimos' },
      { value: 'amigos', label: 'amigos' },
      { value: 'conhecidos', label: 'conhecidos' },
    ],
    [],
  )

  const moveFriend = (friendId, nextCircle) => {
    setFriends((current) =>
      current.map((friend) =>
        friend.id === friendId ? { ...friend, circle: nextCircle } : friend,
      ),
    )
  }

  const addFriend = (person) => {
    setFriends((current) => [
      { ...person, id: person.id ?? crypto.randomUUID(), circle: 'conhecidos' },
      ...current,
    ])
  }

  return { friends, moveFriend, addFriend, circleOptions }
}
