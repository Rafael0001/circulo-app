import { Camera, ChevronRight, ImagePlus, Plus, X } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import {
  MAX_PULSO_PHOTOS,
  PULSO_PHOTO_ACCEPT,
  validatePulsoPhotoFile,
} from '../lib/pulsoPhotos'

export default function PulsoPhotoPicker({
  photos = [],
  onChange,
  onError,
  disabled = false,
  variant = 'default',
}) {
  const galleryRef = useRef(null)
  const cameraRef = useRef(null)
  const menuRef = useRef(null)
  const menuId = useId()
  const remaining = MAX_PULSO_PHOTOS - photos.length
  const [menuOpen, setMenuOpen] = useState(false)
  const isCamera = variant === 'camera'

  useEffect(() => {
    if (!menuOpen) return undefined

    const onPointerDown = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false)
      }
    }
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setMenuOpen(false)
    }

    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [menuOpen])

  const emit = (next) => {
    if (typeof onChange === 'function') {
      onChange(next)
    }
  }

  const handleFiles = async (fileList) => {
    const incoming = Array.from(fileList || []).slice(0, Math.max(remaining, 0))
    if (!incoming.length) return

    const fileKey = (file) => `${file.name}:${file.size}:${file.lastModified}`
    const seen = new Set(photos.filter((photo) => photo.file).map((photo) => fileKey(photo.file)))
    const next = [...photos]
    let lastError = null

    for (const file of incoming) {
      const key = fileKey(file)
      if (seen.has(key)) continue
      seen.add(key)

      const { mime, error } = await validatePulsoPhotoFile(file)
      if (error) {
        lastError = error
        continue
      }

      next.push({
        id: crypto.randomUUID(),
        url: URL.createObjectURL(file),
        file,
        mime,
        isNew: true,
        sort_order: next.length,
      })
    }

    emit(next)
    if (lastError && typeof onError === 'function') {
      onError(lastError)
    }
  }

  const removeAt = (index) => {
    const target = photos[index]
    if (target?.url?.startsWith('blob:')) {
      URL.revokeObjectURL(target.url)
    }
    emit(photos.filter((_, current) => current !== index))
  }

  const openGallery = () => {
    setMenuOpen(false)
    galleryRef.current?.click()
  }

  const openCamera = () => {
    setMenuOpen(false)
    cameraRef.current?.click()
  }

  return (
    <div className={isCamera ? 'mt-2' : 'mt-3'}>
      {photos.length > 0 && (
        <div className={`mb-2 grid gap-2 ${isCamera ? 'grid-cols-3' : 'grid-cols-2'}`}>
          {photos.map((photo, index) => (
            <div key={photo.id || photo.url} className="relative overflow-hidden rounded-2xl">
              <img
                src={photo.url}
                alt=""
                className={`w-full object-cover ${isCamera ? 'h-14' : 'h-28'}`}
              />
              <button
                type="button"
                disabled={disabled}
                onClick={() => removeAt(index)}
                className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/55 text-white"
                aria-label="Remover foto"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {remaining > 0 && (
        <>
          <input
            ref={galleryRef}
            type="file"
            accept={PULSO_PHOTO_ACCEPT}
            multiple={!isCamera}
            className="hidden"
            disabled={disabled}
            onChange={(event) => {
              handleFiles(event.target.files)
              event.target.value = ''
            }}
          />
          <input
            ref={cameraRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            disabled={disabled}
            onChange={(event) => {
              handleFiles(event.target.files)
              event.target.value = ''
            }}
          />

          {isCamera ? (
            <div ref={menuRef} className="relative">
              <button
                type="button"
                disabled={disabled}
                onClick={() => setMenuOpen((open) => !open)}
                className="flex w-full items-center gap-2.5 rounded-2xl border border-dashed border-[#d6c7b6] bg-[#fffcf8] px-2.5 py-2 text-left transition hover:border-[#e0b08a] hover:bg-[#fff8f1] disabled:opacity-50"
                aria-label="Adicionar foto ou vídeo"
                aria-expanded={menuOpen}
                aria-controls={menuId}
              >
                <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#efe8df] text-[#5c534c]">
                  <Camera className="h-4 w-4" strokeWidth={1.75} />
                  <span className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[#f15a22] text-white shadow-sm">
                    <Plus className="h-2 w-2" strokeWidth={3} />
                  </span>
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[12px] font-semibold text-[#2f2c2a]">
                    Adicionar foto ou vídeo
                  </span>
                  <span className="mt-0.5 block text-[10px] text-[#9a8e80]">Toque para selecionar</span>
                </span>
                <ChevronRight className="h-3.5 w-3.5 shrink-0 text-[#c4b5a5]" strokeWidth={2} />
              </button>

              {menuOpen ? (
                <div
                  id={menuId}
                  role="menu"
                  className="absolute left-0 right-0 top-full z-20 mt-2 overflow-hidden rounded-2xl border border-[#eddcc7] bg-white shadow-[0_12px_28px_rgba(60,40,20,0.14)]"
                >
                  <button
                    type="button"
                    role="menuitem"
                    disabled={disabled}
                    onClick={openCamera}
                    className="flex w-full items-center gap-2.5 px-3.5 py-3 text-left text-sm text-[#2f2c2a] hover:bg-[#fff4e4] disabled:opacity-50"
                  >
                    <Camera className="h-4 w-4 text-[#8a7463]" strokeWidth={1.75} />
                    Tirar foto
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    disabled={disabled}
                    onClick={openGallery}
                    className="flex w-full items-center gap-2.5 border-t border-[#f0e2d3] px-3.5 py-3 text-left text-sm text-[#2f2c2a] hover:bg-[#fff4e4] disabled:opacity-50"
                  >
                    <ImagePlus className="h-4 w-4 text-[#8a7463]" strokeWidth={1.75} />
                    Galeria
                  </button>
                </div>
              ) : null}
            </div>
          ) : (
            <>
              <button
                type="button"
                disabled={disabled}
                onClick={() => galleryRef.current?.click()}
                className="inline-flex items-center gap-1.5 rounded-full border border-[#eddcc7] bg-[#fffaf4] px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#6d5748]"
              >
                <ImagePlus className="h-3.5 w-3.5" />
                Adicionar fotos
              </button>
              <p className="mt-1.5 text-[11px] text-[#8d7c6b]">
                Até {MAX_PULSO_PHOTOS} fotos JPG, PNG ou WebP, 2 MB cada.
              </p>
            </>
          )}
        </>
      )}
    </div>
  )
}
