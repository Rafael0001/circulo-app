import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import { useAuth } from './useAuth'
import { useFriends } from './useFriends'
import { readFriends, storageKey } from '../lib/friendsStorage'
import { isBlockedPair } from '../lib/blocksStorage'
import { BASE_CIRCLE_IDS, expiresAtFromDuration, pulsoReachesPlacement } from '../lib/pulsoVisibility'
import { ingestPulsoAlerts, shouldNotifyAbout } from '../lib/notifications'
import {
  hydrateDemoPhotos,
  MAX_PULSO_PHOTOS,
  normalizePhotos,
  removePulsoPhotos,
  uploadPulsoPhotos,
} from '../lib/pulsoPhotos'

const STORAGE_KEY = 'circulo_pulsos'
const CIRCLES_STORAGE_KEY = 'circulo_circles'

const PulsosContext = createContext(null)

function pulsosKey(userId) {
  return storageKey(STORAGE_KEY, userId)
}

function normalizeComment(comment, authorName) {
  if (!comment || typeof comment !== 'object') return comment

  return {
    id: comment.id,
    pulso_id: comment.pulso_id,
    user_id: comment.user_id,
    content: comment.content || '',
    created_at: comment.created_at,
    author: authorName || comment.author_name || comment.author || 'Amigo',
  }
}

function normalizeComments(raw, names = new Map()) {
  const list = Array.isArray(raw) ? raw : []
  return list
    .map((comment) => normalizeComment(comment, names.get(comment.user_id) || comment.author))
    .sort((a, b) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime())
}

function normalizePulso(pulso, authorName, commentNames) {
  if (!pulso || typeof pulso !== 'object') {
    return pulso
  }

  return {
    ...pulso,
    author: authorName || pulso.author || 'Amigo',
    author_id: pulso.user_id || pulso.author_id,
    is_importante: Boolean(pulso.is_importante),
    is_urgente: Boolean(pulso.is_urgente),
    photos: normalizePhotos(pulso.photos ?? pulso.pulso_photos),
    comments: normalizeComments(pulso.comments ?? pulso.pulso_comments, commentNames),
    duration_hours: pulso.duration_hours ?? null,
    include_inner: pulso.include_inner !== false,
  }
}

function readStoredPulsos(userId) {
  if (!userId) return []

  try {
    const raw = localStorage.getItem(pulsosKey(userId))
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.map((pulso) => normalizePulso(pulso)) : []
  } catch {
    return []
  }
}

function writeStoredPulsos(userId, pulsos) {
  if (!userId) return
  try {
    localStorage.setItem(
      pulsosKey(userId),
      JSON.stringify(
        pulsos
          .filter((pulso) => pulso.user_id === userId)
          .map((pulso) => ({
            ...pulso,
            photos: normalizePhotos(pulso.photos).map((photo) => ({
              id: photo.id,
              storage_path: photo.storage_path,
              mime: photo.mime,
              sort_order: photo.sort_order,
            })),
            comments: normalizeComments(pulso.comments).map((comment) => ({
              id: comment.id,
              pulso_id: comment.pulso_id,
              user_id: comment.user_id,
              content: comment.content,
              created_at: comment.created_at,
              author: comment.author,
            })),
          })),
      ),
    )
  } catch {
    // ignore quota / private mode
  }
}

function readAuthorCircleIds(authorId) {
  try {
    const raw = localStorage.getItem(storageKey(CIRCLES_STORAGE_KEY, authorId))
    if (!raw) return BASE_CIRCLE_IDS
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed) || parsed.length === 0) return BASE_CIRCLE_IDS
    const ids = parsed.map((circle) => circle?.id).filter(Boolean)
    return ids.length ? ids : BASE_CIRCLE_IDS
  } catch {
    return BASE_CIRCLE_IDS
  }
}

function isPulsoVisibleTo(viewerId, pulso, placementCircle, authorCircleIds) {
  if (!pulso) return false
  if (pulso.expires_at && new Date(pulso.expires_at).getTime() < Date.now()) return false
  if (pulso.user_id === viewerId) return true

  return pulsoReachesPlacement(
    pulso.circle_visibility,
    placementCircle,
    authorCircleIds,
    pulso.include_inner !== false,
  )
}

