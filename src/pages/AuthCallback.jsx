import { useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export default function AuthCallback() {
  const { user, loading } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const oauthError = params.get('error_description') || params.get('error')

  useEffect(() => {
    if (loading || oauthError) {
      return undefined
    }

    if (user) {
      navigate('/', { replace: true })
      return undefined
    }

    const timeoutId = window.setTimeout(() => {
      navigate('/login', { replace: true })
    }, 2000)

    return () => window.clearTimeout(timeoutId)
  }, [loading, oauthError, navigate, user])

  if (oauthError) {
    return (
      <div className="mx-auto flex min-h-screen max-w-md items-center justify-center px-4 py-10">
        <div className="w-full rounded-[30px] border border-[#f0e0d0] bg-white/80 p-6 text-center">
          <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-[#a68b6d]">google</p>
          <h1 className="mt-3 text-2xl font-semibold text-[#2a231f]">Não foi possível entrar</h1>
          <p className="mt-3 text-sm text-[#a63f35]">{oauthError}</p>
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
