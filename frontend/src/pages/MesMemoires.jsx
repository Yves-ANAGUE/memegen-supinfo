import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import Editeur from '../composants/Editeur'
import Galerie from '../composants/Galerie'
import { supabase } from '../lib/supabaseClient'


export default function MesMemoires() {
  const { utilisateur }       = useAuth()
  const [cleGalerie, setCleGalerie] = useState(0)
  const refEditeur = useRef(null)

  function rechargerGalerie() {
    setCleGalerie(c => c + 1)
  }

  useEffect(() => {
  const urlAOuvrir = sessionStorage.getItem('meme-a-ouvrir')
  if (urlAOuvrir) {
    sessionStorage.removeItem('meme-a-ouvrir')
    // Petit délai pour laisser le canvas s'initialiser
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('charger-meme', { detail: { url: urlAOuvrir } }))
    }, 500)
  }
}, [])

  function roouvrirDansEditeur(meme) {
    // Scroll vers l'éditeur
    refEditeur.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    // Charge l'image du mème dans le canvas via un événement custom
    window.dispatchEvent(new CustomEvent('charger-meme', { detail: { url: meme.url_image } }))
  }

  return (
    <div style={styles.page}>
      <nav style={styles.nav}>
        <Link to="/" style={styles.logo}>🎭 MemeGen IA</Link>
        <div style={styles.navDroit}>
          <span style={styles.email}>{utilisateur?.email}</span>
          <button type="button" onClick={() => supabase.auth.signOut()} style={styles.boutonDeconnexion}>
            Déconnexion
          </button>
        </div>
      </nav>

      <div style={styles.contenu}>
        <section ref={refEditeur}>
          <h2 style={styles.titreSec}>✏️ Créer un mème</h2>
          <p style={styles.sousTitre}>Upload une image · Ajoute du texte · Laisse l'IA suggérer des légendes</p>
          <Editeur onSauvegarde={rechargerGalerie} />
        </section>

        <section style={{ marginTop: '3rem' }}>
          <h2 style={styles.titreSec}>🗂 Mes créations</h2>
          <p style={styles.sousTitre}>Survole une carte pour modifier, supprimer ou télécharger</p>
          {utilisateur
            ? <Galerie
                key={cleGalerie}
                utilisateur={utilisateur}
                mode="prive"
                onReouvrir={roouvrirDansEditeur}
              />
            : <p style={{ color: '#9ca3af' }}>Chargement…</p>
          }
        </section>
      </div>
    </div>
  )
}

const styles = {
  page:             { minHeight: '100vh', background: '#0f0f1a', color: '#f0f0f0', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' },
  nav:              { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 2rem', borderBottom: '1px solid rgba(255,255,255,0.08)', background: 'rgba(15,15,26,0.9)', position: 'sticky', top: 0, zIndex: 100 },
  logo:             { fontSize: 20, fontWeight: 700, color: '#e5e7eb', textDecoration: 'none' },
  navDroit:         { display: 'flex', alignItems: 'center', gap: '1rem' },
  email:            { fontSize: 13, color: '#9ca3af' },
  boutonDeconnexion:{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: '#ccc', padding: '0.4rem 0.9rem', borderRadius: 8, fontSize: 13, cursor: 'pointer' },
  contenu:          { maxWidth: 1200, margin: '0 auto', padding: '2rem 1.5rem' },
  titreSec:         { fontSize: 20, fontWeight: 700, marginBottom: '0.25rem' },
  sousTitre:        { fontSize: 13, color: '#9ca3af', marginBottom: '1.5rem' },
}