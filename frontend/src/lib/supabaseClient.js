import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      storageKey: 'memegen-session',
    },
  }
)
// Réveille le backend Render au chargement de l'app
if (import.meta.env.VITE_BACKEND_URL) {
  fetch(`${import.meta.env.VITE_BACKEND_URL}/health`, { method: 'GET' })
    .catch(() => {}) // silencieux si ça échoue
}