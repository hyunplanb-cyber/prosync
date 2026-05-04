import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://xekusmfxgmgzfkjnzosa.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_y7OgTrKgA-n7hlEg-SdCCQ_hdge2c4B'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
