import { useCallback, useState } from 'react'

export function useFriendCard({ moveFriend, removeFriendFromCircle } = {}) {
  const [selectedFriend, setSelectedFriend] = useState(null)
  const [showSheet, setShowSheet] = useState(false)

  const selectFriend = useCallback((friend) => {
    setSelectedFriend(friend)
  }, [])

  const openSheet = useCallback(() => {
    setShowSheet(true)
  }, [])

  const closeAll = useCallback(() => {
    setSelectedFriend(null)
    setShowSheet(false)
  }, [])

  const moveSelectedFriend = useCallback(
    (friendId, newCircle) => {
      if (typeof moveFriend === 'function') {
        moveFriend(friendId, newCircle)
      }

      setSelectedFriend((current) =>
        current && current.id === friendId ? { ...current, circle: newCircle } : current,
      )
    },
    [moveFriend],
  )

  const removeSelectedFriend = useCallback(
    (friendId) => {
      if (typeof removeFriendFromCircle === 'function') {
        removeFriendFromCircle(friendId)
      }

      setSelectedFriend((current) =>
        current && current.id === friendId ? { ...current, circle: 'conhecidos' } : current,
      )
    },
    [removeFriendFromCircle],
  )

  return {
    selectedFriend,
    showSheet,
    selectFriend,
    openSheet,
    closeAll,
    moveSelectedFriend,
    removeSelectedFriend,
  }
}
