import { ImagePlus, X } from 'lucide-react'
import { useRef } from 'react'
import {
  MAX_PULSO_PHOTOS,
  PULSO_PHOTO_ACCEPT,
  validatePulsoPhotoFile,
} from '../lib/pulsoPhotos'

export default function PulsoPhotoPicker({ photos = [], onChange, onError, disabled = false }) {
  const inputRef = useRef(null)
  const remaining = MAX_PULSO_PHOTOS - photos.length

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

  return (
    <div className="mt-3">
      {photos.length > 0 && (
        <div className="mb-2 grid grid-cols-2 gap-2">
          {photos.map((photo, index) => (
            <div key={photo.id || photo.url} className="relative overflow-hidden rounded-2xl">
              <img src={photo.url} alt="" className="h-28 w-full object-cover" />
              <button
                type="button"
                disabled={disabled}
                onClick={() => removeAt(index)}
                className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-black/55 text-white"
                aria-label="Remover foto"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {remaining > 0 && (
        <>
          <input
            ref={inputRef}
            type="file"
            accept={PULSO_PHOTO_ACCEPT}
            multiple
            className="hidden"
            disabled={disabled}
            onChange={(event) => {
              handleFiles(event.target.files)
              event.target.value = ''
            }}
          />
          <button
            type="button"
            disabled={disabled}
            onClick={() => inputRef.current?.click()}
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
    </div>
  )
}
