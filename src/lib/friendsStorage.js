import { initialsFromName } from './imageFile'

export const FRIENDS_STORAGE_KEY = 'circulo_friends'
const AVATAR_COLORS = ['#f6c65f', '#8ed8c8', '#b7b3ee', '#f6a89a', '#d9c7f5', '#9ac4ef']

export function storageKey(base, userId) {
  return `${base}:${userId}`
}

function colorForId(id) {
  let hash = 0
  for (const char of String(id || '')) hash = (hash + char.charCodeAt(0)) % AVATAR_COLORS.length
  return AVATAR_COLORS[hash]
}

export function mapFriendRecord(person, circle) {
  const name = person?.name || 'Amigo'
  return {
    id: person.id,
    name,
    initials: initialsFromName(name),
    avatarColor: colorForId(person.id),
    avatarUrl: person.avatar_url || person.avatarUrl || null,
    circle: circle || person.circle || 'conhecidos',
  }
}

export function readFriends(userId) {
  if (!userId) return []

  try {
    const raw = localStorage.getItem(storageKey(FRIENDS_STORAGE_KEY, userId))
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed)
      ? parsed
          .filter((friend) => friend && friend.id)
          .map((friend) => ({ ...mapFriendRecord(friend), circle: friend.circle || 'conhecidos' }))
      : []
  } catch {
    return []
  }
}

export function writeFriends(userId, friends) {
  if (!userId) return
  try {
    localStorage.setItem(storageKey(FRIENDS_STORAGE_KEY, userId), JSON.stringify(friends))
  } catch {
    // ignore
  }
}

export function upsertStoredFriend(userId, person) {
  if (!userId || !person?.id || userId === person.id) return
  const current = readFriends(userId)
  if (current.some((friend) => friend.id === person.id)) return
  writeFriends(userId, [mapFriendRecord(person), ...current])
}

export function updateStoredFriendCircle(userId, friendId, circle) {
  if (!userId || !friendId || !circle) return
  writeFriends(
    userId,
    readFriends(userId).map((friend) => (friend.id === friendId ? { ...friend, circle } : friend)),
  )
}
