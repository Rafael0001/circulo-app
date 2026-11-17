import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { getGoogleAuthEnabled, isSupabaseConfigured } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import GoogleSignInButton from '../components/GoogleSignInButton'
import PasswordField from '../components/PasswordField'
import { nextFromSearch, rememberAuthNext } from '../lib/authRedirect'

export default function Cadastro() {
  const navigate = useNavigate()
  const location = useLocation()
  const { signUp, signInWithGoogle } = useAuth()
  const nextPath = nextFromSearch(location.search) || '/'
  const [form, setForm] = useState({
    name: '',
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

    const { error: signUpError } = await signUp(form)
    setSubmitting(false)

    if (signUpError) {
      setError(signUpError.message || 'Não foi possível criar a conta. Tente novamente.')
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
          <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-[#a68b6d]">criar conta</p>
          <h1 className="mt-3 text-3xl font-semibold text-[#2a231f]">Comece seu círculo</h1>
          <p className="mt-2 text-sm text-[#7d6d62]">
            {isSupabaseConfigured ? 'Crie sua conta para continuar.' : 'Modo demonstração — os dados ficam neste dispositivo.'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block text-sm text-[#5a4b3f]">
            Nome
            <input
              type="text"
              required
              autoComplete="name"
              value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              className="mt-1 w-full rounded-2xl border border-[#eddcc7] bg-[#fffaf4] px-3 py-2.5 outline-none transition focus:border-[#d4a86d]"
              placeholder="Seu nome"
            />
          </label>

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
            autoComplete="new-password"
            placeholder="pelo menos 6 caracteres"
            onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
          />

          {error && <p className="text-sm text-[#a63f35]">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-full bg-[#8f6545] px-4 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-[#7b553d] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? 'Criando…' : 'Criar conta'}
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
            O Google ainda não está ativo neste projeto. Crie a conta com e-mail e senha.
          </p>
        ) : null}

        <p className="mt-5 text-center text-sm text-[#72655d]">
          Já tem conta?{' '}
          <Link
            to={nextPath.startsWith('/convite/') ? `/login?next=${encodeURIComponent(nextPath)}` : '/login'}
            className="font-semibold text-[#8f6545]"
          >
            entrar
          </Link>
        </p>
      </div>
    </div>
  )
}
