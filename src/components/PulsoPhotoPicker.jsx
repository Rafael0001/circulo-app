import { Camera, Images, X } from 'lucide-react'
import { useRef } from 'react'
import {
  MAX_PULSO_PHOTOS,
  PULSO_PHOTO_ACCEPT,
  validatePulsoPhotoFile,
} from '../lib/pulsoPhotos'

const actionButtonClass =
  'inline-flex items-center gap-1.5 rounded-full border border-[#eddcc7] bg-[#fffaf4] px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#6d5748] disabled:cursor-not-allowed disabled:opacity-50'

export default function PulsoPhotoPicker({ photos = [], onChange, onError, disabled = false }) {
  const cameraInputRef = useRef(null)
  const galleryInputRef = useRef(null)
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
          {/* Camera: capture opens the device camera on mobile; falls back to file picker on desktop. */}
          <input
            ref={cameraInputRef}
            type="file"
            accept={PULSO_PHOTO_ACCEPT}
            capture="environment"
            className="hidden"
            disabled={disabled}
            onChange={(event) => {
              handleFiles(event.target.files)
              event.target.value = ''
            }}
          />
          {/* Gallery: no capture — photo library on mobile, file picker on desktop. */}
          <input
            ref={galleryInputRef}
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
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={disabled}
              onClick={() => cameraInputRef.current?.click()}
              className={actionButtonClass}
            >
              <Camera className="h-3.5 w-3.5" />
              Abrir câmera
            </button>
            <button
              type="button"
              disabled={disabled}
              onClick={() => galleryInputRef.current?.click()}
              className={actionButtonClass}
            >
              <Images className="h-3.5 w-3.5" />
              Galeria
            </button>
          </div>
        </>
      )}
    </div>
  )
}
