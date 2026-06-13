import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

const credenciaisValidas =
  supabaseUrl &&
  supabaseAnonKey &&
  !supabaseAnonKey.includes('SUBSTITUA') &&
  supabaseUrl.startsWith('https://')

export const supabase = credenciaisValidas
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null
