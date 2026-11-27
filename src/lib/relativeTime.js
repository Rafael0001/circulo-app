export function relativeTimeFrom(value) {
  if (!value) return ''

  const date = new Date(value)
  const timestamp = date.getTime()
  if (Number.isNaN(timestamp)) return ''

  const diffMs = Date.now() - timestamp
  if (diffMs < 0) return 'agora'

  const minutes = Math.floor(diffMs / 60000)
  if (minutes < 1) return 'agora'
  if (minutes < 60) return `${minutes} min`

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} h`

  const days = Math.floor(hours / 24)
  if (days < 7) return `${days} d`

  const weeks = Math.floor(days / 7)
  if (weeks < 5) return `${weeks} sem`

  const months = Math.floor(days / 30)
  if (months < 12) return months === 1 ? '1 mês' : `${months} meses`

  const years = Math.floor(days / 365)
  return `${years} ano${years > 1 ? 's' : ''}`
}

export function absoluteTimeFrom(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''

  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}
