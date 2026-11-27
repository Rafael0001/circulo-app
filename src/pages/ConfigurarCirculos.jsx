import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronDown, ChevronUp, GripVertical, Plus, Trash2 } from 'lucide-react'
import NavBar from '../components/NavBar'
import { useFriends } from '../hooks/useFriends'
import { CIRCLE_COLORS, MAX_CIRCLES } from '../lib/circles'

export default function ConfigurarCirculos() {
  const navigate = useNavigate()
  const { circles, maxCircles, addCircle, renameCircle, recolorCircle, reorderCircles, removeCircle } = useFriends()
  const [newLabel, setNewLabel] = useState('')
  const [confirmId, setConfirmId] = useState(null)
  const [dragId, setDragId] = useState(null)
  const [colorPickerId, setColorPickerId] = useState(null)
  const atLimit = circles.length >= (maxCircles || MAX_CIRCLES)
  const pending = circles.find((circle) => circle.id === confirmId) ?? null

  useEffect(() => {
    if (!colorPickerId) return undefined
    const close = () => setColorPickerId(null)
    window.addEventListener('pointerdown', close)
    return () => window.removeEventListener('pointerdown', close)
  }, [colorPickerId])

  const moveCircle = (circleId, direction) => {
    const ids = circles.map((circle) => circle.id)
    const index = ids.indexOf(circleId)
    const nextIndex = index + direction
    if (index < 0 || nextIndex < 0 || nextIndex >= ids.length) return
    const next = [...ids]
    const [item] = next.splice(index, 1)
    next.splice(nextIndex, 0, item)
    reorderCircles(next)
  }

  const handleDropOn = (targetId) => {
    if (!dragId || dragId === targetId) {
      setDragId(null)
      return
    }
    const ids = circles.map((circle) => circle.id)
    const from = ids.indexOf(dragId)
    const to = ids.indexOf(targetId)
    if (from < 0 || to < 0) {
      setDragId(null)
      return
    }
    const next = [...ids]
    const [item] = next.splice(from, 1)
    next.splice(to, 0, item)
    reorderCircles(next)
    setDragId(null)
  }

  const handleCreate = (event) => {
    event.preventDefault()
    if (atLimit) return
    addCircle({ label: newLabel })
    setNewLabel('')
  }

  const handleConfirmDelete = () => {
    if (!pending) return
    removeCircle(pending.id)
    setConfirmId(null)
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col px-4 pb-28 pt-6">
      <header className="mb-5 flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-[#90795e]">círculo</p>
          <h1 className="mt-1 text-3xl font-semibold text-[#2e2926]">Configurações</h1>
        </div>
        <button
          type="button"
          onClick={() => navigate('/')}
          className="rounded-full border border-[#eadfce] bg-white px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-[#6b543f]"
        >
          Voltar
        </button>
      </header>

      <section className="rounded-[30px] border border-[#f0e6d8] bg-white/85 p-5 shadow-[0_14px_36px_rgba(166,139,107,0.08)]">
        <h2 className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#90795e]">
          seus círculos
        </h2>
        <p className="mt-2 text-sm text-[#8d7c6b]">
          Arraste para reordenar. O primeiro é o mais interno.
        </p>
        <p className="mt-1 text-sm text-[#8d7c6b]">
          Clique na cor para alterar a cor do círculo.
        </p>

        <ul
          className="mt-4 space-y-2"
          onPointerUp={(event) => {
            if (!dragId) return
            const target = document.elementFromPoint(event.clientX, event.clientY)
            const row = target?.closest?.('[data-circle-id]')
            handleDropOn(row?.getAttribute('data-circle-id') || dragId)
          }}
        >
          {circles.map((circle, index) => (
            <li
              key={circle.id}
              data-circle-id={circle.id}
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => handleDropOn(circle.id)}
              className={`flex items-center gap-2 rounded-2xl border bg-[#fffaf4] px-2 py-2 ${
                dragId === circle.id ? 'border-[#d4a86d] opacity-80' : 'border-[#eadfce]'
              }`}
            >
              <button
                type="button"
                draggable
                onDragStart={() => setDragId(circle.id)}
                onDragEnd={() => setDragId(null)}
                onPointerDown={() => setDragId(circle.id)}
                className="flex h-9 w-9 shrink-0 cursor-grab items-center justify-center rounded-full text-[#9a8e80] active:cursor-grabbing"
                aria-label={`Arrastar ${circle.label}`}
              >
                <GripVertical className="h-4 w-4" />
              </button>

              <div className="relative shrink-0">
                <button
                  type="button"
                  onPointerDown={(event) => event.stopPropagation()}
                  onClick={(event) => {
                    event.stopPropagation()
                    setDragId(null)
                    setColorPickerId((current) => (current === circle.id ? null : circle.id))
                  }}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-[#eadfce] bg-white"
                  aria-label={`Alterar cor de ${circle.label}`}
                  title="Clique na cor para alterar a cor do círculo"
                >
                  <span className="h-4 w-4 rounded-full" style={{ background: circle.color }} />
                </button>
                {colorPickerId === circle.id ? (
                  <div
                    className="absolute left-0 top-10 z-20 flex w-max max-w-[220px] flex-wrap gap-1.5 rounded-2xl border border-[#eadfce] bg-white p-2 shadow-[0_12px_28px_rgba(80,60,40,0.14)]"
                    onPointerDown={(event) => event.stopPropagation()}
                  >
                    {CIRCLE_COLORS.map((color) => {
                      const selected = color.toLowerCase() === String(circle.color).toLowerCase()
                      return (
                        <button
                          key={color}
                          type="button"
                          onClick={() => {
                            recolorCircle(circle.id, color)
                            setColorPickerId(null)
                          }}
                          className={`h-6 w-6 rounded-full border ${
                            selected ? 'border-[#2a231f] ring-2 ring-[#d4a86d]' : 'border-[#eadfce]'
                          }`}
                          style={{ background: color }}
                          aria-label={`Usar cor ${color}`}
                        />
                      )
                    })}
                  </div>
                ) : null}
              </div>

              <input
                value={circle.label}
                onChange={(event) => renameCircle(circle.id, event.target.value)}
                className="min-w-0 flex-1 rounded-xl border border-transparent bg-transparent px-2 py-1.5 text-sm text-[#372f2a] outline-none focus:border-[#d4a86d] focus:bg-white"
                aria-label={`Nome de ${circle.label}`}
              />

              <div className="flex shrink-0 items-center gap-0.5">
                <button
                  type="button"
                  disabled={index === 0}
                  onClick={() => moveCircle(circle.id, -1)}
                  className="rounded-full p-1.5 text-[#8a7463] disabled:opacity-30"
                  aria-label="Subir círculo"
                >
                  <ChevronUp className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  disabled={index === circles.length - 1}
                  onClick={() => moveCircle(circle.id, 1)}
                  className="rounded-full p-1.5 text-[#8a7463] disabled:opacity-30"
                  aria-label="Descer círculo"
                >
                  <ChevronDown className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  disabled={circle.isDefault}
                  onClick={() => setConfirmId(circle.id)}
                  className="rounded-full p-1.5 text-[#8a4a38] disabled:opacity-30"
                  aria-label={circle.isDefault ? 'Círculo padrão não pode ser excluído' : `Excluir ${circle.label}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <form
        onSubmit={handleCreate}
        className="mt-4 rounded-[30px] border border-[#f0e6d8] bg-white/85 p-5 shadow-[0_14px_36px_rgba(166,139,107,0.08)]"
      >
        <h2 className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#90795e]">
          criar círculo
        </h2>
        <label className="mt-3 block text-sm text-[#5a4b3f]">
          Nome
          <input
            value={newLabel}
            onChange={(event) => setNewLabel(event.target.value)}
            disabled={atLimit}
            placeholder="ex.: família"
            className="mt-1 w-full rounded-2xl border border-[#eddcc7] bg-[#fffaf4] px-3 py-2.5 outline-none transition focus:border-[#d4a86d] disabled:opacity-50"
          />
        </label>
        <button
          type="submit"
          disabled={atLimit}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-[#2a231f] px-4 py-3 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Plus className="h-4 w-4" />
          {atLimit ? `Limite de ${maxCircles} círculos` : 'Criar círculo'}
        </button>
      </form>

      {pending ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1a1715]/50 px-6">
          <div className="w-full max-w-sm rounded-[24px] border border-[#f0e6d8] bg-white p-5 shadow-[0_18px_38px_rgba(50,40,32,0.18)]">
            <p className="text-sm text-[#5a4b3f]">
              Excluir o círculo <span className="font-semibold">{pending.label}</span>? As pessoas
              continuam no seu Círculo, no anel mais externo. Contas não são apagadas.
            </p>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="flex-1 rounded-full bg-[#7a2f28] px-3 py-2.5 text-xs font-semibold uppercase tracking-[0.12em] text-white"
              >
                Excluir
              </button>
              <button
                type="button"
                onClick={() => setConfirmId(null)}
                className="flex-1 rounded-full border border-[#eddcc7] px-3 py-2.5 text-xs font-semibold uppercase tracking-[0.12em] text-[#6d5748]"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <NavBar />
    </div>
  )
}
