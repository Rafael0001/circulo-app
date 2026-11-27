const STORAGE_KEY = 'circulo_onboarding_seen'

export const ONBOARDING_SLIDES = [
  {
    image: '/onboarding/1.png?v=noborder',
    title: 'Visualize suas conexões em círculos',
  },
  {
    image: '/onboarding/2.png?v=noborder',
    title: 'Categorize por nível de intimidade',
  },
  {
    image: '/onboarding/3.png?v=noborder',
    title: 'Crie pulsos. Compartilhe, adicione fotos, comente',
  },
]

export function hasSeenOnboarding() {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

export function markOnboardingSeen() {
  try {
    localStorage.setItem(STORAGE_KEY, '1')
  } catch {
    // ignore
  }
}

export function onboardingContinuePath(search) {
  const params = new URLSearchParams(typeof search === 'string' ? search : '')
  const next = params.get('next') || ''

  if (next.startsWith('/convite/') && !next.includes('//') && !next.includes('://')) {
    return next
  }

  if (next === '/login' || next === '/cadastro') return next
  return '/login'
}

export function onboardingEntryPath(pathname, search = '') {
  if (pathname === '/onboarding') return '/login'
  const next = `${pathname}${search || ''}`
  if (next.startsWith('/convite/')) return next
  if (next === '/cadastro' || next.startsWith('/cadastro?')) return next
  return '/login'
}
