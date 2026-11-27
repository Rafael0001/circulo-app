import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { getGoogleAuthEnabled, isSupabaseConfigured } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import GoogleSignInButton from '../components/GoogleSignInButton'
import PasswordField from '../components/PasswordField'
import { nextFromSearch, rememberAuthNext } from '../lib/authRedirect'

export default function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const { signIn, signInWithGoogle } = useAuth()
  const nextPath = nextFromSearch(location.search) || '/'
  const [form, setForm] = useState({
    email: '',
    password: '',
  })
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [googleBusy, setGoogleBusy] = useState(false)
  const [googleReady, setGoogleReady] = useState(false)

  useEffect(() => {
    getGoogleAuthEnabled().then(setGoogleReady)
  }, [])

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setSubmitting(true)

    const { error: signInError } = await signIn(form)
    setSubmitting(false)

    if (signInError) {
      setError(signInError.message || 'Não foi possível entrar. Verifique e-mail e senha.')
      return
    }

    navigate(nextPath)
  }

  const handleGoogle = async () => {
    rememberAuthNext(nextPath)
    setError('')
    setGoogleBusy(true)
    const { error: googleError } = await signInWithGoogle()
    if (googleError) {
      setGoogleBusy(false)
      setError(googleError.message || 'Não foi possível entrar com o Google.')
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md items-center justify-center px-4 py-10">
      <div className="w-full rounded-[30px] border border-[#f0e0d0] bg-white/80 p-6 shadow-[0_18px_40px_rgba(153,111,70,0.08)] backdrop-blur-sm">
        <div className="mb-6 text-center">
          <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-[#a68b6d]">bem-vindo</p>
          <div className="mt-3 flex items-center justify-center gap-2.5">
            <img src="/logo-colorida.png" alt="" className="h-12 w-12 object-contain" />
            <h1 className="font-display text-[1.85rem] font-semibold leading-none tracking-[-0.03em] text-[#2e2926]">
              Círculo
            </h1>
          </div>
          <p className="mt-3 text-sm text-[#7d6d62]">
            {isSupabaseConfigured ? 'Entre com sua conta.' : 'Modo demonstração — os dados ficam neste dispositivo.'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block text-sm text-[#5a4b3f]">
            E-mail
            <input
              type="email"
              required
              autoComplete="email"
              value={form.email}
              onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
              className="mt-1 w-full rounded-2xl border border-[#eddcc7] bg-[#fffaf4] px-3 py-2.5 outline-none transition focus:border-[#d4a86d]"
              placeholder="voce@email.com"
            />
          </label>

          <PasswordField
            value={form.password}
            autoComplete="current-password"
            onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
          />

          {error && <p className="text-sm text-[#a63f35]">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-full bg-[#2a231f] px-4 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-[#3a2e29] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? 'Entrando…' : 'Entrar'}
          </button>
        </form>

        <div className="my-4 flex items-center gap-3 text-[11px] uppercase tracking-[0.18em] text-[#9a8e80]">
          <span className="h-px flex-1 bg-[#eadfce]" />
          ou
          <span className="h-px flex-1 bg-[#eadfce]" />
        </div>

        <GoogleSignInButton onClick={handleGoogle} disabled={submitting || !googleReady} busy={googleBusy} />
        {!googleReady ? (
          <p className="mt-2 text-center text-xs text-[#8d7c6b]">
            O Google ainda não está ativo neste projeto. Entre com e-mail e senha.
          </p>
        ) : null}

        <p className="mt-5 text-center text-sm text-[#72655d]">
          Novo por aqui?{' '}
          <Link
            to={nextPath.startsWith('/convite/') ? `/cadastro?next=${encodeURIComponent(nextPath)}` : '/cadastro'}
            className="font-semibold text-[#8f6545]"
          >
            criar conta
          </Link>
        </p>
      </div>
    </div>
  )
}
