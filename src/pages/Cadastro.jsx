import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export default function Cadastro() {
  const navigate = useNavigate()
  const { signUp } = useAuth()
  const [form, setForm] = useState({
    name: 'Ana',
    email: 'ana@circulo.app',
    password: '123456',
  })
  const [error, setError] = useState('')

  const handleSubmit = async (event) => {
    event.preventDefault()
    const { error: signUpError } = await signUp(form)

    if (signUpError) {
      setError('Não foi possível criar a conta. Tente novamente.')
      return
    }

    navigate('/')
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md items-center justify-center px-4 py-10">
      <div className="w-full rounded-[30px] border border-[#f0e0d0] bg-white/80 p-6 shadow-[0_18px_40px_rgba(153,111,70,0.08)] backdrop-blur-sm">
        <div className="mb-6 text-center">
          <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-[#a68b6d]">criar conta</p>
          <h1 className="mt-3 text-3xl font-semibold text-[#2a231f]">Comece seu círculo</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block text-sm text-[#5a4b3f]">
            Nome
            <input
              type="text"
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
              value={form.password}
              onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
              className="mt-1 w-full rounded-2xl border border-[#eddcc7] bg-[#fffaf4] px-3 py-2.5 outline-none transition focus:border-[#d4a86d]"
              placeholder="••••••••"
            />
          </label>

          {error && <p className="text-sm text-[#a63f35]">{error}</p>}

          <button
            type="submit"
            className="w-full rounded-full bg-[#8f6545] px-4 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-[#7b553d]"
          >
            Criar conta
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-[#72655d]">
          Já tem conta?{' '}
          <Link to="/login" className="font-semibold text-[#8f6545]">
            entrar
          </Link>
        </p>
      </div>
    </div>
  )
}
