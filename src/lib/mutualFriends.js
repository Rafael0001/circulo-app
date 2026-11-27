import { isBlockedPair } from './blocksStorage'
import { mapFriendRecord, readFriends } from './friendsStorage'
import { isSupabaseConfigured, supabase } from './supabase'

function asFriend(person) {
  return mapFriendRecord({
    id: person.id,
    name: person.name,
    avatar_url: person.avatar_url || person.avatarUrl,
  })
}

export async function fetchMutualFriends(currentUserId, personId) {
  if (!currentUserId || !personId || currentUserId === personId) return []

  if (!isSupabaseConfigured) {
    const mine = readFriends(currentUserId)
    const theirs = new Set(readFriends(personId).map((friend) => friend.id))

    return mine
      .filter(
        (friend) =>
          friend.id !== personId &&
          theirs.has(friend.id) &&
          !isBlockedPair(currentUserId, friend.id) &&
          !isBlockedPair(personId, friend.id),
      )
      .map(asFriend)
  }

  const { data, error } = await supabase.rpc('list_mutual_friends', { target: personId })
  if (error || !Array.isArray(data)) return []
  return data.map(asFriend)
}
