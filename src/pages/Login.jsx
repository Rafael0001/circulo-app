import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { isSupabaseConfigured } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import GoogleSignInButton from '../components/GoogleSignInButton'

export default function Login() {
  const navigate = useNavigate()
  const { signIn, signInWithGoogle } = useAuth()
  const [form, setForm] = useState({
    email: '',
    password: '',
  })
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [googleBusy, setGoogleBusy] = useState(false)

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

    navigate('/')
  }

  const handleGoogle = async () => {
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
          <h1 className="mt-3 text-3xl font-semibold text-[#2a231f]">Círculo</h1>
          <p className="mt-2 text-sm text-[#7d6d62]">
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

          <label className="block text-sm text-[#5a4b3f]">
            Senha
            <input
              type="password"
              required
              minLength={6}
              autoComplete="current-password"
              value={form.password}
              onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
              className="mt-1 w-full rounded-2xl border border-[#eddcc7] bg-[#fffaf4] px-3 py-2.5 outline-none transition focus:border-[#d4a86d]"
              placeholder="••••••••"
            />
          </label>

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

        <GoogleSignInButton onClick={handleGoogle} disabled={submitting} busy={googleBusy} />

        <p className="mt-5 text-center text-sm text-[#72655d]">
          Novo por aqui?{' '}
          <Link to="/cadastro" className="font-semibold text-[#8f6545]">
            criar conta
          </Link>
        </p>
      </div>
    </div>
  )
}
