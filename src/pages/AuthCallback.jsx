import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import { consumeAuthNext } from '../lib/authRedirect'

export default function AuthCallback() {
  const { user, loading } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const oauthError = params.get('error_description') || params.get('error')
  const [exchangeError, setExchangeError] = useState('')

  useEffect(() => {
    if (oauthError || !supabase) return undefined

    const code = params.get('code')
    if (!code) return undefined

    let cancelled = false

    supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
      if (cancelled || !error) return
      if (/already|expired|invalid/i.test(error.message || '')) return
      setExchangeError(error.message || 'Não foi possível concluir o login com o Google.')
    })

    return () => {
      cancelled = true
    }
  }, [oauthError, params])

  useEffect(() => {
    if (loading || oauthError || exchangeError) return undefined

    if (user) {
      navigate(consumeAuthNext() || '/', { replace: true })
      return undefined
    }

    const code = params.get('code')
    const timeoutId = window.setTimeout(() => {
      navigate('/login', { replace: true })
    }, code ? 8000 : 2500)

    return () => window.clearTimeout(timeoutId)
  }, [loading, oauthError, exchangeError, navigate, user, params])

  if (oauthError || exchangeError) {
    return (
      <div className="mx-auto flex min-h-screen max-w-md items-center justify-center px-4 py-10">
        <div className="w-full rounded-[30px] border border-[#f0e0d0] bg-white/80 p-6 text-center">
          <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-[#a68b6d]">google</p>
          <h1 className="mt-3 text-2xl font-semibold text-[#2a231f]">Não foi possível entrar</h1>
          <p className="mt-3 text-sm text-[#a63f35]">{oauthError || exchangeError}</p>
          <Link to="/login" className="mt-5 inline-block font-semibold text-[#8f6545]">
            voltar ao login
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f8f4ee] text-sm font-medium uppercase tracking-[0.2em] text-[#7c6a5f]">
      Entrando com o Google...
    </div>
  )
}
