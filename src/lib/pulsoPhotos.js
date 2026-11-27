import { isSupabaseConfigured, supabase } from './supabase'
import {
  AVATAR_ACCEPT,
  AVATAR_MAX_BYTES,
  compressImageForUpload,
  extensionForMime,
} from './imageFile'

export const MAX_PULSO_PHOTOS = 4
export const PULSO_PHOTO_ACCEPT = AVATAR_ACCEPT
export const PULSO_PHOTO_MAX_BYTES = AVATAR_MAX_BYTES

const BUCKET = 'pulso-photos'
const DEMO_DB = 'circulo_pulso_photos'
const DEMO_STORE = 'files'

/** Valida tipo e comprime a foto (sem limite no tamanho original). */
export async function validatePulsoPhotoFile(file) {
  const prepared = await compressImageForUpload(file)
  if (prepared.error) {
    return { file: null, mime: null, error: prepared.error }
  }
  return { file: prepared.file, mime: prepared.mime, error: null }
}

function openDemoDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DEMO_DB, 1)

    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(DEMO_STORE)) {
        db.createObjectStore(DEMO_STORE)
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

async function demoPut(photoId, blob) {
  const db = await openDemoDb()
  await new Promise((resolve, reject) => {
    const tx = db.transaction(DEMO_STORE, 'readwrite')
    tx.objectStore(DEMO_STORE).put(blob, photoId)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
  db.close()
}

async function demoGet(photoId) {
  const db = await openDemoDb()
  const blob = await new Promise((resolve, reject) => {
    const tx = db.transaction(DEMO_STORE, 'readonly')
    const request = tx.objectStore(DEMO_STORE).get(photoId)
    request.onsuccess = () => resolve(request.result ?? null)
    request.onerror = () => reject(request.error)
  })
  db.close()
  return blob
}

async function demoDelete(photoId) {
  const db = await openDemoDb()
  await new Promise((resolve, reject) => {
    const tx = db.transaction(DEMO_STORE, 'readwrite')
    tx.objectStore(DEMO_STORE).delete(photoId)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
  db.close()
}

export function normalizePhotos(raw) {
  const list = Array.isArray(raw) ? raw : []
  return list
    .map((photo, index) => ({
      id: photo.id,
      url: photo.url || null,
      storage_path: photo.storage_path || null,
      mime: photo.mime || null,
      sort_order: photo.sort_order ?? index,
    }))
    .sort((a, b) => a.sort_order - b.sort_order)
}

export async function hydrateDemoPhotos(photos) {
  const list = normalizePhotos(photos)
  return Promise.all(
    list.map(async (photo) => {
      if (photo.url && !photo.url.startsWith('blob:')) {
        return photo
      }
      const blob = photo.id ? await demoGet(photo.id) : null
      return {
        ...photo,
        url: blob ? URL.createObjectURL(blob) : photo.url,
      }
    }),
  )
}

export async function uploadPulsoPhotos({ userId, pulsoId, files, startOrder = 0 }) {
  if (!userId || !pulsoId) {
    return { photos: [], error: { message: 'Não foi possível enviar as fotos.' } }
  }

  if (!files?.length) {
    return { photos: [], error: null }
  }

  if (isSupabaseConfigured && supabase) {
    const uploaded = []

    for (const [index, item] of files.entries()) {
      const path = `${userId}/${pulsoId}/${crypto.randomUUID()}.${extensionForMime(item.mime)}`
      const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, item.file, {
        cacheControl: '3600',
        upsert: false,
        contentType: item.mime,
      })

      if (uploadError) {
        if (uploaded.length) {
          await supabase.storage.from(BUCKET).remove(uploaded.map((photo) => photo.storage_path))
        }
        return { photos: [], error: { message: 'Não foi possível enviar as fotos. Tente de novo.' } }
      }

      const { data: publicData } = supabase.storage.from(BUCKET).getPublicUrl(path)
      uploaded.push({
        id: crypto.randomUUID(),
        url: publicData?.publicUrl,
        storage_path: path,
        mime: item.mime,
        sort_order: startOrder + index,
      })
    }

    const { data, error } = await supabase
      .from('pulso_photos')
      .insert(
        uploaded.map((photo) => ({
          pulso_id: pulsoId,
          user_id: userId,
          url: photo.url,
          storage_path: photo.storage_path,
          sort_order: photo.sort_order,
        })),
      )
      .select('id, url, storage_path, sort_order')

    if (error) {
      await supabase.storage.from(BUCKET).remove(uploaded.map((photo) => photo.storage_path))
      return { photos: [], error: { message: 'As fotos foram enviadas, mas não puderam ser vinculadas ao pulso.' } }
    }

    return { photos: normalizePhotos(data), error: null }
  }

  const localPhotos = []
  for (const [index, item] of files.entries()) {
    const id = crypto.randomUUID()
    await demoPut(id, item.file)
    localPhotos.push({
      id,
      url: URL.createObjectURL(item.file),
      storage_path: `demo/${id}`,
      mime: item.mime,
      sort_order: startOrder + index,
    })
  }

  return { photos: localPhotos, error: null }
}

export async function removePulsoPhotos({ userId, photos }) {
  const list = normalizePhotos(photos)
  if (!list.length) return { error: null }

  if (isSupabaseConfigured && supabase) {
    const ids = list.map((photo) => photo.id).filter(Boolean)
    const paths = list
      .map((photo) => photo.storage_path)
      .filter((path) => path && path.startsWith(`${userId}/`))

    if (ids.length) {
      const { error } = await supabase.from('pulso_photos').delete().in('id', ids)
      if (error) {
        return { error: { message: 'Não foi possível remover as fotos.' } }
      }
    }

    if (paths.length) {
      await supabase.storage.from(BUCKET).remove(paths)
    }

    return { error: null }
  }

  await Promise.all(list.map((photo) => (photo.id ? demoDelete(photo.id) : Promise.resolve())))
  return { error: null }
}
