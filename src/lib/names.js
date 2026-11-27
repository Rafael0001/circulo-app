/** Mostra só o primeiro e o segundo nome no mapa. */
export function shortDisplayName(name) {
  const parts = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)

  if (parts.length === 0) return 'Amigo'
  if (parts.length === 1) return parts[0]
  return `${parts[0]} ${parts[1]}`
}
