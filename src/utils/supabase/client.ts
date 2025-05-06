import { createClient as createSupabaseClient } from '@supabase/supabase-js'

export const createClient = () => {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL!
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY!

  return createSupabaseClient(supabaseUrl, supabaseAnonKey)
}
