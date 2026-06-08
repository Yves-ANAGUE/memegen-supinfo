import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'

export default function Galerie({ utilisateur, mode = 'prive', onReouvrir }) {
  const [memes, setMemes]             = useState([])
  const [chargement, setChargement]   = useState(true)
  const [suppression, setSuppression] = useState(null)

  const chargerMemes = useCallback(async () => {
    if (mode === 'prive' && !utilisateur?.id) return
    setChargement(true)
    let requete = supabase
      .from('memes').select('*')
      .order('cree_le', { ascending: false })
      .range(0, 23)
    if (mode === 'prive') {
      requete = requete.eq('utilisateur_id', utilisateur.id)
    } else {
      requete = requete.eq('est_public', true)
    }
    const { data } = await requete
    setMemes(data ?? [])
    setChargement(false)
  }, [mode, utilisateur?.id])

  useEffect(() => { chargerMemes() }, [chargerMemes])

  const supprimerMeme = useCallback(async (meme) => {
    if (!confirm('Supprimer ce mème définitivement ?')) return
    setSuppression(meme.id)
    const nomFichier = meme.url_image.split('/memes-images/')[1]
    if (nomFichier) await supabase.storage.from('memes-images').remove([nomFichier])
    await supabase.from('memes').delete().eq('id', meme.id)
    setMemes(prev => prev.filter(m => m.id !== meme.id))
    setSuppression(null)
  }, [])

  // Télécharge directement via fetch + blob — pas de redirection
  const telechargerMeme = useCallback(async (urlImage) => {
    try {
      const rep  = await fetch(urlImage)
      const blob = await rep.blob()
      const url  = URL.createObjectURL(blob)
      const lien = document.createElement('a')
      lien.href     = url
      lien.download = `meme-${Date.now()}.png`
      document.body.appendChild(lien)
      lien.click()
      document.body.removeChild(lien)
      URL.revokeObjectURL(url)
    } catch {
      // Fallback si CORS bloque : ouvre dans un nouvel onglet
      window.open(urlImage, '_blank')
    }
  }, [])

  if (chargement) return (
    <div style={styles.grille}>
      {[...Array(4)].map((_, i) => <div key={i} style={styles.skeleton} />)}
    </div>
  )

  if (memes.length === 0) return (
    <div style={styles.vide}>
      <span style={{ fontSize: 40 }}>🎨</span>
      <p>{mode === 'prive' ? "Aucune création pour l'instant. Lance-toi !" : "Aucun mème public pour l'instant."}</p>
    </div>
  )

  return (
    <div style={styles.grille}>
      {memes.map(meme => (
        <CarteMemoire
          key={meme.id}
          meme={meme}
          estProprietaire={mode === 'prive' && meme.utilisateur_id === utilisateur?.id}
          enSuppression={suppression === meme.id}
          onReouvrir={onReouvrir}
          onSupprimer={supprimerMeme}
          onTelecharger={telechargerMeme}
        />
      ))}
    </div>
  )
}

function CarteMemoire({ meme, estProprietaire, enSuppression, onReouvrir, onSupprimer, onTelecharger }) {
  const [survolee, setSurvolee]         = useState(false)
  const [modalPartage, setModalPartage] = useState(false)

  return (
    <>
      <div
        style={{ ...styles.carte, ...(survolee ? styles.carteHover : {}) }}
        onMouseEnter={() => setSurvolee(true)}
        onMouseLeave={() => setSurvolee(false)}
      >
        <div style={styles.imageWrapper}>
          <img src={meme.url_image} alt="mème" style={styles.image} loading="lazy" />

          {survolee && (
            <div style={styles.overlay}>
              <div style={styles.overlayActions}>
                <BoutonOverlay
                  icone="⬇"
                  titre="Télécharger"
                  onClick={() => onTelecharger(meme.url_image)}
                />
                <BoutonOverlay
                  icone="📤"
                  titre="Partager"
                  onClick={() => setModalPartage(true)}
                />
                <BoutonOverlay
                  icone="✏️"
                  titre="Ouvrir dans l'éditeur"
                  variante="edit"
                  onClick={() => onReouvrir?.(meme)}
                />
                {estProprietaire && (
                  <BoutonOverlay
                    icone={enSuppression ? '⏳' : '🗑'}
                    titre="Supprimer"
                    variante="delete"
                    disabled={enSuppression}
                    onClick={() => onSupprimer(meme)}
                  />
                )}
              </div>
            </div>
          )}
        </div>

        <div style={styles.footer}>
          <span style={meme.est_public ? styles.badgePublic : styles.badgePrive}>
            {meme.est_public ? '🌐 Public' : '🔒 Privé'}
          </span>
          <span style={styles.date}>
            {new Date(meme.cree_le).toLocaleDateString('fr-FR')}
          </span>
        </div>
      </div>

      {/* Modal partage réseaux sociaux */}
      {modalPartage && (
        <ModalPartageGalerie
          urlImage={meme.url_image}
          onFermer={() => setModalPartage(false)}
          onTelecharger={() => onTelecharger(meme.url_image)}
        />
      )}
    </>
  )
}

