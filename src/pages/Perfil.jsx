import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Camera } from 'lucide-react'
import NavBar from '../components/NavBar'
import Avatar from '../components/Avatar'
import { useAuth } from '../hooks/useAuth'
import { AVATAR_ACCEPT, validateAvatarFile } from '../lib/imageFile'
import { loadAvatarUrl, removeAvatar, uploadAvatar } from '../lib/avatarStorage'

const STORAGE_KEY = 'circulo_profile'

const interestOptions = ['café', 'viagens', 'música', 'livros', 'natureza', 'fotografia', 'arte', 'saúde']

function emptyProfile(user) {
  const name = user?.user_metadata?.name || user?.email?.split('@')[0] || 'Você'
  return {
    name,
    bio: '',
    interests: [],
  }
}

function readProfile(user) {
  const fallback = emptyProfile(user)
  if (!user?.id) return fallback

  try {
    const raw = localStorage.getItem(`${STORAGE_KEY}:${user.id}`)
    if (!raw) return fallback
    const parsed = JSON.parse(raw)
    return {
      name: parsed.name || fallback.name,
      bio: parsed.bio ?? '',
      interests: Array.isArray(parsed.interests) ? parsed.interests : [],
    }
  } catch {
    return fallback
  }
}

export default function Perfil() {
  const navigate = useNavigate()
  const { user, signOut, isAdmin } = useAuth()
  const fileInputRef = useRef(null)
  const [profile, setProfile] = useState(() => readProfile(user))
  const [draft, setDraft] = useState(profile)
  const [saved, setSaved] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [previewFile, setPreviewFile] = useState(null)
  const [previewMime, setPreviewMime] = useState(null)
  const [photoBusy, setPhotoBusy] = useState(false)
  const [photoMessage, setPhotoMessage] = useState('')
  const [photoError, setPhotoError] = useState('')

  useEffect(() => {
    let cancelled = false
    let objectUrl = null

    const load = async () => {
      if (!user?.id) {
        setAvatarUrl(null)
        return
      }

      const { url, error } = await loadAvatarUrl(user.id)
      if (cancelled) {
        if (url?.startsWith('blob:')) URL.revokeObjectURL(url)
        return
      }

      if (error) {
        setPhotoError('Não foi possível carregar a foto de perfil.')
        return
      }

      objectUrl = url?.startsWith('blob:') ? url : null
      setAvatarUrl(url)
    }

    load()

    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [user?.id])

  const toggleInterest = (interest) => {
    const updated = draft.interests.includes(interest)
      ? draft.interests.filter((item) => item !== interest)
      : [...draft.interests, interest]

    setDraft((current) => ({ ...current, interests: updated }))
  }

  const handleSave = () => {
    setProfile(draft)
    try {
      if (user?.id) {
        localStorage.setItem(`${STORAGE_KEY}:${user.id}`, JSON.stringify(draft))
      }
    } catch {
      // ignore
    }
    setSaved(true)
    window.setTimeout(() => setSaved(false), 1400)
  }

  const handleSignOut = async () => {
    setSigningOut(true)
    await signOut()
    navigate('/login')
  }

  const clearPreview = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(null)
    setPreviewFile(null)
    setPreviewMime(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handlePickPhoto = () => {
    if (photoBusy) return
    fileInputRef.current?.click()
  }

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0]
    setPhotoMessage('')
    setPhotoError('')

    const { mime, error } = await validateAvatarFile(file)
    if (error) {
      setPhotoError(error)
      clearPreview()
      return
    }

    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewFile(file)
    setPreviewMime(mime)
    setPreviewUrl(URL.createObjectURL(file))
  }

  const handleConfirmPhoto = async () => {
    if (!previewFile || !user?.id) return

    setPhotoBusy(true)
    setPhotoError('')
    setPhotoMessage('')

    const { url, error } = await uploadAvatar({
      userId: user.id,
      file: previewFile,
      mime: previewMime,
      previousUrl: avatarUrl,
    })

    setPhotoBusy(false)

    if (error) {
      setPhotoError(error.message || 'Não foi possível enviar a foto. Tente novamente.')
      return
    }

    if (avatarUrl?.startsWith('blob:')) URL.revokeObjectURL(avatarUrl)
    setAvatarUrl(url)
    clearPreview()
    setPhotoMessage('Foto atualizada.')
    window.setTimeout(() => setPhotoMessage(''), 1800)
  }

  const handleRemovePhoto = async () => {
    if (!user?.id || photoBusy) return

    setPhotoBusy(true)
    setPhotoError('')
    setPhotoMessage('')

    const { error } = await removeAvatar({ userId: user.id, previousUrl: avatarUrl })
    setPhotoBusy(false)

    if (error) {
      setPhotoError(error.message || 'Não foi possível remover a foto.')
      return
    }

    if (avatarUrl?.startsWith('blob:')) URL.revokeObjectURL(avatarUrl)
    setAvatarUrl(null)
    clearPreview()
    setPhotoMessage('Foto removida.')
    window.setTimeout(() => setPhotoMessage(''), 1800)
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col px-4 pb-28 pt-6">
      <header className="mb-5 flex items-center justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-[#90795e]">perfil</p>
          <h1 className="mt-2 text-3xl font-semibold text-[#2e2926]">Você</h1>
        </div>
        <button
          type="button"
          onClick={handleSave}
          className="rounded-full bg-[#f3e6d3] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#7f5b3d]"
        >
          {saved ? 'salvo' : 'salvar'}
        </button>
      </header>

      <div className="rounded-[30px] border border-[#f0e6d8] bg-white/85 p-5 shadow-[0_14px_36px_rgba(166,139,107,0.08)]">
        <div className="flex items-center gap-4">
          <div className="relative shrink-0">
            <Avatar name={profile.name} src={previewUrl || avatarUrl} size={64} />
            <button
              type="button"
              onClick={handlePickPhoto}
              disabled={photoBusy}
              className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full border border-[#eadfce] bg-white text-[#7f5b3d] shadow-sm disabled:opacity-50"
              aria-label="Alterar foto de perfil"
            >
              <Camera size={14} />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept={AVATAR_ACCEPT}
              className="hidden"
              onChange={handleFileChange}
            />
          </div>
          <div>
            <p className="text-lg font-semibold text-[#2a231f]">{profile.name}</p>
            <p className="text-sm text-[#7d6d62]">@{profile.name.toLowerCase().replace(/\s+/g, '')}</p>
            {isAdmin ? (
              <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8b5f38]">admin</p>
            ) : null}
          </div>
        </div>

        {previewUrl ? (
          <div className="mt-4 rounded-2xl border border-[#eadfce] bg-[#fffaf4] p-3">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#9a8e80]">prévia</p>
            <img src={previewUrl} alt="Prévia da foto de perfil" className="mx-auto h-32 w-32 rounded-full object-cover" />
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={clearPreview}
                disabled={photoBusy}
                className="flex-1 rounded-full border border-[#eadfce] bg-white px-3 py-2 text-sm text-[#6b543f] disabled:opacity-60"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmPhoto}
                disabled={photoBusy}
                className="flex-1 rounded-full bg-[#8f6545] px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
              >
                {photoBusy ? 'Enviando…' : 'Confirmar'}
              </button>
            </div>
          </div>
        ) : null}

        {avatarUrl && !previewUrl ? (
          <button
            type="button"
            onClick={handleRemovePhoto}
            disabled={photoBusy}
            className="mt-3 text-sm text-[#8a4a38] disabled:opacity-60"
          >
            {photoBusy ? 'Removendo…' : 'Remover foto'}
          </button>
        ) : null}

        {photoError ? <p className="mt-3 text-sm text-[#a63f35]">{photoError}</p> : null}
        {photoMessage ? <p className="mt-3 text-sm text-[#5f7a4a]">{photoMessage}</p> : null}

        <div className="mt-5 space-y-4">
          <label className="block text-sm text-[#5a4b3f]">
            Nome
            <input
              value={draft.name}
              onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
              className="mt-1 w-full rounded-2xl border border-[#eddcc7] bg-[#fffaf4] px-3 py-2.5 outline-none focus:border-[#d4a86d]"
            />
          </label>

          <label className="block text-sm text-[#5a4b3f]">
            Bio
            <textarea
              value={draft.bio}
              onChange={(event) => setDraft((current) => ({ ...current, bio: event.target.value }))}
              rows={3}
              className="mt-1 w-full rounded-2xl border border-[#eddcc7] bg-[#fffaf4] px-3 py-2.5 outline-none focus:border-[#d4a86d]"
            />
          </label>
        </div>

        <div className="mt-6">
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#9a8e80]">interesses</p>
          <div className="flex flex-wrap gap-2">
            {interestOptions.map((interest) => (
              <button
                key={interest}
                type="button"
                onClick={() => toggleInterest(interest)}
                className={`rounded-full border px-2.5 py-1.5 text-xs transition ${
                  draft.interests.includes(interest)
                    ? 'border-[#d9b57a] bg-[#f3e7d1] text-[#6a4a2e]'
                    : 'border-[#eadfce] bg-[#fffaf4] text-[#5d5149]'
                }`}
              >
                {interest}
              </button>
            ))}
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={handleSignOut}
        disabled={signingOut}
        className="mt-4 w-full rounded-full border border-[#eadfce] bg-white px-4 py-3 text-sm font-medium text-[#6b543f] disabled:opacity-60"
      >
        {signingOut ? 'Saindo…' : 'Sair'}
      </button>

      <NavBar />
    </div>
  )
}