async function hydratePulsos(list) {
  return Promise.all(
    list.map(async (pulso) => ({
      ...pulso,
      photos: await hydrateDemoPhotos(pulso.photos),
    })),
  )
}

function loadDemoPulsos(userId, friends) {
  const names = new Map(friends.map((friend) => [friend.id, friend.name]))
  const mine = readStoredPulsos(userId).map((pulso) =>
    normalizePulso({ ...pulso, user_id: pulso.user_id || userId }, pulso.author),
  )

  const fromFriends = friends.flatMap((friend) => {
    if (isBlockedPair(userId, friend.id)) return []

    const authorCircleIds = readAuthorCircleIds(friend.id)
    const placement = readFriends(friend.id).find((item) => item.id === userId)

    return readStoredPulsos(friend.id)
      .map((pulso) => normalizePulso({ ...pulso, user_id: pulso.user_id || friend.id }, friend.name))
      .filter((pulso) => isPulsoVisibleTo(userId, pulso, placement?.circle, authorCircleIds))
  })

  return [...mine, ...fromFriends]
    .filter((pulso, index, list) => list.findIndex((item) => item.id === pulso.id) === index)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .map((pulso) => {
      const next = normalizePulso(
        pulso,
        pulso.user_id === userId ? pulso.author : names.get(pulso.user_id) || pulso.author,
      )
      return {
        ...next,
        comments: next.comments.filter(
          (comment) => comment.user_id === userId || !isBlockedPair(userId, comment.user_id),
        ),
      }
    })
}

async function loadRemotePulsos(userId) {
  const { data: rows, error } = await supabase
    .from('pulsos')
    .select(
      'id, user_id, content, is_importante, is_urgente, circle_visibility, created_at, expires_at, duration_hours, include_inner, pulso_photos(id, url, storage_path, sort_order), pulso_comments(id, pulso_id, user_id, content, created_at, author_name)',
    )
    .or('expires_at.is.null,expires_at.gt.now()')
    .order('created_at', { ascending: false })

  if (error) throw error
  if (!rows?.length) return []

  const authorIds = [...new Set(rows.map((row) => row.user_id))]
  const commentAuthorIds = [
    ...new Set(rows.flatMap((row) => (row.pulso_comments || []).map((comment) => comment.user_id))),
  ]
  const profileIds = [...new Set([...authorIds, ...commentAuthorIds])]
  const { data: profiles } = await supabase.from('profiles').select('id, name').in('id', profileIds)
  const names = new Map((profiles || []).map((profile) => [profile.id, profile.name]))

  return rows.map((row) =>
    normalizePulso(
      row,
      names.get(row.user_id) || (row.user_id === userId ? 'Você' : 'Amigo'),
      names,
    ),
  )
}

