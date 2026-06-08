import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { supabase } from './lib/supabaseClient'
import { useAuth } from './hooks/useAuth'
import Accueil from './pages/Accueil'
import Connexion from './pages/Connexion'
import MesMemoires from './pages/MesMemoires'

function RoutePrivee({ enfant }) {
  const { utilisateur, chargement } = useAuth()
  if (chargement) return <p style={{ color: '#9ca3af', padding: '2rem' }}>Chargement…</p>
  return utilisateur ? enfant : <Navigate to="/connexion" replace />
}

function GestionAuth() {
  const navigate = useNavigate()

  useEffect(() => {
    // Nettoie le hash token Supabase de l'URL après auth
    supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && window.location.hash.includes('access_token')) {
        window.history.replaceState(null, '', window.location.pathname)
        if (session) navigate('/mes-memes', { replace: true })
      }
    })
  }, [navigate])

  return null
}

export default function App() {
  return (
    <BrowserRouter>
      <GestionAuth />
      <Routes>
        <Route path="/"          element={<Accueil />} />
        <Route path="/connexion" element={<Connexion />} />
        <Route path="/mes-memes" element={<RoutePrivee enfant={<MesMemoires />} />} />
      </Routes>
    </BrowserRouter>
  )
}