const NEXT_STORAGE_KEY = 'circulo_post_auth_next'

export function safeInvitePath(path) {
  if (typeof path !== 'string') return null
  if (!path.startsWith('/convite/')) return null
  if (path.includes('//') || path.includes('://')) return null
  return path
}

export function rememberAuthNext(path) {
  const safe = safeInvitePath(path)
  if (!safe) return
  try {
    sessionStorage.setItem(NEXT_STORAGE_KEY, safe)
  } catch {
    // ignore
  }
}

export function consumeAuthNext() {
  try {
    const stored = safeInvitePath(sessionStorage.getItem(NEXT_STORAGE_KEY))
    sessionStorage.removeItem(NEXT_STORAGE_KEY)
    return stored
  } catch {
    return null
  }
}

export function nextFromSearch(search) {
  const params = new URLSearchParams(search)
  return safeInvitePath(params.get('next'))
}
