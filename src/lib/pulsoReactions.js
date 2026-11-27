export const PULSO_REACTION_EMOJIS = ['❤️', '😂', '😮', '😢', '👏', '🔥', '👍', '🎉', '🥰', '🤔']

export function isAllowedReactionEmoji(emoji) {
  return PULSO_REACTION_EMOJIS.includes(emoji)
}

export function normalizeReaction(reaction, authorName) {
  if (!reaction || typeof reaction !== 'object') return reaction
  return {
    id: reaction.id,
    pulso_id: reaction.pulso_id,
    user_id: reaction.user_id,
    emoji: reaction.emoji,
    created_at: reaction.created_at,
    author: authorName || reaction.author_name || reaction.author || 'Amigo',
  }
}

export function normalizeReactions(raw, names = new Map()) {
  const list = Array.isArray(raw) ? raw : []
  return list
    .filter((reaction) => reaction && isAllowedReactionEmoji(reaction.emoji))
    .map((reaction) => normalizeReaction(reaction, names.get(reaction.user_id) || reaction.author))
    .sort((a, b) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime())
}

export function groupReactions(reactions = [], viewerId = null) {
  const groups = new Map()

  reactions.forEach((reaction) => {
    if (!isAllowedReactionEmoji(reaction.emoji)) return
    const current = groups.get(reaction.emoji) || {
      emoji: reaction.emoji,
      count: 0,
      mine: false,
      reactors: [],
    }
    current.count += 1
    current.reactors.push(reaction)
    if (viewerId && reaction.user_id === viewerId) current.mine = true
    groups.set(reaction.emoji, current)
  })

  return [...groups.values()].sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count
    return a.emoji.localeCompare(b.emoji)
  })
}

export function myReaction(reactions = [], viewerId) {
  if (!viewerId) return null
  return reactions.find((reaction) => reaction.user_id === viewerId) || null
}
