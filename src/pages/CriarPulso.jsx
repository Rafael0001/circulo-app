import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import NavBar from '../components/NavBar'
import { usePulsos } from '../hooks/usePulsos'

const categoryOptions = [
  { value: 'necessidade', label: 'necessidade' },
  { value: 'vontade', label: 'vontade' },
  { value: 'sonho', label: 'sonho' },
  { value: 'projeto', label: 'projeto' },
]

export default function CriarPulso() {
  const navigate = useNavigate()
  const { createPulso } = usePulsos()
  const [form, setForm] = useState({
    category: 'necessidade',
    content: 'Tô precisando de um encontro leve e sem cobrança.',
    circle_visibility: 'conhecidos',
  })

  const handleSubmit = (event) => {
    event.preventDefault()
    if (!form.content.trim()) return

    createPulso({
      category: form.category,
      content: form.content.trim(),
      circle_visibility: form.circle_visibility,
    })

    navigate('/')
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col px-4 pb-28 pt-6">
      <header className="mb-5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-[#90795e]">novo pulso</p>
        <h1 className="mt-2 text-3xl font-semibold text-[#2e2926]">Criar pulso</h1>
      </header>

      <form onSubmit={handleSubmit} className="rounded-[30px] border border-[#f0e6d8] bg-white/85 p-5 shadow-[0_14px_36px_rgba(166,139,107,0.08)]">
        <label className="block text-sm text-[#5a4b3f]">
          Categoria
          <select
            value={form.category}
            onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}
            className="mt-1 w-full rounded-2xl border border-[#eddcc7] bg-[#fffaf4] px-3 py-2.5 outline-none transition focus:border-[#d4a86d]"
          >
            {categoryOptions.map((category) => (
              <option key={category.value} value={category.value}>
                {category.label}
              </option>
            ))}
          </select>
        </label>

        <label className="mt-4 block text-sm text-[#5a4b3f]">
          Visível para
          <select
            value={form.circle_visibility}
            onChange={(event) => setForm((current) => ({ ...current, circle_visibility: event.target.value }))}
            className="mt-1 w-full rounded-2xl border border-[#eddcc7] bg-[#fffaf4] px-3 py-2.5 outline-none transition focus:border-[#d4a86d]"
          >
            <option value="intimos">íntimos</option>
            <option value="amigos">amigos</option>
            <option value="conhecidos">conhecidos</option>
          </select>
        </label>

        <label className="mt-4 block text-sm text-[#5a4b3f]">
          Mensagem
          <textarea
            value={form.content}
            onChange={(event) => setForm((current) => ({ ...current, content: event.target.value }))}
            rows={5}
            className="mt-1 w-full rounded-2xl border border-[#eddcc7] bg-[#fffaf4] px-3 py-2.5 outline-none transition focus:border-[#d4a86d]"
            placeholder="Escreva o que você precisa, quer ou sonha..."
          />
        </label>

        <button
          type="submit"
          disabled={!form.content.trim()}
          className="mt-5 w-full rounded-full bg-[#2a231f] px-4 py-3 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          Publicar pulso
        </button>
      </form>

      <NavBar />
    </div>
  )
}
