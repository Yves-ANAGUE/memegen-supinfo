import { useEffect, useState, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../hooks/useAuth'

export default function Accueil() {
  const { utilisateur }             = useAuth()
  const navigate                    = useNavigate()
  const [memesPublics, setMemes]    = useState([])
  const [chargement, setChargement] = useState(true)
  const [modalPartage, setModalPartage] = useState(null) // meme en cours de partage

  useEffect(() => {
    supabase.from('memes').select('*')
      .eq('est_public', true)
      .order('cree_le', { ascending: false })
      .range(0, 23)
      .then(({ data }) => { setMemes(data ?? []); setChargement(false) })
  }, [])

  const telechargerMeme = useCallback(async (urlImage) => {
    try {
      const rep  = await fetch(urlImage)
      const blob = await rep.blob()
      const url  = URL.createObjectURL(blob)
      const lien = document.createElement('a')
      lien.href = url; lien.download = `meme-${Date.now()}.png`
      document.body.appendChild(lien); lien.click()
      document.body.removeChild(lien); URL.revokeObjectURL(url)
    } catch { window.open(urlImage, '_blank') }
  }, [])

  function ouvrirDansEditeur(meme) {
    // Stocke l'URL dans sessionStorage — l'éditeur la lira au montage
    sessionStorage.setItem('meme-a-ouvrir', meme.url_image)
    navigate('/mes-memes')
  }

  return (
    <div style={styles.page}>
      <nav style={styles.nav}>
        <span style={styles.logo}>🎭 MemeGen IA</span>
        <div style={styles.navActions}>
          {utilisateur ? (
            <>
              <Link to="/mes-memes" style={styles.boutonNav}>Créer un mème</Link>
              <button type="button" onClick={() => supabase.auth.signOut()} style={styles.boutonNavSecondaire}>Déconnexion</button>
            </>
          ) : (
            <Link to="/connexion" style={styles.boutonNav}>Connexion / Inscription</Link>
          )}
        </div>
      </nav>

      <section style={styles.hero}>
        <div style={styles.heroBadge}>✨ Propulsé par Groq IA</div>
        <h1 style={styles.heroTitre}>
          Crée des mèmes<br />
          <span style={styles.heroAccent}>intelligents en secondes</span>
        </h1>
        <p style={styles.heroSousTitre}>Upload une image, laisse l'IA suggérer des légendes, édite et partage.</p>
        <Link to={utilisateur ? '/mes-memes' : '/connexion'} style={styles.boutonHero}>
          {utilisateur ? 'Créer mon mème →' : 'Commencer gratuitement →'}
        </Link>

        <div style={styles.features}>
          {[
            { icone: '🤖', titre: 'IA Groq Vision',   desc: '3 légendes générées en 1 clic' },
            { icone: '✏️', titre: 'Édition Fabric.js', desc: 'Drag & drop, couleurs, taille' },
            { icone: '🔒', titre: 'Galerie privée',    desc: 'Tes mèmes isolés et sécurisés' },
            { icone: '🌐', titre: 'Partage public',    desc: 'Un clic pour partager au monde' },
          ].map(({ icone, titre, desc }) => (
            <div key={titre} style={styles.featureCard}>
              <span style={{ fontSize: 28, marginBottom: 4 }}>{icone}</span>
              <strong style={{ fontSize: 15, fontWeight: 700, color: '#e5e7eb' }}>{titre}</strong>
              <span style={{ fontSize: 13, color: '#9ca3af' }}>{desc}</span>
            </div>
          ))}
        </div>
      </section>

      <section style={styles.section}>
        <div style={styles.sectionEntete}>
          <h2 style={styles.sectionTitre}>🔥 Galerie publique</h2>
          <span style={styles.sectionBadge}>{memesPublics.length} mèmes</span>
        </div>

        {chargement && (
          <div style={styles.grille}>
            {[...Array(6)].map((_, i) => <div key={i} style={styles.skeleton} />)}
          </div>
        )}

        {!chargement && memesPublics.length === 0 && (
          <div style={styles.vide}>
            <span style={{ fontSize: 48 }}>🎨</span>
            <p>Aucun mème public pour l'instant.</p>
            <Link to={utilisateur ? '/mes-memes' : '/connexion'} style={styles.boutonVide}>
              Sois le premier →
            </Link>
          </div>
        )}

        {!chargement && memesPublics.length > 0 && (
          <div style={styles.grille}>
            {memesPublics.map(meme => (
              <CartePublique
                key={meme.id}
                meme={meme}
                onTelecharger={telechargerMeme}
                onPartager={setModalPartage}
                onOuvrirEditeur={ouvrirDansEditeur}
              />
            ))}
          </div>
        )}
      </section>

      {modalPartage && (
        <ModalPartagePublic
          meme={modalPartage}
          onFermer={() => setModalPartage(null)}
          onTelecharger={telechargerMeme}
        />
      )}

      <footer style={styles.footer}>
        MemeGen IA — Projet SUPINFO Master IA · React · Supabase · Groq · Fabric.js
      </footer>
    </div>
  )
}

function CartePublique({ meme, onTelecharger, onPartager, onOuvrirEditeur }) {
  const [survol, setSurvol] = useState(false)
  return (
    <div
      style={{ ...stylesGalerie.carte, ...(survol ? stylesGalerie.carteHover : {}) }}
      onMouseEnter={() => setSurvol(true)}
      onMouseLeave={() => setSurvol(false)}
    >
      <div style={{ position: 'relative' }}>
        <img src={meme.url_image} alt="mème" style={stylesGalerie.image} loading="lazy" />
        {survol && (
          <div style={stylesGalerie.overlay}>
            <div style={stylesGalerie.actions}>
              <BtnOverlay icone="⬇" label="Télécharger" onClick={() => onTelecharger(meme.url_image)} />
              <BtnOverlay icone="📤" label="Partager"    onClick={() => onPartager(meme)} />
              <BtnOverlay icone="✏️" label="Modifier"    variante="edit" onClick={() => onOuvrirEditeur(meme)} />
            </div>
          </div>
        )}
      </div>
      <div style={stylesGalerie.footer}>
        <span style={stylesGalerie.badge}>🌐 Public</span>
        <span style={stylesGalerie.date}>{new Date(meme.cree_le).toLocaleDateString('fr-FR')}</span>
      </div>
    </div>
  )
}

function BtnOverlay({ icone, label, variante, onClick }) {
  return (
    <button type="button" onClick={onClick}
      style={{ ...stylesGalerie.overlayBtn, ...(variante === 'edit' ? stylesGalerie.overlayEdit : {}) }}>
      <span style={{ fontSize: 16 }}>{icone}</span>
      <span style={{ fontSize: 10, display: 'block', marginTop: 2 }}>{label}</span>
    </button>
  )
}

function ModalPartagePublic({ meme, onFermer, onTelecharger }) {
  const urlEncode = encodeURIComponent(meme.url_image)
  const texte     = encodeURIComponent("Regarde ce mème créé avec MemeGen IA 🎭")
  const reseaux = [
    { nom: 'Twitter / X', couleur: '#000',    icone: '𝕏',  url: `https://twitter.com/intent/tweet?text=${texte}&url=${urlEncode}` },
    { nom: 'Facebook',    couleur: '#1877f2', icone: 'f',  url: `https://www.facebook.com/sharer/sharer.php?u=${urlEncode}` },
    { nom: 'WhatsApp',    couleur: '#25d366', icone: '💬', url: `https://api.whatsapp.com/send?text=${texte}%20${urlEncode}` },
    { nom: 'Telegram',    couleur: '#0088cc', icone: '✈️', url: `https://t.me/share/url?url=${urlEncode}&text=${texte}` },
    { nom: 'Reddit',      couleur: '#ff4500', icone: '👾', url: `https://reddit.com/submit?url=${urlEncode}&title=${texte}` },
    { nom: 'LinkedIn',    couleur: '#0a66c2', icone: 'in', url: `https://www.linkedin.com/sharing/share-offsite/?url=${urlEncode}` },
  ]
  return (
    <div style={stylesModal.overlay} onClick={onFermer}>
      <div style={stylesModal.boite} onClick={e => e.stopPropagation()}>
        <div style={stylesModal.entete}>
          <h3 style={stylesModal.titre}>📤 Partager ce mème</h3>
          <button type="button" onClick={onFermer} style={stylesModal.fermer}>✕</button>
        </div>
        <img src={meme.url_image} alt="aperçu" style={stylesModal.apercu} />
        <p style={stylesModal.note}>Choisis un réseau pour partager.</p>
        <div style={stylesModal.grille}>
          {reseaux.map(({ nom, couleur, icone, url }) => (
            <a key={nom} href={url} target="_blank" rel="noopener noreferrer"
               style={{ ...stylesModal.boutonReseau, background: couleur }}>
              <span style={{ fontSize: 18 }}>{icone}</span>
              <span style={{ fontSize: 13 }}>{nom}</span>
            </a>
          ))}
        </div>
        <button type="button" onClick={() => { onTelecharger(meme.url_image); onFermer() }} style={stylesModal.boutonDL}>
          ⬇ Télécharger
        </button>
      </div>
    </div>
  )
}

const styles = {
  page:            { minHeight: '100vh', background: '#0f0f1a', color: '#f0f0f0', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' },
  nav:             { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 2rem', borderBottom: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(10px)', position: 'sticky', top: 0, zIndex: 100, background: 'rgba(15,15,26,0.85)' },
  logo:            { fontSize: 22, fontWeight: 700, letterSpacing: '-0.5px' },
  navActions:      { display: 'flex', gap: '0.75rem', alignItems: 'center' },
  boutonNav:       { background: 'linear-gradient(135deg, #667eea, #764ba2)', color: '#fff', padding: '0.5rem 1.25rem', borderRadius: 8, fontWeight: 600, fontSize: 14, textDecoration: 'none' },
  boutonNavSecondaire:{ background: 'rgba(255,255,255,0.08)', color: '#ccc', border: '1px solid rgba(255,255,255,0.15)', padding: '0.5rem 1rem', borderRadius: 8, fontSize: 14, cursor: 'pointer' },
  hero:            { textAlign: 'center', padding: '5rem 1rem 3rem', background: 'radial-gradient(ellipse at 50% 0%, rgba(102,126,234,0.15) 0%, transparent 70%)' },
  heroBadge:       { display: 'inline-block', marginBottom: '1.25rem', background: 'rgba(102,126,234,0.2)', border: '1px solid rgba(102,126,234,0.4)', color: '#a5b4fc', padding: '0.35rem 1rem', borderRadius: 20, fontSize: 13, fontWeight: 600 },
  heroTitre:       { fontSize: 'clamp(2rem, 5vw, 3.5rem)', fontWeight: 800, lineHeight: 1.15, margin: '0 0 1rem' },
  heroAccent:      { background: 'linear-gradient(135deg, #667eea, #f093fb)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' },
  heroSousTitre:   { fontSize: 18, color: '#9ca3af', maxWidth: 520, margin: '0 auto 2rem' },
  boutonHero:      { display: 'inline-block', background: 'linear-gradient(135deg, #667eea, #764ba2)', color: '#fff', padding: '0.9rem 2rem', borderRadius: 12, fontWeight: 700, fontSize: 16, textDecoration: 'none', boxShadow: '0 8px 30px rgba(102,126,234,0.4)' },
  features:        { display: 'flex', flexWrap: 'wrap', gap: '1rem', justifyContent: 'center', maxWidth: 900, margin: '3rem auto 0' },
  featureCard:     { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: 4, minWidth: 180, flex: '1 1 180px', maxWidth: 220 },
  section:         { maxWidth: 1100, margin: '0 auto', padding: '3rem 1.5rem' },
  sectionEntete:   { display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' },
  sectionTitre:    { fontSize: 22, fontWeight: 700, margin: 0 },
  sectionBadge:    { background: 'rgba(102,126,234,0.2)', color: '#a5b4fc', padding: '0.2rem 0.75rem', borderRadius: 20, fontSize: 13 },
  grille:          { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1rem' },
  skeleton:        { height: 200, borderRadius: 12, background: 'rgba(255,255,255,0.06)' },
  vide:            { textAlign: 'center', padding: '3rem', color: '#6b7280', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' },
  boutonVide:      { background: 'linear-gradient(135deg, #667eea, #764ba2)', color: '#fff', padding: '0.6rem 1.5rem', borderRadius: 8, fontWeight: 600, textDecoration: 'none', fontSize: 14 },
  footer:          { textAlign: 'center', padding: '2rem', borderTop: '1px solid rgba(255,255,255,0.08)', color: '#4b5563', fontSize: 13 },
}

const stylesGalerie = {
  carte:      { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, overflow: 'hidden', transition: 'border-color 0.2s, transform 0.2s' },
  carteHover: { borderColor: 'rgba(102,126,234,0.4)', transform: 'translateY(-2px)' },
  image:      { width: '100%', aspectRatio: '16/9', objectFit: 'contain', display: 'block', background: '#111' },
  overlay:    { position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  actions:    { display: 'flex', gap: '0.5rem' },
  overlayBtn: { background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)', borderRadius: 8, padding: '0.4rem 0.6rem', color: '#fff', cursor: 'pointer', textAlign: 'center', minWidth: 54 },
  overlayEdit:{ background: 'rgba(102,126,234,0.35)', borderColor: 'rgba(102,126,234,0.6)' },
  footer:     { display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0.75rem' },
  badge:      { fontSize: 12, color: '#a5b4fc', fontWeight: 600 },
  date:       { fontSize: 12, color: '#6b7280' },
}

const stylesModal = {
  overlay:       { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: '1rem' },
  boite:         { background: '#1e1e30', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 16, padding: '1.5rem', width: '100%', maxWidth: 440, maxHeight: '90vh', overflowY: 'auto' },
  entete:        { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' },
  titre:         { fontSize: 18, fontWeight: 700, color: '#f0f0f0', margin: 0 },
  fermer:        { background: 'none', border: 'none', color: '#9ca3af', fontSize: 20, cursor: 'pointer' },
  apercu:        { width: '100%', borderRadius: 10, marginBottom: '1rem', objectFit: 'contain', maxHeight: 200, background: '#111' },
  note:          { fontSize: 13, color: '#9ca3af', marginBottom: '1rem' },
  grille:        { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem', marginBottom: '1rem' },
  boutonReseau:  { display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.65rem 0.9rem', borderRadius: 10, textDecoration: 'none', color: '#fff', fontWeight: 600 },
  boutonDL:      { display: 'block', width: '100%', padding: '0.7rem', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 10, color: '#d1d5db', fontSize: 14, cursor: 'pointer', textAlign: 'center' },
}