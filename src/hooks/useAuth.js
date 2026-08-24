import { useEffect, useState } from 'react'
import { isSupabaseConfigured, supabase } from '../lib/supabase'

const demoUser = {
  id: 'demo-user',
  email: 'ana@circulo.app',
  user_metadata: { name: 'Ana' },
}

export function useAuth() {
  const [user, setUser] = useState(() => (isSupabaseConfigured ? null : demoUser))
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

  const signIn = async ({ email, password }) => {
    if (!isSupabaseConfigured) {
      setUser({
        ...demoUser,
        email,
        user_metadata: { name: email.split('@')[0] },
      })
      return { data: { user: demoUser }, error: null }
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (!error) setUser(data.user)
    return { data, error }
  }

  const signUp = async ({ email, password, name }) => {
    if (!isSupabaseConfigured) {
      const nextUser = {
        ...demoUser,
        email,
        user_metadata: { name: name || email.split('@')[0] },
      }
      setUser(nextUser)
      return { data: { user: nextUser }, error: null }
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    })
    if (!error) setUser(data.user)
    return { data, error }
  }

  const signOut = async () => {
    if (!isSupabaseConfigured) {
      setUser(null)
      return { error: null }
    }

    const { error } = await supabase.auth.signOut()
    if (!error) setUser(null)
    return { error }
  }

  return { user, loading, signIn, signUp, signOut }
}
