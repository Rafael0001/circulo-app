export const AVATAR_MAX_BYTES = 2 * 1024 * 1024
export const AVATAR_ACCEPT = 'image/jpeg,image/png,image/webp'
export const AVATAR_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp']

const SIGNATURES = [
  { mime: 'image/jpeg', bytes: [0xff, 0xd8, 0xff] },
  { mime: 'image/png', bytes: [0x89, 0x50, 0x4e, 0x47] },
  { mime: 'image/webp', riff: true },
]

export function extensionForMime(mime) {
  if (mime === 'image/png') return 'png'
  if (mime === 'image/webp') return 'webp'
  return 'jpg'
}

function bytesMatch(buffer, expected) {
  return expected.every((byte, index) => buffer[index] === byte)
}

export async function sniffImageMime(file) {
  const header = new Uint8Array(await file.slice(0, 12).arrayBuffer())

  if (bytesMatch(header, SIGNATURES[0].bytes)) return 'image/jpeg'
  if (bytesMatch(header, SIGNATURES[1].bytes)) return 'image/png'
  if (
    header[0] === 0x52 &&
    header[1] === 0x49 &&
    header[2] === 0x46 &&
    header[3] === 0x46 &&
    header[8] === 0x57 &&
    header[9] === 0x45 &&
    header[10] === 0x42 &&
    header[11] === 0x50
  ) {
    return 'image/webp'
  }

  return null
}

export async function validateAvatarFile(file) {
  if (!file) {
    return { error: 'Escolha uma imagem.' }
  }

  if (file.size > AVATAR_MAX_BYTES) {
    return { error: 'A imagem precisa ter no máximo 2 MB.' }
  }

  const sniffed = await sniffImageMime(file)
  if (!sniffed || !AVATAR_MIME_TYPES.includes(sniffed)) {
    return { error: 'Use uma imagem JPG, PNG ou WebP.' }
  }

  return { mime: sniffed, error: null }
}

export function initialsFromName(name) {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return 'VO'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
}
