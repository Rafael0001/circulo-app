import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: 'pkce',
      },
    })
  : null

export async function getGoogleAuthEnabled() {
  if (!isSupabaseConfigured || !supabaseUrl || !supabaseAnonKey) return false

  try {
    const response = await fetch(`${supabaseUrl}/auth/v1/settings`, {
      headers: { apikey: supabaseAnonKey },
    })
    if (!response.ok) return false
    const settings = await response.json()
    return Boolean(settings?.external?.google)
  } catch {
    return false
  }
}
