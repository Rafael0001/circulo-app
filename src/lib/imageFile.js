export const AVATAR_MAX_BYTES = 2 * 1024 * 1024
export const AVATAR_ACCEPT = 'image/jpeg,image/png,image/webp'
export const AVATAR_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp']

/** Alvo ideal após compressão (com folga abaixo de 2 MB). */
export const IMAGE_COMPRESS_TARGET_MAX_BYTES = 750 * 1024
/** Teto duro interno — nunca enviar perto do limite de 2 MB. */
export const IMAGE_COMPRESS_HARD_MAX_BYTES = 1.5 * 1024 * 1024
export const IMAGE_COMPRESS_MAX_DIMENSION = 1920

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

function loadImageElement(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const image = new Image()
    image.onload = () => {
      URL.revokeObjectURL(url)
      resolve(image)
    }
    image.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Não foi possível ler a imagem.'))
    }
    image.src = url
  })
}

async function canvasToBlob(canvas, mime, quality) {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), mime, quality)
  })
}

let webpSupportedPromise = null

function canEncodeWebp() {
  if (webpSupportedPromise) return webpSupportedPromise
  webpSupportedPromise = (async () => {
    try {
      const canvas = document.createElement('canvas')
      canvas.width = 2
      canvas.height = 2
      const blob = await canvasToBlob(canvas, 'image/webp', 0.8)
      return Boolean(blob && blob.type === 'image/webp')
    } catch {
      return false
    }
  })()
  return webpSupportedPromise
}

/**
 * Redimensiona e comprime a imagem para ficar no alvo (ideal ~200–800 KB),
 * com teto interno abaixo de 2 MB. Não rejeita pelo tamanho original.
 */
export async function compressImageForUpload(file, options = {}) {
  const {
    maxDimension = IMAGE_COMPRESS_MAX_DIMENSION,
    targetMaxBytes = IMAGE_COMPRESS_TARGET_MAX_BYTES,
    hardMaxBytes = IMAGE_COMPRESS_HARD_MAX_BYTES,
    startQuality = 0.86,
    minQuality = 0.58,
  } = options

  if (!file) {
    return { file: null, mime: null, error: 'Escolha uma imagem.' }
  }

  const sniffed = await sniffImageMime(file)
  if (!sniffed || !AVATAR_MIME_TYPES.includes(sniffed)) {
    return { file: null, mime: null, error: 'Use uma imagem JPG, PNG ou WebP.' }
  }

  // Já está leve e pequena o suficiente: mantém o original.
  if (file.size <= targetMaxBytes) {
    try {
      const image = await loadImageElement(file)
      const longest = Math.max(image.naturalWidth || image.width, image.naturalHeight || image.height)
      if (longest <= maxDimension) {
        return { file, mime: sniffed, error: null }
      }
    } catch {
      return { file, mime: sniffed, error: null }
    }
  }

  let bitmap = null
  let sourceWidth = 0
  let sourceHeight = 0

  try {
    if (typeof createImageBitmap === 'function') {
      bitmap = await createImageBitmap(file)
      sourceWidth = bitmap.width
      sourceHeight = bitmap.height
    }
  } catch {
    bitmap = null
  }

  let imageEl = null
  if (!bitmap) {
    try {
      imageEl = await loadImageElement(file)
      sourceWidth = imageEl.naturalWidth || imageEl.width
      sourceHeight = imageEl.naturalHeight || imageEl.height
    } catch {
      return { file: null, mime: null, error: 'Não foi possível processar a imagem.' }
    }
  }

  const longest = Math.max(sourceWidth, sourceHeight) || 1
  const scale = longest > maxDimension ? maxDimension / longest : 1
  const width = Math.max(1, Math.round(sourceWidth * scale))
  const height = Math.max(1, Math.round(sourceHeight * scale))

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d', { alpha: false })
  if (!ctx) {
    bitmap?.close?.()
    return { file: null, mime: null, error: 'Não foi possível comprimir a imagem.' }
  }

  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, width, height)
  ctx.drawImage(bitmap || imageEl, 0, 0, width, height)
  bitmap?.close?.()

  const preferWebp = await canEncodeWebp()
  const outputMime = preferWebp ? 'image/webp' : 'image/jpeg'
  const baseName = (file.name || 'foto').replace(/\.[^.]+$/, '') || 'foto'
  const extension = extensionForMime(outputMime)

  let quality = startQuality
  let bestBlob = null

  while (quality >= minQuality - 0.001) {
    const blob = await canvasToBlob(canvas, outputMime, quality)
    if (!blob) break
    bestBlob = blob
    if (blob.size <= targetMaxBytes) break
    quality -= 0.06
  }

  // Se ainda passou do alvo, tenta um passo a mais mais agressivo no tamanho.
  if (bestBlob && bestBlob.size > targetMaxBytes) {
    const tighterScale = Math.min(1, 1400 / Math.max(width, height))
    if (tighterScale < 0.98) {
      const tw = Math.max(1, Math.round(width * tighterScale))
      const th = Math.max(1, Math.round(height * tighterScale))
      const small = document.createElement('canvas')
      small.width = tw
      small.height = th
      const smallCtx = small.getContext('2d', { alpha: false })
      if (smallCtx) {
        smallCtx.fillStyle = '#ffffff'
        smallCtx.fillRect(0, 0, tw, th)
        smallCtx.drawImage(canvas, 0, 0, tw, th)
        quality = Math.max(minQuality, 0.62)
        while (quality >= minQuality - 0.001) {
          const blob = await canvasToBlob(small, outputMime, quality)
          if (!blob) break
          bestBlob = blob
          if (blob.size <= targetMaxBytes) break
          quality -= 0.06
        }
      }
    }
  }

  if (!bestBlob) {
    return { file: null, mime: null, error: 'Não foi possível comprimir a imagem.' }
  }

  if (bestBlob.size > hardMaxBytes) {
    return {
      file: null,
      mime: null,
      error: 'Não foi possível otimizar esta imagem. Tente outra foto.',
    }
  }

  const compressed = new File([bestBlob], `${baseName}.${extension}`, {
    type: outputMime,
    lastModified: Date.now(),
  })

  return { file: compressed, mime: outputMime, error: null }
}

export function initialsFromName(name) {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return 'VO'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
}
