import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { isSupabaseConfigured, supabase } from '../lib/supabase'

const DEMO_STORAGE_KEY = 'circulo_demo_session'
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MIN_PASSWORD_LENGTH = 6

const AuthContext = createContext(null)

function validateAuthForm({ email, password, name, requireName = false }) {
  if (requireName && !name?.trim()) {
    return 'Informe seu nome.'
  }

  if (!email?.trim()) {
    return 'Informe o e-mail.'
  }

  if (!EMAIL_PATTERN.test(email.trim())) {
    return 'E-mail inválido.'
  }

  if (!password) {
    return 'Informe a senha.'
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    return 'A senha precisa ter pelo menos 6 caracteres.'
  }

  return null
}

function readDemoUser() {
  try {
    const raw = localStorage.getItem(DEMO_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed?.email) return null
    return parsed
  } catch {
    return null
  }
}

function persistDemoUser(user) {
  try {
    if (user) {
      localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(user))
    } else {
      localStorage.removeItem(DEMO_STORAGE_KEY)
    }
  } catch {
    // ignore quota / private mode
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => (isSupabaseConfigured ? null : readDemoUser()))
  const [loading, setLoading] = useState(() => Boolean(isSupabaseConfigured))

  useEffect(() => {
    if (!isSupabaseConfigured) {
      return undefined
    }

    let isMounted = true

    supabase.auth.getSession().then(({ data }) => {
      if (isMounted) {
        setUser(data.session?.user ?? null)
        setLoading(false)
      }
    })

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (isMounted) {
        setUser(session?.user ?? null)
        setLoading(false)
      }
    })

    return () => {
      isMounted = false
      authListener.subscription.unsubscribe()
    }
  }, [])

  const signIn = useCallback(async ({ email, password }) => {
    const validationError = validateAuthForm({ email, password })
    if (validationError) {
      return { data: null, error: { message: validationError } }
    }

    const trimmedEmail = email.trim()

    if (!isSupabaseConfigured) {
      const nextUser = {
        id: `demo-${trimmedEmail}`,
        email: trimmedEmail,
        user_metadata: { name: trimmedEmail.split('@')[0] },
      }
      persistDemoUser(nextUser)
      setUser(nextUser)
      return { data: { user: nextUser }, error: null }
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email: trimmedEmail, password })
    if (!error) setUser(data.user)
    return { data, error }
  }, [])

  const signUp = useCallback(async ({ email, password, name }) => {
    const validationError = validateAuthForm({ email, password, name, requireName: true })
    if (validationError) {
      return { data: null, error: { message: validationError } }
    }

    const trimmedEmail = email.trim()
    const trimmedName = name.trim()

    if (!isSupabaseConfigured) {
      const nextUser = {
        id: `demo-${trimmedEmail}`,
        email: trimmedEmail,
        user_metadata: { name: trimmedName },
      }
      persistDemoUser(nextUser)
      setUser(nextUser)
      return { data: { user: nextUser }, error: null }
    }

    const { data, error } = await supabase.auth.signUp({
      email: trimmedEmail,
      password,
      options: { data: { name: trimmedName } },
    })
    if (!error) setUser(data.user)
    return { data, error }
  }, [])

  const signInWithGoogle = useCallback(async () => {
    if (!isSupabaseConfigured) {
      return {
        data: null,
        error: { message: 'O login com Google precisa do Supabase configurado.' },
      }
    }

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    return { data, error }
  }, [])

  const signOut = useCallback(async () => {
    if (!isSupabaseConfigured) {
      persistDemoUser(null)
      setUser(null)
      return { error: null }
    }

    const { error } = await supabase.auth.signOut()
    if (!error) setUser(null)
    return { error }
  }, [])

  const value = useMemo(
    () => ({ user, loading, signIn, signUp, signInWithGoogle, signOut, isDemo: !isSupabaseConfigured }),
    [user, loading, signIn, signUp, signInWithGoogle, signOut],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

/* eslint-disable react-refresh/only-export-components -- hook shares the provider module */
export function useAuth() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }

  return context
}
