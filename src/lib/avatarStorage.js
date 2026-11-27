import { isSupabaseConfigured, supabase } from './supabase'
import { extensionForMime } from './imageFile'

const BUCKET = 'avatars'
const DEMO_DB = 'circulo_avatars'
const DEMO_STORE = 'files'

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

async function demoPut(userId, blob) {
  const db = await openDemoDb()
  await new Promise((resolve, reject) => {
    const tx = db.transaction(DEMO_STORE, 'readwrite')
    tx.objectStore(DEMO_STORE).put(blob, userId)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
  db.close()
}

async function demoGet(userId) {
  const db = await openDemoDb()
  const blob = await new Promise((resolve, reject) => {
    const tx = db.transaction(DEMO_STORE, 'readonly')
    const request = tx.objectStore(DEMO_STORE).get(userId)
    request.onsuccess = () => resolve(request.result ?? null)
    request.onerror = () => reject(request.error)
  })
  db.close()
  return blob
}

async function demoDelete(userId) {
  const db = await openDemoDb()
  await new Promise((resolve, reject) => {
    const tx = db.transaction(DEMO_STORE, 'readwrite')
    tx.objectStore(DEMO_STORE).delete(userId)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
  db.close()
}

export function storagePathFromPublicUrl(url) {
  if (!url || typeof url !== 'string') return null
  const marker = `/storage/v1/object/public/${BUCKET}/`
  const index = url.indexOf(marker)
  if (index === -1) return null
  return decodeURIComponent(url.slice(index + marker.length).split('?')[0])
}

export async function loadAvatarUrl(userId) {
  if (!userId) return { url: null, error: null }

  if (!isSupabaseConfigured) {
    const blob = await demoGet(userId)
    return { url: blob ? URL.createObjectURL(blob) : null, error: null }
  }

  const { data, error } = await supabase.from('profiles').select('avatar_url').eq('id', userId).maybeSingle()
  if (error) {
    return { url: null, error }
  }

  return { url: data?.avatar_url ?? null, error: null }
}

export async function uploadAvatar({ userId, file, mime, previousUrl }) {
  if (!userId) {
    return { url: null, error: { message: 'Usuário não autenticado.' } }
  }

  if (!isSupabaseConfigured) {
    await demoPut(userId, file)
    return { url: URL.createObjectURL(file), error: null }
  }

  const path = `${userId}/${crypto.randomUUID()}.${extensionForMime(mime)}`
  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: '3600',
    upsert: false,
    contentType: mime,
  })

  if (uploadError) {
    return { url: null, error: uploadError }
  }

  const { data: publicData } = supabase.storage.from(BUCKET).getPublicUrl(path)
  const nextUrl = publicData?.publicUrl

  const { error: upsertError } = await supabase.from('profiles').upsert(
    {
      id: userId,
      avatar_url: nextUrl,
    },
    { onConflict: 'id' },
  )

  if (upsertError) {
    await supabase.storage.from(BUCKET).remove([path])
    return { url: null, error: upsertError }
  }

  const oldPath = storagePathFromPublicUrl(previousUrl)
  if (oldPath && oldPath.startsWith(`${userId}/`)) {
    await supabase.storage.from(BUCKET).remove([oldPath])
  }

  return { url: nextUrl, error: null }
}

export async function removeAvatar({ userId, previousUrl }) {
  if (!userId) {
    return { error: { message: 'Usuário não autenticado.' } }
  }

  if (!isSupabaseConfigured) {
    await demoDelete(userId)
    return { error: null }
  }

  const { error: updateError } = await supabase.from('profiles').upsert(
    {
      id: userId,
      avatar_url: null,
    },
    { onConflict: 'id' },
  )

  if (updateError) {
    return { error: updateError }
  }

  const oldPath = storagePathFromPublicUrl(previousUrl)
  if (oldPath && oldPath.startsWith(`${userId}/`)) {
    await supabase.storage.from(BUCKET).remove([oldPath])
  }

  return { error: null }
}
