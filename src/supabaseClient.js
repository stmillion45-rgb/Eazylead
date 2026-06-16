// Inizializzazione client Supabase
// Le credenziali vengono lette dalle variabili d'ambiente Vite (mai hardcodate)
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'ERRORE: Variabili d\'ambiente Supabase mancanti. Verifica il file .env nella root del progetto.'
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
