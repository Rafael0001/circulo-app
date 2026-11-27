export const BLOCKS_STORAGE_KEY = 'circulo_blocks'

function key(userId) {
  return `${BLOCKS_STORAGE_KEY}:${userId}`
}

export function readBlocks(userId) {
  if (!userId) return []

  try {
    const parsed = JSON.parse(localStorage.getItem(key(userId)) || '[]')
    return Array.isArray(parsed) ? parsed.filter((item) => item?.id) : []
  } catch {
    return []
  }
}

export function writeBlocks(userId, blocks) {
  if (!userId) return
  try {
    localStorage.setItem(key(userId), JSON.stringify(blocks))
  } catch {
    // ignore
  }
}

export function isBlockedPair(userA, userB) {
  if (!userA || !userB) return false
  return readBlocks(userA).some((item) => item.id === userB) || readBlocks(userB).some((item) => item.id === userA)
}

export function addBlock(userId, person) {
  if (!userId || !person?.id || userId === person.id) return
  const current = readBlocks(userId)
  if (current.some((item) => item.id === person.id)) return
  writeBlocks(userId, [
    {
      id: person.id,
      name: person.name || 'Pessoa',
      avatarUrl: person.avatarUrl || person.avatar_url || null,
    },
    ...current,
  ])
}

export function removeBlock(userId, personId) {
  writeBlocks(
    userId,
    readBlocks(userId).filter((item) => item.id !== personId),
  )
}
