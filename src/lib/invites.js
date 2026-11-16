import { isSupabaseConfigured, supabase } from './supabase'

const DEMO_INVITES_KEY = 'circulo_invite_sessions'
const EXPIRY_MS = 20 * 60 * 1000

export function inviteUrl(token) {
  return `${window.location.origin}/convite/${token}`
}

export function tokenFromScan(raw) {
  if (!raw || typeof raw !== 'string') return null
  const text = raw.trim()

  try {
    const url = new URL(text)
    const match = url.pathname.match(/\/convite\/([^/?#]+)/)
    if (match?.[1]) return decodeURIComponent(match[1])
  } catch {
    // not a URL — maybe a raw token
  }

  if (/^[a-z0-9-]{16,}$/i.test(text)) return text
  return null
}

function readDemoInvites() {
  try {
    const parsed = JSON.parse(localStorage.getItem(DEMO_INVITES_KEY) || '[]')
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeDemoInvites(invites) {
  localStorage.setItem(DEMO_INVITES_KEY, JSON.stringify(invites))
}

function demoLookup(token, currentUserId) {
  const invite = readDemoInvites().find((item) => item.token === token)
  if (!invite) return { status: 'invalid' }
  if (new Date(invite.expiresAt).getTime() < Date.now()) return { status: 'expired' }

  return {
    status: 'ok',
    expires_at: invite.expiresAt,
    name: invite.name || 'Alguém',
    avatar_url: invite.avatarUrl || null,
    creator_id: invite.userId,
    is_self: Boolean(currentUserId && currentUserId === invite.userId),
    already_friends: false,
  }
}

export async function createInvite({ userId, name, avatarUrl }) {
  const expiresAt = new Date(Date.now() + EXPIRY_MS).toISOString()

  if (!isSupabaseConfigured) {
    const token = crypto.randomUUID().replaceAll('-', '')
    writeDemoInvites([
      ...readDemoInvites().filter((item) => item.userId !== userId && new Date(item.expiresAt).getTime() > Date.now()),
      { token, userId, name, avatarUrl, expiresAt },
    ])
    return { token, expiresAt, error: null }
  }

  const { data, error } = await supabase
    .from('qr_sessions')
    .insert({ user_id: userId, expires_at: expiresAt })
    .select('token, expires_at')
    .single()

  if (error) return { token: null, expiresAt: null, error }
  return { token: data.token, expiresAt: data.expires_at, error: null }
}

export async function lookupInvite(token, currentUserId) {
  if (!token) return { status: 'invalid' }

  if (!isSupabaseConfigured) {
    return demoLookup(token, currentUserId)
  }

  const { data, error } = await supabase.rpc('lookup_invite', { invite_token: token })
  if (error || !data) return { status: 'invalid' }
  return data
}

export async function acceptInvite(token, currentUserId) {
  if (!isSupabaseConfigured) {
    const invite = demoLookup(token, currentUserId)
    if (invite.status !== 'ok') return { status: invite.status, error: { message: 'Convite inválido ou expirado.' } }
    if (invite.is_self) return { status: 'self', error: { message: 'Você não pode adicionar a si mesmo.' } }
    return {
      status: 'created',
      id: invite.creator_id,
      name: invite.name,
      avatar_url: invite.avatar_url,
      error: null,
    }
  }

  const { data, error } = await supabase.rpc('accept_invite', { invite_token: token })
  if (error) {
    const message = error.message || ''
    if (message.includes('self_invite')) return { status: 'self', error: { message: 'Você não pode adicionar a si mesmo.' } }
    if (message.includes('expired_invite')) return { status: 'expired', error: { message: 'Este convite expirou.' } }
    if (message.includes('invalid_invite')) return { status: 'invalid', error: { message: 'Convite inválido.' } }
    if (message.includes('not_authenticated')) return { status: 'auth', error: { message: 'Entre para aceitar o convite.' } }
    return { status: 'error', error }
  }

  return { ...data, error: null }
}

export function formatCountdown(expiresAt) {
  const remaining = Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000))
  const minutes = String(Math.floor(remaining / 60)).padStart(2, '0')
  const seconds = String(remaining % 60).padStart(2, '0')
  return { remaining, label: `${minutes}:${seconds}` }
}
