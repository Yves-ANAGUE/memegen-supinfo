import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'

export default function Connexion() {
  const [mode, setMode]         = useState('connexion') // 'connexion' | 'inscription'
  const [email, setEmail]       = useState('')
  const [motDePasse, setMotDePasse] = useState('')
  const [erreur, setErreur]     = useState(null)
  const [message, setMessage]   = useState(null)
  const [chargement, setChargement] = useState(false)
  const navigate = useNavigate()

  async function gererSoumission(e) {
    e.preventDefault()
    setErreur(null)
    setMessage(null)
    setChargement(true)

    if (mode === 'inscription') {
      const { error } = await supabase.auth.signUp({ email, password: motDePasse })
      if (error) {
        setErreur(error.message)
      } else {
        setMessage('Inscription réussie ! Vérifie ton email pour confirmer ton compte.')
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password: motDePasse })
      if (error) {
        setErreur('Email ou mot de passe incorrect.')
      } else {
        navigate('/mes-memes')
      }
    }

    setChargement(false)
  }

  return (
    <div style={styles.page}>
      <div style={styles.carte}>
        <h1 style={styles.titre}>🎭 MemeGen IA</h1>
        <p style={styles.sousTitre}>
          {mode === 'connexion' ? 'Content de te revoir !' : 'Crée ton compte gratuitement'}
        </p>

        {/* Onglets */}
        <div style={styles.onglets}>
          <button
            style={{ ...styles.onglet, ...(mode === 'connexion' ? styles.ongletActif : {}) }}
            onClick={() => { setMode('connexion'); setErreur(null); setMessage(null) }}
          >
            Se connecter
          </button>
          <button
            style={{ ...styles.onglet, ...(mode === 'inscription' ? styles.ongletActif : {}) }}
            onClick={() => { setMode('inscription'); setErreur(null); setMessage(null) }}
          >
            S'inscrire
          </button>
        </div>

        <form onSubmit={gererSoumission} style={styles.formulaire}>
          <div style={styles.champGroupe}>
            <label style={styles.label}>Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="toi@exemple.com"
              required
              style={styles.input}
            />
          </div>

          <div style={styles.champGroupe}>
            <label style={styles.label}>Mot de passe</label>
            <input
              type="password"
              value={motDePasse}
              onChange={e => setMotDePasse(e.target.value)}
              placeholder={mode === 'inscription' ? 'Minimum 6 caractères' : '••••••••'}
              required
              minLength={6}
              style={styles.input}
            />
          </div>

          {erreur && (
            <div style={styles.erreur}>⚠️ {erreur}</div>
          )}
          {message && (
            <div style={styles.succes}>✅ {message}</div>
          )}

          <button type="submit" disabled={chargement} style={styles.boutonPrincipal}>
            {chargement
              ? 'Chargement…'
              : mode === 'connexion' ? 'Se connecter' : "S'inscrire"
            }
          </button>
        </form>

        <p style={styles.lienBas}>
          {mode === 'connexion' ? 'Pas encore de compte ? ' : 'Déjà un compte ? '}
          <button
            onClick={() => { setMode(mode === 'connexion' ? 'inscription' : 'connexion'); setErreur(null); setMessage(null) }}
            style={styles.lienTexte}
          >
            {mode === 'connexion' ? "S'inscrire" : 'Se connecter'}
          </button>
        </p>
      </div>
    </div>
  )
}

const styles = {
  page: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '1rem',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
  carte: {
    background: '#fff',
    borderRadius: 16,
    padding: '2.5rem 2rem',
    width: '100%',
    maxWidth: 400,
    boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
  },
  titre: {
    textAlign: 'center',
    margin: '0 0 0.25rem',
    fontSize: 28,
    fontWeight: 700,
    color: '#1a1a2e',
  },
  sousTitre: {
    textAlign: 'center',
    color: '#666',
    margin: '0 0 1.5rem',
    fontSize: 15,
  },
  onglets: {
    display: 'flex',
    background: '#f5f5f5',
    borderRadius: 10,
    padding: 4,
    marginBottom: '1.5rem',
    gap: 4,
  },
  onglet: {
    flex: 1,
    padding: '0.5rem',
    border: 'none',
    borderRadius: 8,
    cursor: 'pointer',
    fontSize: 14,
    fontWeight: 500,
    background: 'transparent',
    color: '#666',
    transition: 'all 0.2s',
  },
  ongletActif: {
    background: '#fff',
    color: '#667eea',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  },
  formulaire: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  champGroupe: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  label: {
    fontSize: 14,
    fontWeight: 600,
    color: '#333',
  },
  input: {
    padding: '0.75rem 1rem',
    border: '2px solid #e8e8e8',
    borderRadius: 10,
    fontSize: 15,
    outline: 'none',
    transition: 'border-color 0.2s',
  },
  erreur: {
    background: '#fff0f0',
    border: '1px solid #ffcdd2',
    borderRadius: 8,
    padding: '0.75rem',
    color: '#c62828',
    fontSize: 14,
  },
  succes: {
    background: '#f0fff4',
    border: '1px solid #c8e6c9',
    borderRadius: 8,
    padding: '0.75rem',
    color: '#2e7d32',
    fontSize: 14,
  },
  boutonPrincipal: {
    padding: '0.85rem',
    background: 'linear-gradient(135deg, #667eea, #764ba2)',
    color: '#fff',
    border: 'none',
    borderRadius: 10,
    fontSize: 16,
    fontWeight: 600,
    cursor: 'pointer',
    marginTop: 4,
  },
  lienBas: {
    textAlign: 'center',
    marginTop: '1.25rem',
    fontSize: 14,
    color: '#666',
  },
  lienTexte: {
    background: 'none',
    border: 'none',
    color: '#667eea',
    fontWeight: 600,
    cursor: 'pointer',
    fontSize: 14,
    padding: 0,
  },
}