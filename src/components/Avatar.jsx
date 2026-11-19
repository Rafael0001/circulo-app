import { useEffect, useState } from 'react'
import { initialsFromName } from '../lib/imageFile'

export default function Avatar({
  name,
  src,
  initials,
  size = 64,
  color = '#f4d9b5',
  className = '',
  alt,
}) {
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    setFailed(false)
  }, [src])
  const label = initials || initialsFromName(name)
  const showImage = Boolean(src) && !failed

  return (
    <div
      className={['relative overflow-hidden rounded-full', className].join(' ')}
      style={{ width: size, height: size, backgroundColor: color }}
      title={name}
    >
      {showImage ? (
        <img
          src={src}
          alt={alt || name || 'Foto de perfil'}
          className="h-full w-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <span
          className="flex h-full w-full items-center justify-center font-semibold text-[#40382f]"
          style={{ fontSize: Math.max(12, size * 0.32) }}
        >
          {label}
        </span>
      )}
    </div>
  )
}
