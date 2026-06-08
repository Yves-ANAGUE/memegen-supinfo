import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import Accueil from './pages/Accueil'
import Connexion from './pages/Connexion'
import MesMemoires from './pages/MesMemoires'

function RoutePrivee({ enfant }) {
  const { utilisateur, chargement } = useAuth()
  if (chargement) return <p>Chargement…</p>
  return utilisateur ? enfant : <Navigate to="/connexion" replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/"          element={<Accueil />} />
        <Route path="/connexion" element={<Connexion />} />
        <Route path="/mes-memes" element={<RoutePrivee enfant={<MesMemoires />} />} />
      </Routes>
    </BrowserRouter>
  )
}