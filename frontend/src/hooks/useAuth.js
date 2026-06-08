import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export function useAuth() {
  const [utilisateur, setUtilisateur] = useState(null)
  const [chargement, setChargement] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUtilisateur(data.session?.user ?? null)
      setChargement(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => setUtilisateur(session?.user ?? null)
    )

    return () => subscription.unsubscribe()
  }, [])

  return { utilisateur, chargement }
}