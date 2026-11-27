import { Pencil, Send, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { usePulsos } from '../hooks/usePulsos'
import { absoluteTimeFrom, relativeTimeFrom } from '../lib/relativeTime'

export default function PulsoComments({ pulso }) {
  const { user } = useAuth()
  const { comentarPulso, editarComentario, excluirComentario } = usePulsos()
  const comments = pulso.comments || []
  const isPulsoOwner = Boolean(user?.id && pulso.user_id === user.id)

  const [draft, setDraft] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editDraft, setEditDraft] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [confirmingId, setConfirmingId] = useState(null)

  const handleSend = async (event) => {
    event.preventDefault()
    const content = draft.trim()
    if (!content || busy) return

    setBusy(true)
    setError('')
    const { error: sendError } = await comentarPulso(pulso.id, content)
    setBusy(false)

    if (sendError) {
      setError(sendError.message || 'Não foi possível enviar o comentário.')
      return
    }

    setDraft('')
  }

  const handleSaveEdit = async (commentId) => {
    const content = editDraft.trim()
    if (!content || busy) return

    setBusy(true)
    setError('')
    const { error: saveError } = await editarComentario(commentId, content)
    setBusy(false)

    if (saveError) {
      setError(saveError.message || 'Não foi possível editar o comentário.')
      return
    }

    setEditingId(null)
  }

  const handleDelete = async (commentId) => {
    setBusy(true)
    setError('')
    const { error: deleteError } = await excluirComentario(commentId)
    setBusy(false)

    if (deleteError) {
      setError(deleteError.message || 'Não foi possível excluir o comentário.')
      setConfirmingId(null)
      return
    }

    setConfirmingId(null)
  }

  return (
    <div className="mt-3 border-t border-[#f3e8dc] pt-3">
      {comments.length > 0 && (
        <ul className="mb-2 space-y-2">
          {comments.map((comment) => {
            const isCommentAuthor = Boolean(user?.id && comment.user_id === user.id)
            const canDelete = isCommentAuthor || isPulsoOwner

            return (
              <li key={comment.id} className="rounded-2xl bg-[#fffaf4] px-3 py-2">
                <div className="flex items-start justify-between gap-2">
                  <p className="flex min-w-0 items-baseline gap-1.5 text-[12px]">
                    <span className="truncate font-semibold text-[#2f2c2a]">{comment.author}</span>
                    {comment.created_at ? (
                      <>
                        <span className="text-[#d4c6b6]">·</span>
                        <time
                          className="shrink-0 text-[#9a8e80]"
                          dateTime={comment.created_at}
                          title={absoluteTimeFrom(comment.created_at)}
                        >
                          {relativeTimeFrom(comment.created_at)}
                        </time>
                      </>
                    ) : null}
                  </p>
                  {canDelete && editingId !== comment.id && (
                    <div className="flex items-center gap-1">
                      {isCommentAuthor && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingId(comment.id)
                            setEditDraft(comment.content)
                            setConfirmingId(null)
                            setError('')
                          }}
                          className="rounded-full p-1 text-[#8a7463] hover:bg-[#f7efe6]"
                          aria-label="Editar comentário"
                        >
                          <Pencil className="h-3 w-3" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setConfirmingId(comment.id)
                          setError('')
                        }}
                        className="rounded-full p-1 text-[#8a4a38] hover:bg-[#fff1ed]"
                        aria-label="Excluir comentário"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  )}
                </div>

                {editingId === comment.id ? (
                  <div className="mt-1">
                    <textarea
                      value={editDraft}
                      onChange={(event) => setEditDraft(event.target.value.slice(0, 280))}
                      rows={2}
                      disabled={busy}
                      className="w-full resize-none rounded-xl border border-[#eddcc7] bg-white px-2.5 py-2 text-sm outline-none focus:border-[#d4a86d]"
                    />
                    <div className="mt-1.5 flex gap-2">
                      <button
                        type="button"
                        disabled={busy || !editDraft.trim()}
                        onClick={() => handleSaveEdit(comment.id)}
                        className="rounded-full bg-[#2a231f] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-white disabled:opacity-50"
                      >
                        {busy ? 'Salvando...' : 'Salvar'}
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => setEditingId(null)}
                        className="rounded-full border border-[#eddcc7] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#6d5748]"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="mt-1 text-sm leading-5 text-[#2f2c2a]">{comment.content}</p>
                )}

                {confirmingId === comment.id && (
                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => handleDelete(comment.id)}
                      className="rounded-full bg-[#7a2f28] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-white disabled:opacity-50"
                    >
                      {busy ? 'Excluindo...' : 'Excluir'}
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => setConfirmingId(null)}
                      className="rounded-full border border-[#eddcc7] bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#6d5748]"
                    >
                      Cancelar
                    </button>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}

      <form onSubmit={handleSend} className="mt-2 flex items-end gap-2">
        <textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value.slice(0, 280))}
          rows={1}
          placeholder="Escreva um comentário..."
          disabled={busy}
          className="min-h-[40px] flex-1 resize-none rounded-2xl border border-[#eddcc7] bg-[#fffaf4] px-3 py-2 text-sm outline-none focus:border-[#d4a86d]"
        />
        <button
          type="submit"
          disabled={busy || !draft.trim()}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#2a231f] text-white disabled:opacity-50"
          aria-label="Enviar comentário"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>

      {error ? <p className="mt-2 text-sm text-[#b42318]">{error}</p> : null}
    </div>
  )
}