export function PulsosProvider({ children }) {
  const { user } = useAuth()
  const { friends, blockedUsers } = useFriends()
  const userId = user?.id ?? null
  const friendKey = friends.map((friend) => friend.id).join('|')
  const blockKey = blockedUsers.map((item) => item.id).sort().join('|')
  const [pulsos, setPulsos] = useState([])
  const [alerts, setAlerts] = useState([])
  const [hydratedFor, setHydratedFor] = useState(null)

  const refreshPulsos = useCallback(async () => {
    if (!userId) return []

    if (!isSupabaseConfigured) {
      const local = await hydratePulsos(loadDemoPulsos(userId, friends))
      setPulsos(local)
      setAlerts(ingestPulsoAlerts(userId, local, friends))
      return local
    }

    try {
      const remote = await loadRemotePulsos(userId)
      setPulsos(remote)
      setAlerts(ingestPulsoAlerts(userId, remote, friends))
      return remote
    } catch {
      return []
    }
  }, [userId, friends, friendKey, blockKey])

  useEffect(() => {
    if (!userId) {
      setPulsos([])
      setAlerts([])
      setHydratedFor(null)
      return undefined
    }

    if (!isSupabaseConfigured) {
      let cancelled = false
      hydratePulsos(loadDemoPulsos(userId, friends)).then((local) => {
        if (!cancelled) {
          setPulsos(local)
          setAlerts(ingestPulsoAlerts(userId, local, friends))
          setHydratedFor(userId)
        }
      })
      return () => {
        cancelled = true
      }
    }

    let cancelled = false
    loadRemotePulsos(userId)
      .then((remote) => {
        if (!cancelled) {
          setPulsos(remote)
          setAlerts(ingestPulsoAlerts(userId, remote, friends))
          setHydratedFor(userId)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setPulsos([])
          setHydratedFor(userId)
        }
      })

    return () => {
      cancelled = true
    }
  }, [userId, friendKey, blockKey])

  useEffect(() => {
    if (!userId || hydratedFor !== userId || isSupabaseConfigured) return
    writeStoredPulsos(userId, pulsos)
  }, [pulsos, userId, hydratedFor])

  useEffect(() => {
    if (!userId) return undefined

    const onVisible = () => {
      if (document.visibilityState === 'visible') refreshPulsos()
    }

    const onStorage = (event) => {
      if (!event.key || event.key.startsWith(`${STORAGE_KEY}:`)) refreshPulsos()
    }

    window.addEventListener('focus', onVisible)
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('storage', onStorage)

    let channel = null
    if (isSupabaseConfigured && supabase) {
      channel = supabase
        .channel(`pulsos-${userId}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'pulsos' }, () => {
          refreshPulsos()
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'pulso_photos' }, () => {
          refreshPulsos()
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'pulso_comments' }, () => {
          refreshPulsos()
        })
        .subscribe()
    }

    const pruneExpired = () => {
      const now = Date.now()
      setPulsos((list) =>
        list.filter((pulso) => !pulso.expires_at || new Date(pulso.expires_at).getTime() > now),
      )
    }

    const pruneTimer = window.setInterval(pruneExpired, 30000)

    return () => {
      window.removeEventListener('focus', onVisible)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('storage', onStorage)
      window.clearInterval(pruneTimer)
      if (channel) supabase.removeChannel(channel)
    }
  }, [userId, refreshPulsos])

  const criarPulso = useCallback(
    async ({
      content,
      circle_visibility = 'conhecidos',
      is_importante = false,
      is_urgente = false,
      photos = [],
      duration_hours = 24,
      include_inner = true,
    }) => {
      const text = (content || '').trim()
      const files = (photos || []).filter((item) => item?.file && item?.mime).slice(0, MAX_PULSO_PHOTOS)
      const hours = [12, 24, 48].includes(Number(duration_hours)) ? Number(duration_hours) : 24
      const createdAt = new Date().toISOString()
      const expiresAt = expiresAtFromDuration(createdAt, hours)

      if (!text && files.length === 0) {
        return { data: null, error: { message: 'Escreva um texto ou adicione uma foto.' } }
      }

      const authorName = user?.user_metadata?.name ?? 'Você'
      const payload = {
        user_id: userId ?? 'anon',
        content: text,
        is_importante: Boolean(is_importante),
        is_urgente: Boolean(is_urgente),
        circle_visibility,
        include_inner: include_inner !== false,
        duration_hours: hours,
        created_at: createdAt,
        expires_at: expiresAt,
      }

      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase
          .from('pulsos')
          .insert([
            {
              user_id: userId,
              content: text,
              is_importante: Boolean(is_importante),
              is_urgente: Boolean(is_urgente),
              circle_visibility,
              include_inner: include_inner !== false,
              duration_hours: hours,
              expires_at: expiresAt,
            },
          ])
          .select(
            'id, user_id, content, is_importante, is_urgente, circle_visibility, created_at, expires_at, duration_hours, include_inner',
          )
          .single()

        if (error || !data) {
          return { data: null, error: error || { message: 'Não foi possível publicar o pulso.' } }
        }

        const uploaded = await uploadPulsoPhotos({
          userId,
          pulsoId: data.id,
          files,
        })

        if (uploaded.error) {
          await supabase.from('pulsos').delete().eq('id', data.id)
          return { data: null, error: uploaded.error }
        }

        const nextPulso = normalizePulso({ ...data, photos: uploaded.photos, comments: [] }, authorName)
        setPulsos((current) => [nextPulso, ...current.filter((item) => item.id !== nextPulso.id)])
        return { data: nextPulso, error: null }
      }

      const localId = crypto.randomUUID()
      const uploaded = await uploadPulsoPhotos({
        userId: userId ?? 'anon',
        pulsoId: localId,
        files,
      })

      if (uploaded.error) {
        return { data: null, error: uploaded.error }
      }

      const localPulso = normalizePulso(
        {
          id: localId,
          author: authorName,
          photos: uploaded.photos,
          comments: [],
          ...payload,
        },
        authorName,
      )

      setPulsos((current) => [localPulso, ...current])
      if (userId) {
        writeStoredPulsos(userId, [localPulso, ...readStoredPulsos(userId)])
      }
      return { data: localPulso, error: null }
    },
    [userId, user],
  )

  const editarPulso = useCallback(
    async (
      pulsoId,
      {
        content,
        photos = [],
        circle_visibility,
        include_inner,
        duration_hours,
      } = {},
    ) => {
      const current = pulsos.find((item) => item.id === pulsoId)
      if (!current) {
        return { data: null, error: { message: 'Pulso não encontrado.' } }
      }
      if (current.user_id !== userId) {
        return { data: null, error: { message: 'Só o autor pode editar este pulso.' } }
      }

      const text = (content ?? current.content ?? '').trim()
      const nextPhotos = photos.slice(0, MAX_PULSO_PHOTOS)
      const kept = nextPhotos.filter((photo) => !photo.isNew && !photo.file)
      const files = nextPhotos.filter((item) => item?.file && item?.mime)
      const removed = (current.photos || []).filter(
        (photo) => !kept.some((item) => item.id === photo.id),
      )
      const nextVisibility = circle_visibility || current.circle_visibility
      const nextIncludeInner =
        include_inner === undefined ? current.include_inner !== false : include_inner !== false
      const nextHours = [12, 24, 48].includes(Number(duration_hours))
        ? Number(duration_hours)
        : current.duration_hours
      const nextExpires = expiresAtFromDuration(current.created_at, nextHours)

      if (!text && kept.length + files.length === 0) {
        return { data: null, error: { message: 'O pulso precisa de texto ou pelo menos uma foto.' } }
      }

      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase
          .from('pulsos')
          .update({
            content: text,
            circle_visibility: nextVisibility,
            include_inner: nextIncludeInner,
            duration_hours: nextHours ?? null,
            expires_at: nextExpires,
          })
          .eq('id', pulsoId)
          .eq('user_id', userId)
          .select(
            'id, user_id, content, is_importante, is_urgente, circle_visibility, created_at, expires_at, duration_hours, include_inner',
          )
          .single()

        if (error || !data) {
          return { data: null, error: error || { message: 'Não foi possível salvar a edição.' } }
        }

        const removedResult = await removePulsoPhotos({ userId, photos: removed })
        if (removedResult.error) {
          return { data: null, error: removedResult.error }
        }

        const uploaded = await uploadPulsoPhotos({
          userId,
          pulsoId,
          files,
          startOrder: kept.length,
        })
        if (uploaded.error) {
          return { data: null, error: uploaded.error }
        }

        const nextPulso = normalizePulso(
          { ...data, photos: [...kept, ...uploaded.photos], comments: current.comments },
          current.author,
        )
        setPulsos((list) => list.map((item) => (item.id === pulsoId ? nextPulso : item)))
        return { data: nextPulso, error: null }
      }

      const removedResult = await removePulsoPhotos({ userId, photos: removed })
      if (removedResult.error) {
        return { data: null, error: removedResult.error }
      }

      const uploaded = await uploadPulsoPhotos({
        userId: userId ?? 'anon',
        pulsoId,
        files,
        startOrder: kept.length,
      })
      if (uploaded.error) {
        return { data: null, error: uploaded.error }
      }

      const nextPulso = normalizePulso(
        {
          ...current,
          content: text,
          photos: [...kept, ...uploaded.photos],
          comments: current.comments,
          circle_visibility: nextVisibility,
          include_inner: nextIncludeInner,
          duration_hours: nextHours ?? null,
          expires_at: nextExpires,
        },
        current.author,
      )
      setPulsos((list) => list.map((item) => (item.id === pulsoId ? nextPulso : item)))
      if (userId) {
        writeStoredPulsos(
          userId,
          [nextPulso, ...readStoredPulsos(userId).filter((item) => item.id !== pulsoId)],
        )
      }
      return { data: nextPulso, error: null }
    },
    [pulsos, userId],
  )

  const excluirPulso = useCallback(
    async (pulsoId) => {
      const current = pulsos.find((item) => item.id === pulsoId)
      if (!current) {
        return { error: { message: 'Pulso não encontrado.' } }
      }
      if (current.user_id !== userId) {
        return { error: { message: 'Só o autor pode excluir este pulso.' } }
      }

      if (isSupabaseConfigured && supabase) {
        await removePulsoPhotos({ userId, photos: current.photos })
        const { error } = await supabase.from('pulsos').delete().eq('id', pulsoId).eq('user_id', userId)
        if (error) {
          return { error: { message: 'Não foi possível excluir o pulso.' } }
        }
        setPulsos((list) => list.filter((item) => item.id !== pulsoId))
        return { error: null }
      }

      await removePulsoPhotos({ userId, photos: current.photos })
      setPulsos((list) => list.filter((item) => item.id !== pulsoId))
      if (userId) {
        writeStoredPulsos(
          userId,
          readStoredPulsos(userId).filter((item) => item.id !== pulsoId),
        )
      }
      return { error: null }
    },
    [pulsos, userId],
  )

  const patchComments = useCallback((pulsoId, updater) => {
    setPulsos((list) =>
      list.map((item) => {
        if (item.id !== pulsoId) return item
        return { ...item, comments: updater(item.comments || []) }
      }),
    )
  }, [])

  const comentarPulso = useCallback(
    async (pulsoId, content) => {
      const text = (content || '').trim()
      if (!text) {
        return { data: null, error: { message: 'Escreva um comentário.' } }
      }
      if (text.length > 280) {
        return { data: null, error: { message: 'O comentário pode ter no máximo 280 caracteres.' } }
      }

      const current = pulsos.find((item) => item.id === pulsoId)
      if (!current) {
        return { data: null, error: { message: 'Pulso não encontrado.' } }
      }
      if (isBlockedPair(userId, current.user_id)) {
        return { data: null, error: { message: 'Não é possível comentar neste pulso.' } }
      }

      const authorName = user?.user_metadata?.name ?? 'Você'

      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase
          .from('pulso_comments')
          .insert([{ pulso_id: pulsoId, user_id: userId, content: text }])
          .select('id, pulso_id, user_id, content, created_at, author_name')
          .single()

        if (error || !data) {
          return { data: null, error: { message: 'Não foi possível enviar o comentário.' } }
        }

        const comment = normalizeComment(data, authorName)
        patchComments(pulsoId, (list) =>
          list.some((item) => item.id === comment.id) ? list : [...list, comment],
        )
        return { data: comment, error: null }
      }

      const comment = normalizeComment(
        {
          id: crypto.randomUUID(),
          pulso_id: pulsoId,
          user_id: userId,
          content: text,
          created_at: new Date().toISOString(),
        },
        authorName,
      )
      patchComments(pulsoId, (list) => [...list, comment])
      const ownerStored = readStoredPulsos(current.user_id)
      writeStoredPulsos(
        current.user_id,
        ownerStored.some((item) => item.id === pulsoId)
          ? ownerStored.map((item) =>
              item.id === pulsoId
                ? { ...item, comments: [...(item.comments || []), comment] }
                : item,
            )
          : [{ ...current, comments: [comment] }, ...ownerStored],
      )
      return { data: comment, error: null }
    },
    [pulsos, userId, user, patchComments],
  )

  const editarComentario = useCallback(
    async (commentId, content) => {
      const text = (content || '').trim()
      if (!text) {
        return { data: null, error: { message: 'Escreva um comentário.' } }
      }
      if (text.length > 280) {
        return { data: null, error: { message: 'O comentário pode ter no máximo 280 caracteres.' } }
      }

      const host = pulsos.find((item) => (item.comments || []).some((comment) => comment.id === commentId))
      const current = host?.comments?.find((comment) => comment.id === commentId)
      if (!host || !current) {
        return { data: null, error: { message: 'Comentário não encontrado.' } }
      }
      if (current.user_id !== userId) {
        return { data: null, error: { message: 'Só o autor pode editar este comentário.' } }
      }

      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase
          .from('pulso_comments')
          .update({ content: text })
          .eq('id', commentId)
          .eq('user_id', userId)
          .select('id, pulso_id, user_id, content, created_at, author_name')
          .single()

        if (error || !data) {
          return { data: null, error: { message: 'Não foi possível editar o comentário.' } }
        }

        const next = normalizeComment(data, current.author)
        patchComments(host.id, (list) => list.map((item) => (item.id === commentId ? next : item)))
        return { data: next, error: null }
      }

      const next = normalizeComment({ ...current, content: text }, current.author)
      patchComments(host.id, (list) => list.map((item) => (item.id === commentId ? next : item)))
      const ownerStored = readStoredPulsos(host.user_id)
      writeStoredPulsos(
        host.user_id,
        ownerStored.map((item) =>
          item.id === host.id
            ? {
                ...item,
                comments: (item.comments || []).map((comment) =>
                  comment.id === commentId ? next : comment,
                ),
              }
            : item,
        ),
      )
      return { data: next, error: null }
    },
    [pulsos, userId, patchComments],
  )

  const excluirComentario = useCallback(
    async (commentId) => {
      const host = pulsos.find((item) => (item.comments || []).some((comment) => comment.id === commentId))
      const current = host?.comments?.find((comment) => comment.id === commentId)
      if (!host || !current) {
        return { error: { message: 'Comentário não encontrado.' } }
      }
      if (current.user_id !== userId && host.user_id !== userId) {
        return { error: { message: 'Você não pode excluir este comentário.' } }
      }

      if (isSupabaseConfigured && supabase) {
        const query = supabase.from('pulso_comments').delete().eq('id', commentId)
        const { error } = await query
        if (error) {
          return { error: { message: 'Não foi possível excluir o comentário.' } }
        }
        patchComments(host.id, (list) => list.filter((item) => item.id !== commentId))
        return { error: null }
      }

      patchComments(host.id, (list) => list.filter((item) => item.id !== commentId))
      const ownerStored = readStoredPulsos(host.user_id)
      writeStoredPulsos(
        host.user_id,
        ownerStored.map((item) =>
          item.id === host.id
            ? {
                ...item,
                comments: (item.comments || []).filter((comment) => comment.id !== commentId),
              }
            : item,
        ),
      )
      return { error: null }
    },
    [pulsos, userId, patchComments],
  )

  const createPulso = useCallback(async (newPulso) => criarPulso(newPulso), [criarPulso])

  const visibleAlerts = useMemo(
    () => alerts.filter((alert) => shouldNotifyAbout(alert.authorId, friends, userId)),
    [alerts, friends, userId],
  )

  const value = useMemo(
    () => ({
      pulsos,
      alerts: visibleAlerts,
      createPulso,
      criarPulso,
      editarPulso,
      excluirPulso,
      comentarPulso,
      editarComentario,
      excluirComentario,
      refreshPulsos,
    }),
    [
      pulsos,
      visibleAlerts,
      createPulso,
      criarPulso,
      editarPulso,
      excluirPulso,
      comentarPulso,
      editarComentario,
      excluirComentario,
      refreshPulsos,
    ],
  )

  return <PulsosContext.Provider value={value}>{children}</PulsosContext.Provider>
}

/* eslint-disable react-refresh/only-export-components -- hook shares the provider module */
export function usePulsos() {
  const context = useContext(PulsosContext)

  if (!context) {
    throw new Error('usePulsos must be used within PulsosProvider')
  }

  return context
}
