import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { isSupabaseConfigured, supabase } from '../lib/supabase'

const STORAGE_KEY = 'circulo_pulsos'

const initialPulsos = [
  {
    id: 'p1',
    author: 'Ana',
    category: 'necessidade',
    content: 'Tô precisando tomar um café com alguém e descontrair.',
    circle_visibility: 'intimos',
    created_at: '2026-08-22T19:00:00.000Z',
  },
  {
    id: 'p2',
    author: 'Mari',
    category: 'vontade',
    content: 'Quero visitar a Bahia com a galera e passar uns dias sem agenda fixa.',
    circle_visibility: 'amigos',
    created_at: '2026-08-22T18:15:00.000Z',
  },
  {
    id: 'p3',
    author: 'Bia',
    category: 'sonho',
    content: 'Sonhando em abrir uma cafeteria com uma mesa grande e música boa.',
    circle_visibility: 'conhecidos',
    created_at: '2026-08-22T17:40:00.000Z',
  },
  {
    id: 'p4',
    author: 'Rafa',
    category: 'projeto',
    content: 'Quero começar um projeto de encontros de leitura no bairro.',
    circle_visibility: 'intimos',
    created_at: '2026-08-22T16:10:00.000Z',
  },
  {
    id: 'p5',
    author: 'Rafa',
    category: 'necessidade',
    content: 'Preciso de uma mão para montar uma mesa de trabalho em casa.',
    circle_visibility: 'intimos',
    created_at: '2026-08-23T15:30:00.000Z',
  },
  {
    id: 'p6',
    author: 'Rafa',
    category: 'vontade',
    content: 'Quero conhecer um lugar novo para fotografar no fim de semana.',
    circle_visibility: 'intimos',
    created_at: '2026-08-23T16:45:00.000Z',
  },
  {
    id: 'p7',
    author: 'Rafa',
    category: 'sonho',
    content: 'Sonho em viajar para a Europa em um mês mais leve e com mais tempo.',
    circle_visibility: 'intimos',
    created_at: '2026-08-23T17:15:00.000Z',
  },
  {
    id: 'p8',
    author: 'Rafa',
    category: 'necessidade',
    content: 'Preciso de alguém para ir no mercado e me ajudar a reorganizar a casa.',
    circle_visibility: 'intimos',
    created_at: '2026-08-24T08:40:00.000Z',
  },
  {
    id: 'p9',
    author: 'Rafa',
    category: 'vontade',
    content: 'Quero fazer uma trilha no fim de semana e pegar um pôr do sol boa.',
    circle_visibility: 'intimos',
    created_at: '2026-08-24T12:10:00.000Z',
  },
]

const PulsosContext = createContext(null)

function readPulsos() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return initialPulsos
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : initialPulsos
  } catch {
    return initialPulsos
  }
}

export function PulsosProvider({ children }) {
  const [pulsos, setPulsos] = useState(readPulsos)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(pulsos))
    } catch {
      // ignore quota / private mode
    }
  }, [pulsos])

  const criarPulso = useCallback(async ({ category, content, circle_visibility = 'amigos', user_id = 'demo-user' }) => {
    const payload = {
      user_id,
      category,
      content,
      circle_visibility,
      created_at: new Date().toISOString(),
    }

    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.from('pulsos').insert([payload]).select().single()

      if (!error && data) {
        const nextPulso = {
          ...data,
          author: data.author ?? 'Você',
        }
        setPulsos((current) => [nextPulso, ...current])
        return { data: nextPulso, error: null }
      }

      return { data: null, error }
    }

    const localPulso = {
      id: crypto.randomUUID(),
      author: 'Você',
      ...payload,
    }

    setPulsos((current) => [localPulso, ...current])
    return { data: localPulso, error: null }
  }, [])

  const createPulso = useCallback(async (newPulso) => criarPulso(newPulso), [criarPulso])

  const value = useMemo(
    () => ({ pulsos, createPulso, criarPulso }),
    [pulsos, createPulso, criarPulso],
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
