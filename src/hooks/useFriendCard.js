import { useCallback, useState } from 'react'
import { isSupabaseConfigured, supabase } from '../lib/supabase'

const normalizeInterests = (value) => {
  if (Array.isArray(value)) return value.filter(Boolean).map((item) => String(item).trim()).filter(Boolean)
  if (typeof value === 'string') {
    const parsed = value
      .replace(/\[|\]/g, '')
      .split(',')
      .map((item) => item.trim().replace(/^['\"]|['\"]$/g, ''))
      .filter(Boolean)
    return parsed
  }
  return []
}

export function useFriendCard({ moveFriend, removeFriendFromCircle } = {}) {
  const [selectedFriend, setSelectedFriend] = useState(null)
  const [showSheet, setShowSheet] = useState(false)

  const getFriendProfile = useCallback(async (friendId) => {
    if (!friendId || !isSupabaseConfigured || !supabase) {
      return { note: '', interests: [] }
    }

    const [friendshipResult, profileResult] = await Promise.all([
      supabase
        .from('friendships')
        .select('note')
        .or(`friend_id.eq.${friendId},user_id.eq.${friendId},id.eq.${friendId}`)
        .limit(1)
        .maybeSingle(),
      supabase
        .from('profiles')
        .select('interests')
        .or(`id.eq.${friendId},user_id.eq.${friendId}`)
        .limit(1)
        .maybeSingle(),
    ])

    const note = friendshipResult?.data?.note ?? ''
    const interests = normalizeInterests(profileResult?.data?.interests ?? [])

    return { note, interests }
  }, [])

  const selectFriend = useCallback(
    async (friend) => {
      if (!friend) {
        setSelectedFriend(null)
        return
      }

      const profile = await getFriendProfile(friend.id)
      setSelectedFriend({
        ...friend,
        note: friend.note ?? profile.note ?? '',
        interests: Array.isArray(friend.interests) ? friend.interests : profile.interests,
      })
    },
    [getFriendProfile],
  )

  const saveFriendNote = useCallback(
    async (friendId, nextNote) => {
      if (!friendId || !isSupabaseConfigured || !supabase) {
        return false
      }

      try {
        const { error } = await supabase
          .from('friendships')
          .update({ note: nextNote ?? '' })
          .or(`friend_id.eq.${friendId},user_id.eq.${friendId},id.eq.${friendId}`)

        if (error) {
          if (error.code === '42703') {
            console.warn('A coluna note ainda não existe em friendships. Adicione a migration do banco antes de usar o campo de anotação.')
            return false
          }
          throw error
        }

        setSelectedFriend((current) =>
          current && current.id === friendId ? { ...current, note: nextNote ?? '' } : current,
        )
        return true
      } catch (error) {
        console.error('Erro ao salvar anotação do amigo:', error)
        return false
      }
    },
    [],
  )

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
    saveFriendNote,
    openSheet,
    closeAll,
    moveSelectedFriend,
    removeSelectedFriend,
  }
}
