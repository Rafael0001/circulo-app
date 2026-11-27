import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { BrandMark, Button, Field, Surface } from '../components/ui'

export default function Login() {
  const navigate = useNavigate()
  const { signIn } = useAuth()
  const [form, setForm] = useState({
    email: 'ana@circulo.app',
    password: '123456',
  })
  const [error, setError] = useState('')

  const handleSubmit = async (event) => {
    event.preventDefault()
    const { error: signInError } = await signIn(form)

    if (signInError) {
      setError('Não foi possível entrar. Verifique e-mail e senha.')
      return
    }

    navigate('/')
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md items-center justify-center px-4 py-10">
      <Surface className="w-full p-6">
        <div className="mb-6 flex flex-col items-center text-center">
          <BrandMark variant="rings-light" size="lg" breathe className="mb-4" />
          <p className="text-micro font-semibold uppercase tracking-[0.28em] text-ink-muted">bem-vindo</p>
          <h1 className="mt-2 font-display text-display text-ink">Círculo</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Field
            label="E-mail"
            type="email"
            value={form.email}
            onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
            placeholder="voce@email.com"
          />

          <Field
            label="Senha"
            type="password"
            value={form.password}
            onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
            placeholder="••••••••"
          />

          {error && <p className="text-sm text-danger">{error}</p>}

          <Button type="submit" variant="secondary">
            Entrar
          </Button>
        </form>

        <p className="mt-5 text-center text-sm text-ink-muted">
          Novo por aqui?{' '}
          <Link to="/cadastro" className="font-semibold text-core">
            criar conta
          </Link>
        </p>
      </Surface>
    </div>
  )
}
