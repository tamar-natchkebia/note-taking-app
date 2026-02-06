import { createClient } from '@supabase/supabase-js'

// We are putting the strings directly here so the app doesn't have to look for the .env file
const supabaseUrl = 'https://vrpdbtpgbntfydlbltlh.supabase.co'
const supabaseAnonKey = 'sb_publishable_VE04weW4FboClYjKun_ZHg_EPs53Fws'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)