function BoutonOverlay({ icone, titre, variante, disabled, onClick }) {
  const variantesStyles = {
    edit:   { background: 'rgba(102,126,234,0.35)', borderColor: 'rgba(102,126,234,0.6)' },
    delete: { background: 'rgba(220,38,38,0.35)',   borderColor: 'rgba(220,38,38,0.6)' },
  }
  return (
    <button
      type="button"
      title={titre}
      disabled={disabled}
      onClick={(e) => { e.stopPropagation(); onClick?.() }}
      style={{ ...styles.overlayBtn, ...(variantesStyles[variante] ?? {}) }}
    >
      <span style={{ fontSize: 16 }}>{icone}</span>
      <span style={{ fontSize: 10, display: 'block', marginTop: 2 }}>{titre}</span>
    </button>
  )
}

function ModalPartageGalerie({ urlImage, onFermer, onTelecharger }) {
  const urlEncode = encodeURIComponent(urlImage)
  const texte     = encodeURIComponent("Regarde ce mème créé avec MemeGen IA 🎭")

  const reseaux = [
    { nom: 'Twitter / X', couleur: '#000000', icone: '𝕏',  url: `https://twitter.com/intent/tweet?text=${texte}&url=${urlEncode}` },
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

      {/* Aperçu du mème */}
      <img
        src={urlImage}
        alt="aperçu"
        style={stylesModal.apercu}
      />

      <p style={stylesModal.note}>
        Choisis un réseau — l'image s'ouvre dans un nouvel onglet pour que tu puisses l'uploader.
      </p>

      <div style={stylesModal.grille}>
        {reseaux.map(({ nom, couleur, icone, url }) => (
          <a
            key={nom}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            style={{ ...stylesModal.boutonReseau, background: couleur }}
          >
            <span style={{ fontSize: 18, minWidth: 24, textAlign: 'center' }}>{icone}</span>
            <span style={{ fontSize: 13 }}>{nom}</span>
          </a>
        ))}
      </div>

      <button
        type="button"
        onClick={() => { onTelecharger(); onFermer() }}
        style={stylesModal.boutonTelecharger}
      >
        ⬇ Télécharger d'abord
      </button>
    </div>
  </div>
)

}

const styles = {
  grille:      { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1rem' },
  carte:       { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, overflow: 'hidden', transition: 'border-color 0.2s, transform 0.2s' },
  carteHover:  { borderColor: 'rgba(102,126,234,0.4)', transform: 'translateY(-2px)' },
  imageWrapper:{ position: 'relative' },
  image:       { width: '100%', aspectRatio: '16/9', objectFit: 'contain', display: 'block', background: '#111' },
  overlay:     { position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0.5rem' },
  overlayActions:{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', justifyContent: 'center' },
  overlayBtn:  { background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)', borderRadius: 8, padding: '0.4rem 0.5rem', color: '#fff', cursor: 'pointer', textAlign: 'center', minWidth: 52 },
  footer:      { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0.75rem' },
  badgePublic: { fontSize: 12, color: '#a5b4fc', fontWeight: 600 },
  badgePrive:  { fontSize: 12, color: '#9ca3af', fontWeight: 600 },
  date:        { fontSize: 12, color: '#6b7280' },
  skeleton:    { height: 180, borderRadius: 12, background: 'rgba(255,255,255,0.06)' },
  vide:        { textAlign: 'center', padding: '3rem', color: '#6b7280', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' },
}

const stylesModal = {
  overlay:        { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: '1rem' },
  boite:          { background: '#1e1e30', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 16, padding: '1.5rem', width: '100%', maxWidth: 440, maxHeight: '90vh', overflowY: 'auto' },
  entete:         { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' },
  titre:          { fontSize: 18, fontWeight: 700, color: '#f0f0f0', margin: 0 },
  fermer:         { background: 'none', border: 'none', color: '#9ca3af', fontSize: 20, cursor: 'pointer' },
  apercu:         { width: '100%', borderRadius: 10, marginBottom: '1rem', objectFit: 'contain', maxHeight: 200, background: '#111' },
  note:           { fontSize: 13, color: '#9ca3af', marginBottom: '1rem' },
  grille:         { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem', marginBottom: '1rem' },
  boutonReseau:   { display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.65rem 0.9rem', borderRadius: 10, textDecoration: 'none', color: '#fff', fontWeight: 600, fontSize: 14 },
  boutonTelecharger:{ display: 'block', width: '100%', padding: '0.7rem', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 10, color: '#d1d5db', fontSize: 14, cursor: 'pointer', textAlign: 'center' },
}